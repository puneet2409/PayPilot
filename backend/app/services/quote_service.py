import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models.quote import Quote
from app.models.catalogue import DemoProduct

class QuoteService:
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

        # Expiration check
        now = datetime.now(timezone.utc)
        exp = quote.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        if now > exp:
            quote.status = "EXPIRED"
            db.commit()
            return None

        if quote.status != "ACTIVE":
            return None

        return quote

    @staticmethod
    def consume_quote(db: Session, quote_id: str) -> bool:
        quote = db.query(Quote).filter(Quote.id == quote_id).first()
        if quote and quote.status == "ACTIVE":
            quote.status = "CONSUMED"
            db.commit()
            return True
        return False
