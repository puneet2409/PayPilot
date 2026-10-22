from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class OrderDetailResponse(BaseModel):
    order_id: str
    quote_id: str
    session_id: str
    sku: str
    paypal_order_id: Optional[str] = None
    status: str
    amount: float
    currency: str
    created_at: str
    payment: Optional[Dict[str, Any]] = None

class AuditTimelineEvent(BaseModel):
    id: str
    event_type: str
    details: Dict[str, Any]
    created_at: str
    prev_hash: Optional[str] = None
    entry_hash: Optional[str] = None

class AuditTimelineResponse(BaseModel):
    session_id: Optional[str] = None
    order_id: Optional[str] = None
    events: List[AuditTimelineEvent]

class OrderSummaryItem(BaseModel):
    order_id: str
    quote_id: str
    session_id: str
    sku: str
    item_title: Optional[str] = None
    paypal_order_id: Optional[str] = None
    capture_id: Optional[str] = None
    status: str
    amount: float
    currency: str
    created_at: str
    updated_at: Optional[str] = None

