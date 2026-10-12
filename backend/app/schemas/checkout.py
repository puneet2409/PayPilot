from pydantic import BaseModel
from typing import Optional

class CheckoutCreateRequest(BaseModel):
    quote_id: str
    idempotency_key: Optional[str] = None

class CheckoutCreateResponse(BaseModel):
    order_id: str
    paypal_order_id: str
    status: str
    amount: float
    currency: str

class CheckoutCaptureRequest(BaseModel):
    idempotency_key: Optional[str] = None

class PaymentDetails(BaseModel):
    provider: str
    capture_id: str
    amount: float
    currency: str

class CheckoutCaptureResponse(BaseModel):
    order_id: str
    status: str
    payment: PaymentDetails
