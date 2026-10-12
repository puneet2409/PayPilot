from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class OfferItem(BaseModel):
    merchant: str
    price: float
    currency: str = "USD"
    availability: str = "InStock"
    buy_url: str
    observed_at: str

class ProductItem(BaseModel):
    product_id: str
    title: str
    brand: Optional[str] = None
    source: str = "channel3" # channel3 or demo_catalogue
    offers: List[OfferItem] = []
    attributes: Dict[str, Any] = {}
    image_url: Optional[str] = None
    demo_sku: Optional[str] = None # Linked demo SKU if available

class DiscoverySearchRequest(BaseModel):
    query: str
    max_price: Optional[float] = None
    currency: str = "USD"
    requirements: List[str] = []
    limit: int = 10

class DiscoverySearchResponse(BaseModel):
    search_id: str
    query: str
    results: List[ProductItem]
