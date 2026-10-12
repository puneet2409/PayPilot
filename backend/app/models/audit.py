from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime, timezone
from app.database import Base

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=True)
    order_id = Column(String, index=True, nullable=True)
    event_type = Column(String, index=True, nullable=False)
    # Event types: SEARCH_REQUESTED, POLICY_EVALUATED, QUOTE_GENERATED, PAYPAL_ORDER_CREATED, BUYER_APPROVED, PAYMENT_CAPTURED, REJECTED_BY_POLICY, PAYMENT_FAILED
    details_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
