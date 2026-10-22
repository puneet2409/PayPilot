import httpx
import time
import logging
import math
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from app.config import settings
from app.schemas.discovery import ProductItem, OfferItem

logger = logging.getLogger(__name__)

# Common filler words stripped from queries before matching the local
# fallback catalogue.
FALLBACK_STOPWORDS = frozenset({
    "find", "for", "and", "with", "under", "over", "the", "want", "need",
    "looking", "good", "great", "best", "budget", "max", "upto", "please",
    "buy", "get", "than", "about", "new", "has", "have", "you", "your", "work",
})

# Bundled PayPilot demo-store items used when Channel3 is unavailable and to
# keep sandbox checkout available alongside live comparison results.
DEMO_STORE_DISCOVERY_DATA: List[Dict[str, Any]] = [
    {
        "product_id": "ch3_headset_q45",
        "title": "Anker Soundcore Space Q45 Wireless Noise Cancelling Headphones",
        "brand": "Anker",
        "category": "wireless headset",
        "demo_sku": "HEADSET-DEMO-01",
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
        "offers": [
            {
                "merchant": "PayPilot Demo Store",
                "price": 89.99,
                "currency": "USD",
                "availability": "InStock",
                "observed_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "merchant": "PayPilot Demo Store",
                "price": 94.50,
                "currency": "USD",
                "availability": "InStock",
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
        "category": "wireless headset",
        "demo_sku": "HEADSET-DEMO-02",
        "image_url": "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&q=80",
        "offers": [
            {
                "merchant": "PayPilot Demo Store",
                "price": 79.95,
                "currency": "USD",
                "availability": "InStock",
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
        "category": "usb-c dock",
        "demo_sku": "DOCK-DEMO-01",
        "image_url": "https://images.unsplash.com/photo-1544717305-2782549b5136?w=500&q=80",
        "offers": [
            {
                "merchant": "PayPilot Demo Store",
                "price": 139.99,
                "currency": "USD",
                "availability": "InStock",
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
        "category": "wireless mouse",
        "demo_sku": "MOUSE-DEMO-01",
        "image_url": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&q=80",
        "offers": [
            {
                "merchant": "PayPilot Demo Store",
                "price": 99.00,
                "currency": "USD",
                "availability": "InStock",
                "observed_at": datetime.now(timezone.utc).isoformat()
            }
        ],
        "attributes": {
            "quiet_clicks": True,
            "sensor_dpi": 8000,
            "multipoint_bluetooth": True,
            "condition": "New"
        }
    },
    {
        "product_id": "ch3_flash_sandisk128",
        "title": "SanDisk 128GB Ultra Dual Drive Luxe USB Type-C Flash Drive",
        "brand": "SanDisk",
        "category": "flash drive",
        "demo_sku": "FLASH-DEMO-01",
        "image_url": "https://images.unsplash.com/photo-1624823183493-ed5832f44e18?w=500",
        "offers": [
            {
                "merchant": "PayPilot Demo Store",
                "price": 19.99,
                "currency": "USD",
                "availability": "InStock",
                "observed_at": datetime.now(timezone.utc).isoformat()
            }
        ],
        "attributes": {
            "capacity_gb": 128,
            "connector": "USB-C and USB-A",
            "read_speed_mbps": 150,
            "condition": "New"
        }
    }
]

class Channel3Client:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or settings.CHANNEL3_API_KEY
        self.base_url = base_url or settings.CHANNEL3_BASE_URL
        self._cache: Dict[str, tuple[float, List[ProductItem]]] = {}

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key != "your_channel3_api_key_here")

    @staticmethod
    def _match_demo_sku(title: str, brand: Optional[str]) -> Optional[str]:
        text = f"{brand or ''} {title}".lower()
        # Map known product lines to store demo SKUs for PayPal Sandbox checkout
        sku_patterns = [
            ("HEADSET-DEMO-01", ["q45"]),
            ("HEADSET-DEMO-01", ["space", "soundcore"]),
            ("HEADSET-DEMO-02", ["760"]),
            ("HEADSET-DEMO-02", ["tune", "jbl"]),
            ("DOCK-DEMO-01", ["575"]),
            ("DOCK-DEMO-01", ["anker", "dock"]),
            ("MOUSE-DEMO-01", ["mx master"]),
            ("MOUSE-DEMO-01", ["mx", "3s"]),
            ("FLASH-DEMO-01", ["flash"]),
            ("FLASH-DEMO-01", ["pendrive"]),
            ("FLASH-DEMO-01", ["sandisk"]),
            ("FLASH-DEMO-01", ["usb", "drive"]),
        ]
        for sku, tokens in sku_patterns:
            if all(tok in text for tok in tokens):
                return sku
        return None

    async def search(
        self,
        query: str,
        max_price: Optional[float] = None,
        limit: int = 10,
        user_id: str = "sess_paypilot_demo"
    ) -> List[ProductItem]:
        """
        Executes search via Channel3 API using agentic mode across 25,000+ retailers.
        When Channel3 is unavailable, the bundled demo catalogue provides a
        clearly labelled, self-contained walkthrough path.
        """
        if not self.is_configured:
            logger.info("Channel3 API key not configured. Using normalized demo discovery catalogue.")
            return self._fallback_filter(query, max_price, limit)

        cache_key = f"{query.lower().strip()}_{max_price}_{limit}"
        if cache_key in self._cache:
            ts, items = self._cache[cache_key]
            if time.time() - ts < 300:
                logger.info(f"Serving {len(items)} cached Channel3 results for: {query}")
                return items

        headers = {
            "x-api-key": self.api_key,
            "x-user-id": user_id,
            "Content-Type": "application/json"
        }
        payload = {
            "query": query,
            "limit": limit,
            "config": {
                "mode": "agentic",
                "country": "US",
                "currency": "USD"
            }
        }
        if max_price is not None:
            payload["filters"] = {
                "price": {"max_price": max_price}
            }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(f"{self.base_url}/search", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    live_results = self._normalize_channel3_response(data)
                    # Keep a small, explicitly labelled demo-store selection in
                    # live searches so the PayPal sandbox flow remains testable
                    # even when Channel3 products have no purchasable demo SKU.
                    demo_limit = min(2, max(0, limit - 1))
                    demo_results = self._fallback_filter(query, max_price, demo_limit)
                    if not demo_results:
                        final_res = live_results[:limit]
                    else:
                        live_slots = max(0, limit - len(demo_results))
                        final_res = live_results[:live_slots] + demo_results
                    if len(self._cache) >= 200:
                        oldest_k = next(iter(self._cache))
                        del self._cache[oldest_k]
                    self._cache[cache_key] = (time.time(), final_res)
                    return final_res
                else:
                    logger.warning(f"Channel3 returned HTTP {res.status_code}: {res.text}. Falling back to cached catalog.")
                    return self._fallback_filter(query, max_price, limit)
        except Exception as e:
            logger.error(f"Error calling Channel3 API: {e}. Falling back to cached catalog.")
            return self._fallback_filter(query, max_price, limit)

    def _normalize_channel3_response(self, data: Dict[str, Any]) -> List[ProductItem]:
        items: List[ProductItem] = []
        raw_products = data.get("results") or data.get("products") or data.get("items") or []
        if isinstance(data, list):
            raw_products = data

        for p in raw_products:
            offers_list = []
            for o in p.get("offers", []):
                raw_price = o.get("price")
                if isinstance(raw_price, dict):
                    price_val = float(
                        raw_price.get("price") or
                        raw_price.get("amount") or
                        raw_price.get("value") or
                        0.0
                    )
                    curr_val = raw_price.get("currency") or "USD"
                else:
                    try:
                        price_val = float(raw_price or 0.0)
                    except (ValueError, TypeError):
                        price_val = 0.0
                    curr_val = o.get("currency", "USD")

                merchant_name = (
                    o.get("merchant") or
                    o.get("domain") or
                    o.get("seller") or
                    o.get("store") or
                    "Retailer"
                )

                offers_list.append(OfferItem(
                    merchant=merchant_name,
                    price=price_val,
                    currency=curr_val,
                    availability=o.get("availability") or "InStock",
                    buy_url=o.get("buy_url") or o.get("url"),
                    observed_at=o.get("observed_at") or datetime.now(timezone.utc).isoformat()
                ))

            # Extract image url (singular, array, or dict with url)
            raw_img = p.get("image_url") or p.get("image")
            if not raw_img and p.get("images"):
                raw_img = p["images"][0] if isinstance(p["images"], list) and len(p["images"]) > 0 else p["images"]
            if isinstance(raw_img, dict):
                image_url = raw_img.get("url") or raw_img.get("src") or raw_img.get("link")
            elif isinstance(raw_img, str):
                image_url = raw_img
            else:
                image_url = None

            title = p.get("title", "Untitled Product")
            brand = p.get("brand")
            if not brand and p.get("brands") and isinstance(p["brands"], list) and len(p["brands"]) > 0:
                first_b = p["brands"][0]
                brand = first_b.get("name") if isinstance(first_b, dict) else str(first_b)
            attributes = p.get("attributes") or p.get("specs") or p.get("specifications") or {}
            demo_sku = p.get("demo_sku") or self._match_demo_sku(title, brand)

            items.append(ProductItem(
                product_id=str(p.get("id") or p.get("product_id") or p.get("sku") or "ch3_item"),
                title=title,
                brand=brand,
                source="channel3",
                offers=offers_list,
                attributes=attributes,
                image_url=image_url,
                demo_sku=demo_sku
            ))
        return items

    def _fallback_filter(self, query: str, max_price: Optional[float], limit: int) -> List[ProductItem]:
        q_tokens = [
            t.lower().strip("$,.") for t in query.split() if len(t) > 2
        ]
        q_tokens = [t for t in q_tokens if t and t not in FALLBACK_STOPWORDS]
        # Short queries must match every keyword; longer ones a solid majority —
        # this keeps unrelated catalogue items out of narrow queries.
        if len(q_tokens) <= 2:
            min_score = len(q_tokens)
        else:
            min_score = max(1, math.ceil(len(q_tokens) * 0.6))
        matches = []
        for item in DEMO_STORE_DISCOVERY_DATA:
            text = (
                f"{item['title']} {item.get('brand', '')} {item.get('category', '')} "
                f"{item.get('attributes', {})}"
            ).lower()
            score = sum(1 for t in q_tokens if t in text) if q_tokens else 1
            if q_tokens and score < min_score:
                continue
            offers = [OfferItem(**o) for o in item["offers"]]
            # Filter by max_price if specified
            if max_price is not None:
                min_price = min(o.price for o in offers) if offers else 0
                if min_price > max_price:
                    continue
            matches.append(ProductItem(
                product_id=item["product_id"],
                title=item["title"],
                brand=item.get("brand"),
                source="demo_catalogue",
                offers=offers,
                attributes=item.get("attributes", {}),
                image_url=item.get("image_url"),
                demo_sku=item.get("demo_sku")
            ))
        return matches[:limit]

channel3_client = Channel3Client()
