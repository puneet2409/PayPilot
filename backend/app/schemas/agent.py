from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class AgentIntent(BaseModel):
    category: Optional[str] = None
    budget: Optional[float] = None
    currency: str = "USD"
    must_have: List[str] = []
    preferences: List[str] = []
    avoid: List[str] = []

class RankedCandidate(BaseModel):
    product_id: str
    title: str
    brand: Optional[str] = None
    price: float
    currency: str = "USD"
    rank: int
    score: float
    explanation: str
    verified_features: List[str] = []
    unverified_features: List[str] = []
    buy_url: Optional[str] = None
    merchant: Optional[str] = None
    image_url: Optional[str] = None
    demo_sku: Optional[str] = None

class AgentTurnRequest(BaseModel):
    message: str
    search_id: Optional[str] = None
    user_budget: Optional[float] = None

class AgentTurnResponse(BaseModel):
    session_id: str
    reply_text: str
    intent: Optional[AgentIntent] = None
    recommendations: List[RankedCandidate] = []
    requires_clarification: bool = False
    clarification_question: Optional[str] = None
