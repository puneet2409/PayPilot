from pydantic import BaseModel, Field
from typing import List, Optional

class PolicyCheckItem(BaseModel):
    rule: str
    passed: bool
    detail: str

class QuoteSummary(BaseModel):
    id: str
    amount: float
    currency: str
    expires_at: str
    item_price: Optional[float] = None
    estimated_tax: Optional[float] = None
    shipping: Optional[float] = None
    shipping_cost: Optional[float] = None
    landed_cost: Optional[float] = None
    merchant: Optional[str] = "PayPilot Demo Store"
    image_url: Optional[str] = None
    rejection_reason: Optional[str] = None
    session_id: Optional[str] = None
    has_warnings: Optional[bool] = False
    can_proceed: Optional[bool] = True
    quote_signature: Optional[str] = None

class PolicyEvaluateRequest(BaseModel):
    session_id: str = Field(default="sess_default", min_length=1, max_length=100)
    demo_sku: str = Field(min_length=1, max_length=100)
    max_total: float = Field(ge=0, allow_inf_nan=False)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    required_features: List[str] = Field(default_factory=list, max_length=20)
    excluded_terms: List[str] = Field(default_factory=list, max_length=20)

class PolicyEvaluateResponse(BaseModel):
    eligible: bool
    policy_version: str = "v1"
    currency: str
    max_total: float
    item_price: float
    sku: str
    item_title: str
    checks: List[PolicyCheckItem]
    quote: Optional[QuoteSummary] = None
    reason: Optional[str] = None
    estimated_tax: Optional[float] = None
    shipping: Optional[float] = None
    shipping_cost: Optional[float] = None
    landed_cost: Optional[float] = None
    merchant: Optional[str] = "PayPilot Demo Store"
    image_url: Optional[str] = None
    rejection_reason: Optional[str] = None
    session_id: Optional[str] = None
    has_warnings: Optional[bool] = False
    can_proceed: Optional[bool] = True
