from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from app.schemas.discovery import OfferItem

class AgentIntent(BaseModel):
    category: Optional[str] = Field(default=None, max_length=100)
    budget: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)
    currency: str = "USD"
    must_have: List[str] = Field(default_factory=list, max_length=20)
    preferences: List[str] = Field(default_factory=list, max_length=20)
    avoid: List[str] = Field(default_factory=list, max_length=20)

class RankedCandidate(BaseModel):
    product_id: str
    title: str
    brand: Optional[str] = None
    price: float
    currency: str = "USD"
    rank: int
    score: float
    explanation: str
    verified_features: List[str] = Field(default_factory=list)
    unverified_features: List[str] = Field(default_factory=list)
    within_budget: bool = True
    buy_url: Optional[str] = None
    merchant: Optional[str] = None
    offers: List[OfferItem] = Field(default_factory=list)
    image_url: Optional[str] = None
    demo_sku: Optional[str] = None
    source: str = "channel3"
    attributes: Dict[str, Any] = Field(default_factory=dict)

class SuggestedAction(BaseModel):
    label: str
    query: str
    budget: Optional[float] = None

class AgentTurnRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    search_id: Optional[str] = None
    user_budget: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)

class AgentTurnResponse(BaseModel):
    session_id: str
    reply_text: str
    intent: Optional[AgentIntent] = None
    intent_source: Literal["gemini", "rules"] = "rules"
    recommendations: List[RankedCandidate] = Field(default_factory=list)
    requires_clarification: bool = False
    clarification_question: Optional[str] = None
    suggested_actions: List[SuggestedAction] = Field(default_factory=list)
