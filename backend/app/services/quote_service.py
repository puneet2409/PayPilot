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
    def compute_quote_signature(quote_id: str, amount: float, sku: str, expires_at_iso: str) -> str:
        payload = f"{quote_id}:{amount:.2f}:{sku}:{expires_at_iso}"
        return hmac.new(_secret().encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()[:32]

    @staticmethod
    def verify_quote_signature(quote_id: str, amount: float, sku: str, expires_at_iso: str, provided_sig: str) -> bool:
        expected = QuoteService.compute_quote_signature(quote_id, amount, sku, expires_at_iso)
        return hmac.compare_digest(expected.encode("utf-8"), provided_sig.encode("utf-8"))
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

        quote = Quote(
            id=quote_id,
            session_id=session_id,
            sku=product.sku,
            amount=product.fixed_price,
            currency=product.currency,
            policy_version="v1",
            status="ACTIVE",
            expires_at=expires_at,
            created_at=now
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
        if (
            not product
            or not product.active
            or product.currency.upper() != quote.currency.upper()
            or round(product.fixed_price, 2) != round(quote.amount, 2)
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
