import uuid
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models.quote import Quote
from app.models.catalogue import DemoProduct
from app.security import _secret

class QuoteService:
    @staticmethod
    def compute_quote_signature(
        quote_id: str,
        sku: str,
        merchant: str = "PayPilot Demo Store",
        landed_cost: float = 0.0,
        expires_at_iso: str = "",
        *args,
        **kwargs
    ) -> str:
        # Detect legacy invocation compute_quote_signature(quote_id, amount, sku, expires_at_iso)
        if isinstance(sku, (int, float)):
            legacy_amount = float(sku)
            legacy_sku = str(merchant)
            legacy_expires = str(landed_cost) if isinstance(landed_cost, str) else expires_at_iso
            payload = f"{quote_id}:{legacy_amount:.2f}:{legacy_sku}:{legacy_expires}"
            return hmac.new(_secret().encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()

        payload = f"{quote_id}:{sku}:{merchant}:{float(landed_cost):.2f}:{expires_at_iso}"
        return hmac.new(_secret().encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()

    @staticmethod
    def verify_quote_signature(*args, **kwargs) -> bool:
        # Check if called as (quote_id, amount, sku, expires_at_iso, provided_sig) -> 5 positional args
        if len(args) == 5:
            quote_id, legacy_amount, legacy_sku, expires_at_iso, provided_sig = args
            exp_variants = [str(expires_at_iso)]
            if "+00:00" in str(expires_at_iso):
                exp_variants.append(str(expires_at_iso).replace("+00:00", ""))
            else:
                exp_variants.append(f"{expires_at_iso}+00:00")

            for exp in exp_variants:
                expected_legacy = QuoteService.compute_quote_signature(quote_id, float(legacy_amount), str(legacy_sku), exp)
                if hmac.compare_digest(expected_legacy.encode("utf-8"), str(provided_sig).encode("utf-8")) or \
                   hmac.compare_digest(expected_legacy[:32].encode("utf-8"), str(provided_sig).encode("utf-8")):
                    return True
            return False

        # If called as 6 positional args: (quote_id, sku, merchant, landed_cost, expires_at_iso, provided_sig)
        if len(args) >= 6:
            quote_id, sku, merchant, landed_cost, expires_at_iso, provided_sig = args[:6]
        else:
            quote_id = kwargs.get("quote_id", args[0] if len(args) > 0 else "")
            sku = kwargs.get("sku", args[1] if len(args) > 1 else "")
            merchant = kwargs.get("merchant", args[2] if len(args) > 2 else "PayPilot Demo Store")
            landed_cost = kwargs.get("landed_cost", args[3] if len(args) > 3 else 0.0)
            expires_at_iso = kwargs.get("expires_at_iso", args[4] if len(args) > 4 else "")
            provided_sig = kwargs.get("provided_sig", args[5] if len(args) > 5 else "")

        if not provided_sig:
            return False

        exp_variants = [str(expires_at_iso)]
        if "+00:00" in str(expires_at_iso):
            exp_variants.append(str(expires_at_iso).replace("+00:00", ""))
        else:
            exp_variants.append(f"{expires_at_iso}+00:00")

        for exp in exp_variants:
            expected = QuoteService.compute_quote_signature(
                quote_id=str(quote_id),
                sku=str(sku),
                merchant=str(merchant),
                landed_cost=float(landed_cost),
                expires_at_iso=exp
            )
            if hmac.compare_digest(expected.encode("utf-8"), str(provided_sig).encode("utf-8")) or \
               hmac.compare_digest(expected[:32].encode("utf-8"), str(provided_sig).encode("utf-8")):
                return True
        return False

    @staticmethod
    def create_quote(
        db: Session,
        session_id: str,
        product: DemoProduct,
        ttl_minutes: int = 10
    ) -> Quote:
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=ttl_minutes)
        quote_id = f"quote_{uuid.uuid4().hex[:10]}"

        # Calculate landed cost breakdown
        from app.services.policy_engine import PolicyEngine
        landed_cost, estimated_tax, shipping_cost = PolicyEngine.calculate_landed_cost(product.fixed_price)
        merchant = getattr(product, "brand", None) or "PayPilot Demo Store"

        # Compute cryptographic HMAC signature
        quote_sig = QuoteService.compute_quote_signature(
            quote_id=quote_id,
            sku=product.sku,
            merchant=merchant,
            landed_cost=landed_cost,
            expires_at_iso=expires_at.isoformat()
        )

        quote = Quote(
            id=quote_id,
            session_id=session_id,
            sku=product.sku,
            amount=landed_cost,
            currency=product.currency,
            policy_version="v1",
            status="ACTIVE",
            expires_at=expires_at,
            created_at=now,
            item_price=product.fixed_price,
            estimated_tax=estimated_tax,
            shipping_cost=shipping_cost,
            landed_cost=landed_cost,
            merchant=merchant,
            quote_signature=quote_sig
        )
        db.add(quote)
        db.commit()
        db.refresh(quote)
        return quote

    @staticmethod
    def get_valid_quote(db: Session, quote_id: str) -> Optional[Quote]:
        quote = db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            return None

        if quote.status != "ACTIVE":
            return None

        # Quotes are tied to the catalogue terms that passed policy evaluation.
        # If inventory or the authoritative price changed, require a new check.
        product = db.query(DemoProduct).filter(DemoProduct.sku == quote.sku).first()
        from app.services.policy_engine import PolicyEngine
        exp_landed = PolicyEngine.calculate_landed_cost(product.fixed_price)[0] if product else 0.0
        if (
            not product
            or not product.active
            or product.currency.upper() != quote.currency.upper()
            or round(exp_landed, 2) != round(quote.amount, 2)
        ):
            quote.status = "STALE"
            db.commit()
            return None

        # Expiration check
        now = datetime.now(timezone.utc)
        exp = quote.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        if now >= exp:
            quote.status = "EXPIRED"
            db.commit()
            return None

        return quote

    @staticmethod
    def consume_quote(db: Session, quote_id: str) -> bool:
        # Single atomic transition so concurrent checkouts cannot both
        # consume the same quote.
        consumed = (
            db.query(Quote)
            .filter(Quote.id == quote_id, Quote.status == "ACTIVE")
            .update({"status": "CONSUMED"})
        )
        db.commit()
        return consumed > 0
