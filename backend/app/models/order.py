from sqlalchemy import Column, String, Float, DateTime, Text
from datetime import datetime, timezone
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True)
    quote_id = Column(String, index=True, nullable=False)
    session_id = Column(String, index=True, nullable=False)
    sku = Column(String, nullable=False)
    paypal_order_id = Column(String, index=True, nullable=True)
    status = Column(String, default="QUOTED", nullable=False)
    # Status transitions: QUOTED -> AWAITING_APPROVAL -> APPROVED -> CAPTURE_PENDING -> PAID | CANCELLED | FAILED
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    idempotency_key = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, index=True)
    order_id = Column(String, index=True, nullable=False)
    provider = Column(String, default="paypal_sandbox", nullable=False)
    capture_id = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, nullable=False) # COMPLETED, PENDING, FAILED
    captured_amount = Column(Float, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    raw_response_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
