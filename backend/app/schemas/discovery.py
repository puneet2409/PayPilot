from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class OfferItem(BaseModel):
    merchant: str = Field(min_length=1)
    price: float = Field(ge=0, allow_inf_nan=False)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    availability: str = "InStock"
    buy_url: Optional[str] = None
    observed_at: str

class ProductItem(BaseModel):
    product_id: str
    title: str
    brand: Optional[str] = None
    source: str = "channel3" # channel3 or demo_catalogue
    offers: List[OfferItem] = Field(default_factory=list)
    attributes: Dict[str, Any] = Field(default_factory=dict)
    image_url: Optional[str] = None
    demo_sku: Optional[str] = None # Linked demo SKU if available

class DiscoverySearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    max_price: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)
    currency: str = "USD"
    requirements: List[str] = Field(default_factory=list, max_length=20)
    limit: int = Field(default=10, ge=1, le=50)

class DiscoverySearchResponse(BaseModel):
    search_id: str
    query: str
    results: List[ProductItem]
