import httpx
import json
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
        quote_signature: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        item_total: Optional[float] = None,
        tax_total: Optional[float] = None,
        shipping: Optional[float] = None,
        invoice_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a PayPal Orders v2 record with intent: CAPTURE.
        Binds cryptographic HMAC quote signature in custom_id, invoice_id,
        and provides full amount.breakdown (item_total, tax_total, shipping).
        """
        req_id = idempotency_key or str(uuid.uuid4())
        inv_id = invoice_id or quote_id
        custom_id_val = f"{quote_id}:{quote_signature}" if quote_signature else f"{quote_id}:v1"
        if len(custom_id_val) > 127:
            custom_id_val = custom_id_val[:127]

        # Calculate exact breakdown for PayPal Orders v2
        b_item = item_total if item_total is not None else amount
        b_tax = tax_total if tax_total is not None else 0.0
        b_shipping = shipping if shipping is not None else 0.0

        # Validate breakdown equals amount; if not, balance with item_total
        if round(b_item + b_tax + b_shipping, 2) != round(amount, 2):
            b_item = round(amount - b_tax - b_shipping, 2)

        breakdown_dict = {
            "item_total": {"currency_code": currency, "value": f"{b_item:.2f}"},
            "tax_total": {"currency_code": currency, "value": f"{b_tax:.2f}"},
            "shipping": {"currency_code": currency, "value": f"{b_shipping:.2f}"}
        }

        amount_payload = {
            "currency_code": currency,
            "value": f"{amount:.2f}",
            "breakdown": breakdown_dict
        }

        if not self.is_configured:
            # Deterministic Sandbox Simulation for testing without live credentials
            mock_paypal_order_id = f"SANDBOX_ORDER_{uuid.uuid4().hex[:12].upper()}"
            logger.info(f"[SIMULATED PAYPAL] Created order {mock_paypal_order_id} for {amount} {currency} with custom_id {custom_id_val} invoice_id {inv_id}")
            return {
                "id": mock_paypal_order_id,
                "status": "CREATED",
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": quote_id,
                    "invoice_id": inv_id,
                    "custom_id": custom_id_val,
                    "amount": amount_payload
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
                    "invoice_id": inv_id,
                    "custom_id": custom_id_val,
                    "soft_descriptor": "PAYPILOT*CH3",
                    "description": "PayPilot Agentic Commerce checkout",
                    "amount": amount_payload
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

    async def verify_webhook_signature(
        self,
        auth_algo: Optional[str],
        cert_url: Optional[str],
        transmission_id: Optional[str],
        transmission_sig: Optional[str],
        transmission_time: Optional[str],
        raw_body: str,
        webhook_id: Optional[str] = None
    ) -> bool:
        """
        Verifies incoming webhook transmission against PayPal's verification endpoint.
        """
        if not self.is_configured:
            # When PayPal credentials are not configured, allow local sandbox/testing
            return True

        if not (auth_algo and cert_url and transmission_id and transmission_sig and transmission_time):
            return False

        try:
            token = await self.get_access_token()
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
            body_dict = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
            payload = {
                "auth_algo": auth_algo,
                "cert_url": cert_url,
                "transmission_id": transmission_id,
                "transmission_sig": transmission_sig,
                "transmission_time": transmission_time,
                "webhook_id": webhook_id or "PAYPILOT_SANDBOX_WEBHOOK",
                "webhook_event": body_dict
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.base_url}/v1/notifications/verify-webhook-signature",
                    headers=headers,
                    json=payload
                )
                if res.status_code == 200:
                    status = res.json().get("verification_status")
                    return status == "SUCCESS"
        except Exception as e:
            logger.error(f"Error during PayPal webhook verification: {e}")
        return False

paypal_client = PayPalClient()
