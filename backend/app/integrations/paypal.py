import httpx
import logging
import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.config import settings

logger = logging.getLogger(__name__)

class PayPalClient:
    def __init__(self):
        self.client_id = settings.PAYPAL_CLIENT_ID
        self.client_secret = settings.PAYPAL_CLIENT_SECRET
        self.base_url = settings.PAYPAL_BASE_URL
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    @property
    def is_configured(self) -> bool:
        return bool(
            self.client_id 
            and self.client_secret 
            and self.client_id != "your_paypal_sandbox_client_id_here"
        )

    async def get_access_token(self) -> str:
        """
        Retrieves OAuth 2.0 access token using client credentials, with in-memory caching.
        """
        if self._access_token and self._token_expires_at:
            if datetime.now(timezone.utc) < self._token_expires_at - timedelta(seconds=60):
                return self._access_token

        if not self.is_configured:
            # Local development mock token
            self._access_token = "mock_sandbox_access_token_paypilot"
            self._token_expires_at = datetime.now(timezone.utc) + timedelta(hours=8)
            return self._access_token

        auth = (self.client_id, self.client_secret)
        headers = {
            "Accept": "application/json",
            "Accept-Language": "en_US",
        }
        data = {"grant_type": "client_credentials"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                auth=auth,
                headers=headers,
                data=data
            )
            if res.status_code == 200:
                body = res.json()
                self._access_token = body["access_token"]
                expires_in = int(body.get("expires_in", 3600))
                self._token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                return self._access_token
            else:
                logger.error(f"Failed to obtain PayPal access token: {res.status_code} {res.text}")
                raise RuntimeError(f"PayPal OAuth failed: {res.text}")

    async def create_order(
        self,
        amount: float,
        currency: str = "USD",
        quote_id: str = "quote_default",
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a PayPal Orders v2 record with intent: CAPTURE.
        """
        req_id = idempotency_key or str(uuid.uuid4())
        
        if not self.is_configured:
            # Deterministic Sandbox Simulation for testing without live credentials
            mock_paypal_order_id = f"SANDBOX_ORDER_{uuid.uuid4().hex[:12].upper()}"
            logger.info(f"[SIMULATED PAYPAL] Created order {mock_paypal_order_id} for {amount} {currency}")
            return {
                "id": mock_paypal_order_id,
                "status": "CREATED",
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": quote_id,
                    "amount": {"currency_code": currency, "value": f"{amount:.2f}"}
                }],
                "links": [
                    {
                        "href": f"https://www.sandbox.paypal.com/checkoutnow?token={mock_paypal_order_id}",
                        "rel": "approve",
                        "method": "GET"
                    }
                ]
            }

        token = await self.get_access_token()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "PayPal-Request-Id": req_id
        }
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": quote_id,
                    "custom_id": f"{quote_id}:v1",
                    "soft_descriptor": "PAYPILOT*CH3",
                    "description": "PayPilot Agentic Commerce checkout",
                    "amount": {
                        "currency_code": currency,
                        "value": f"{amount:.2f}"
                    }
                }
            ],
            "application_context": {
                "brand_name": "PayPilot Store",
                "landing_page": "NO_PREFERENCE",
                "user_action": "PAY_NOW",
                "return_url": f"{settings.FRONTEND_ORIGIN}/checkout/success",
                "cancel_url": f"{settings.FRONTEND_ORIGIN}/checkout/cancel"
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{self.base_url}/v2/checkout/orders",
                headers=headers,
                json=payload
            )
            if res.status_code in (200, 201):
                return res.json()
            else:
                logger.error(f"PayPal Create Order error: {res.status_code} {res.text}")
                raise RuntimeError(f"PayPal create order failed: {res.status_code} {res.text}")

    async def capture_order(
        self,
        paypal_order_id: str,
        idempotency_key: Optional[str] = None,
        amount: float = 0.0,
        currency: str = "USD"
    ) -> Dict[str, Any]:
        """
        Captures authorized payment for the PayPal Order.
        """
        req_id = idempotency_key or str(uuid.uuid4())

        if not self.is_configured or paypal_order_id.startswith("SANDBOX_ORDER_"):
            # Deterministic simulated capture
            capture_id = f"CAP_{uuid.uuid4().hex[:12].upper()}"
            logger.info(f"[SIMULATED PAYPAL] Captured order {paypal_order_id} -> {capture_id}")
            return {
                "id": paypal_order_id,
                "status": "COMPLETED",
                "purchase_units": [
                    {
                        "payments": {
                            "captures": [
                                {
                                    "id": capture_id,
                                    "status": "COMPLETED",
                                    "amount": {"currency_code": currency, "value": f"{amount:.2f}"},
                                    "final_capture": True,
                                    "create_time": datetime.now(timezone.utc).isoformat()
                                }
                            ]
                        }
                    }
                ]
            }

        token = await self.get_access_token()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "PayPal-Request-Id": req_id
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{self.base_url}/v2/checkout/orders/{paypal_order_id}/capture",
                headers=headers,
                json={}
            )
            if res.status_code in (200, 201):
                return res.json()
            else:
                logger.error(f"PayPal Capture error: {res.status_code} {res.text}")
                raise RuntimeError(f"PayPal capture order failed: {res.status_code} {res.text}")

    async def get_order(self, paypal_order_id: str) -> Dict[str, Any]:
        """
        Fetches official state of a PayPal order.
        """
        if not self.is_configured or paypal_order_id.startswith("SANDBOX_ORDER_"):
            return {"id": paypal_order_id, "status": "COMPLETED"}

        token = await self.get_access_token()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                f"{self.base_url}/v2/checkout/orders/{paypal_order_id}",
                headers=headers
            )
            if res.status_code == 200:
                return res.json()
            else:
                raise RuntimeError(f"Failed to fetch PayPal order: {res.status_code}")

paypal_client = PayPalClient()
