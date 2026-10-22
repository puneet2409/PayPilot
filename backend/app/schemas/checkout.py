from pydantic import BaseModel, Field
from typing import Literal, Optional

class CheckoutCreateRequest(BaseModel):
    quote_id: str = Field(min_length=1, max_length=100)
    session_id: str = Field(min_length=1, max_length=100)
    idempotency_key: Optional[str] = Field(default=None, min_length=1, max_length=38)

class CheckoutCreateResponse(BaseModel):
    order_id: str
    paypal_order_id: str
    status: str
    amount: float
    currency: str
    paypal_mode: Literal["sandbox", "simulated"]

class CheckoutCaptureRequest(BaseModel):
    idempotency_key: Optional[str] = Field(default=None, min_length=1, max_length=38)
    simulate_price_drift: Optional[bool] = False

class PaymentDetails(BaseModel):
    provider: str
    capture_id: str
    amount: float
    currency: str

class CheckoutCaptureResponse(BaseModel):
    order_id: str
    status: str
    payment: PaymentDetails
