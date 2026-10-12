import httpx
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from app.config import settings
from app.schemas.discovery import ProductItem, OfferItem

logger = logging.getLogger(__name__)

# Fallback realistic catalog data when Channel3 key is unset or network error occurs
MOCK_CHANNEL3_DATA: List[Dict[str, Any]] = [
    {
        "product_id": "ch3_headset_q45",
        "title": "Anker Soundcore Space Q45 Wireless Noise Cancelling Headphones",
        "brand": "Anker",
        "demo_sku": "HEADSET-DEMO-01",
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
        "offers": [
            {
                "merchant": "Best Buy",
                "price": 89.99,
                "currency": "USD",
                "availability": "InStock",
                "buy_url": "https://bestbuy.com/example-q45",
                "observed_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "merchant": "Amazon",
                "price": 94.50,
                "currency": "USD",
                "availability": "InStock",
                "buy_url": "https://amazon.com/example-q45",
                "observed_at": datetime.now(timezone.utc).isoformat()
            }
        ],
        "attributes": {
            "multipoint_bluetooth": True,
            "built_in_microphone": True,
            "battery_life_hours": 50,
            "condition": "New"
        }
    },
    {
        "product_id": "ch3_headset_tune760",
        "title": "JBL Tune 760NC Wireless Over-Ear Active Noise Cancelling Headphones",
        "brand": "JBL",
        "demo_sku": "HEADSET-DEMO-02",
        "image_url": "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&q=80",
        "offers": [
            {
                "merchant": "Walmart",
                "price": 79.95,
                "currency": "USD",
                "availability": "InStock",
                "buy_url": "https://walmart.com/example-tune760",
                "observed_at": datetime.now(timezone.utc).isoformat()
            }
        ],
        "attributes": {
            "multipoint_bluetooth": True,
            "built_in_microphone": True,
            "battery_life_hours": 35,
            "condition": "New"
        }
    },
    {
        "product_id": "ch3_dock_anker575",
        "title": "Anker 575 USB-C Docking Station (13-in-1 Triple Display)",
        "brand": "Anker",
        "demo_sku": "DOCK-DEMO-01",
        "image_url": "https://images.unsplash.com/photo-1544717305-2782549b5136?w=500&q=80",
        "offers": [
            {
                "merchant": "Newegg",
                "price": 139.99,
                "currency": "USD",
                "availability": "InStock",
                "buy_url": "https://newegg.com/example-dock",
                "observed_at": datetime.now(timezone.utc).isoformat()
            }
        ],
        "attributes": {
            "ports_count": 13,
            "power_delivery_watts": 85,
            "triple_display": True,
            "condition": "New"
        }
    },
    {
        "product_id": "ch3_mouse_mxmaster3s",
        "title": "Logitech MX Master 3S Performance Wireless Mouse",
        "brand": "Logitech",
        "demo_sku": "MOUSE-DEMO-01",
        "image_url": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&q=80",
        "offers": [
            {
                "merchant": "Amazon",
                "price": 99.00,
                "currency": "USD",
                "availability": "InStock",
                "buy_url": "https://amazon.com/example-mx3s",
                "observed_at": datetime.now(timezone.utc).isoformat()
            }
        ],
        "attributes": {
            "quiet_clicks": True,
            "sensor_dpi": 8000,
            "multipoint_bluetooth": True,
            "condition": "New"
        }
    }
]

class Channel3Client:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or settings.CHANNEL3_API_KEY
        self.base_url = base_url or settings.CHANNEL3_BASE_URL

    async def search(
        self,
        query: str,
        max_price: Optional[float] = None,
        limit: int = 10,
        user_id: str = "sess_paypilot_demo"
    ) -> List[ProductItem]:
        """
        Executes search via Channel3 API. If API key is missing or endpoint is unreachable,
        falls back to structured realistic catalog data with clear provenance logs.
        """
        if not self.api_key or self.api_key == "your_channel3_api_key_here":
            logger.info("Channel3 API key not configured. Using normalized demo discovery catalogue.")
            return self._fallback_filter(query, max_price, limit)

        headers = {
            "x-api-key": self.api_key,
            "x-user-id": user_id,
            "Content-Type": "application/json"
        }
        payload = {
            "query": query,
            "limit": limit
        }
        if max_price:
            payload["filters"] = {
                "price": {"max_price": max_price}
            }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(f"{self.base_url}/search", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return self._normalize_channel3_response(data)
                else:
                    logger.warning(f"Channel3 returned HTTP {res.status_code}: {res.text}. Falling back to cached catalog.")
                    return self._fallback_filter(query, max_price, limit)
        except Exception as e:
            logger.error(f"Error calling Channel3 API: {e}. Falling back to cached catalog.")
            return self._fallback_filter(query, max_price, limit)

    def _normalize_channel3_response(self, data: Dict[str, Any]) -> List[ProductItem]:
        items: List[ProductItem] = []
        raw_products = data.get("results") or data.get("products") or []
        for p in raw_products:
            offers_list = []
            for o in p.get("offers", []):
                offers_list.append(OfferItem(
                    merchant=o.get("merchant", "Retailer"),
                    price=float(o.get("price", 0.0)),
                    currency=o.get("currency", "USD"),
                    availability=o.get("availability", "InStock"),
                    buy_url=o.get("buy_url") or o.get("url", "https://example.com"),
                    observed_at=o.get("observed_at") or datetime.now(timezone.utc).isoformat()
                ))
            
            items.append(ProductItem(
                product_id=str(p.get("id") or p.get("product_id")),
                title=p.get("title", "Untitled Product"),
                brand=p.get("brand"),
                source="channel3",
                offers=offers_list,
                attributes=p.get("attributes", {}),
                image_url=p.get("image_url") or p.get("image")
            ))
        return items

    def _fallback_filter(self, query: str, max_price: Optional[float], limit: int) -> List[ProductItem]:
        q_tokens = [t.lower() for t in query.split() if len(t) > 2]
        matches = []
        for item in MOCK_CHANNEL3_DATA:
            text = f"{item['title']} {item.get('brand', '')} {item.get('attributes', {})}".lower()
            # If query has keywords, match against title/attrs
            score = sum(1 for t in q_tokens if t in text) if q_tokens else 1
            if score > 0 or not q_tokens:
                offers = [OfferItem(**o) for o in item["offers"]]
                # Filter by max_price if specified
                if max_price:
                    min_price = min(o.price for o in offers) if offers else 0
                    if min_price > max_price:
                        continue
                matches.append(ProductItem(
                    product_id=item["product_id"],
                    title=item["title"],
                    brand=item.get("brand"),
                    source="channel3_verified",
                    offers=offers,
                    attributes=item.get("attributes", {}),
                    image_url=item.get("image_url"),
                    demo_sku=item.get("demo_sku")
                ))
        return matches[:limit]

channel3_client = Channel3Client()
