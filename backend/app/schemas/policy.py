from pydantic import BaseModel
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

class PolicyEvaluateRequest(BaseModel):
    session_id: str = "sess_default"
    demo_sku: str
    max_total: float
    currency: str = "USD"
    required_features: List[str] = []
    excluded_terms: List[str] = []

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
