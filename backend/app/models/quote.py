from sqlalchemy import Column, String, Float, DateTime
from datetime import datetime, timezone
from app.database import Base

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=False)
    sku = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    policy_version = Column(String, default="v1", nullable=False)
    status = Column(String, default="ACTIVE", nullable=False) # ACTIVE, CONSUMED, EXPIRED, STALE
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # True Landed Cost Breakdown & Cryptographic Quote Binding
    item_price = Column(Float, nullable=True)
    estimated_tax = Column(Float, nullable=True)
    shipping_cost = Column(Float, nullable=True)
    landed_cost = Column(Float, nullable=True)
    merchant = Column(String, default="PayPilot Demo Store", nullable=True)
    quote_signature = Column(String, nullable=True)
