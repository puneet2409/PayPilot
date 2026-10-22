import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, Payment
from app.services.audit_service import AuditService
from app.integrations.paypal import paypal_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])

@router.post("/paypal")
async def handle_paypal_webhook(
    request: Request,
    db: Session = Depends(get_db),
    paypal_auth_algo: str = Header(None, alias="paypal-auth-algo"),
    paypal_transmission_id: str = Header(None, alias="paypal-transmission-id"),
    paypal_cert_url: str = Header(None, alias="paypal-cert-url"),
    paypal_transmission_sig: str = Header(None, alias="paypal-transmission-sig"),
    paypal_transmission_time: str = Header(None, alias="paypal-transmission-time"),
):
    """
    Asynchronous Webhook Receiver for PayPal Events.
    Satisfies Section 5.1 of Embedded Financial Analytics Blueprint:
    - Receives asynchronous event streams (payment captures, order approvals, refunds)
    - Cryptographically verifies event headers & transmission signature
    - Idempotently reconciles database state
    - Returns HTTP 200 OK to signal successful receipt and prevent exponential retry floods
    """
    raw_body_bytes = await request.body()
    raw_body = raw_body_bytes.decode("utf-8")
    try:
        payload = json.loads(raw_body)
    except Exception as e:
        logger.warning(f"Malformed webhook JSON: {e}")
        return {"status": "ignored", "reason": "invalid_json"}

    # Cryptographic Webhook Signature Verification
    is_valid = await paypal_client.verify_webhook_signature(
        auth_algo=paypal_auth_algo,
        cert_url=paypal_cert_url,
        transmission_id=paypal_transmission_id,
        transmission_sig=paypal_transmission_sig,
        transmission_time=paypal_transmission_time,
        raw_body=raw_body
    )
    if not is_valid:
        logger.warning(f"[PAYPAL WEBHOOK] Unauthorized: Signature verification failed for transmission {paypal_transmission_id}")
        raise HTTPException(status_code=401, detail="Invalid PayPal webhook signature")

    event_id = payload.get("id", "UNKNOWN_EVENT")
    event_type = payload.get("event_type", "UNKNOWN_TYPE")
    resource = payload.get("resource", {})
    resource_type = payload.get("resource_type", "")

    logger.info(f"[PAYPAL WEBHOOK] Verified event {event_id}: {event_type} (type={resource_type})")

    # Locate associated order via PayPal Order ID
    paypal_order_id = None
    if resource_type.lower() == "checkout-order":
        paypal_order_id = resource.get("id")
    elif resource_type.lower() == "capture":
        # Check supplementary data for related order_id
        supp = resource.get("supplementary_data", {})
        related = supp.get("related_ids", {}) if isinstance(supp, dict) else {}
        paypal_order_id = related.get("order_id")

    order = None
    if paypal_order_id:
        order = db.query(Order).filter(Order.paypal_order_id == paypal_order_id).first()
    if not order:
        # Fallback to custom_id or invoice_id bound to quote
        custom_id = resource.get("custom_id")
        invoice_id = resource.get("invoice_id")
        candidate_quote_id = (custom_id.split(":")[0] if custom_id else None) or invoice_id
        if candidate_quote_id:
            order = db.query(Order).filter(Order.quote_id == candidate_quote_id).first()

    quote = None
    if order:
        from app.models.quote import Quote
        quote = db.query(Quote).filter(Quote.id == order.quote_id).first()

    # Event handling switch
    if event_type == "PAYMENT.CAPTURE.COMPLETED" and order:
        capture_id = resource.get("id")
        amount_val = float(resource.get("amount", {}).get("value", order.amount))
        currency = resource.get("amount", {}).get("currency_code", order.currency)

        # Reconcile order state to PAID if not already marked
        if order.status != "PAID":
            order.status = "PAID"
            order.updated_at = datetime.now(timezone.utc)

        if quote and quote.status == "ACTIVE":
            quote.status = "CONSUMED"

        # Check existing payment record
        existing_pmt = db.query(Payment).filter(Payment.order_id == order.id).first()
        if not existing_pmt and capture_id:
            payment = Payment(
                id=f"pay_wh_{capture_id}",
                order_id=order.id,
                provider="paypal_sandbox",
                capture_id=capture_id,
                status="COMPLETED",
                captured_amount=amount_val,
                currency=currency,
                raw_response_json=json.dumps(resource)
            )
            db.add(payment)
        db.commit()

        AuditService.record_event(
            db=db,
            event_type="WEBHOOK_PAYMENT_CAPTURED",
            session_id=order.session_id,
            order_id=order.id,
            details={
                "webhook_event_id": event_id,
                "capture_id": capture_id,
                "amount": amount_val,
                "currency": currency,
                "quote_id": quote.id if quote else None,
                "reconciliation_status": "PAID",
                "signature_verified": True
            }
        )

    elif event_type == "CHECKOUT.ORDER.APPROVED" and order:
        if order.status == "CREATING":
            order.status = "AWAITING_APPROVAL"
            order.updated_at = datetime.now(timezone.utc)
            db.commit()

        AuditService.record_event(
            db=db,
            event_type="WEBHOOK_ORDER_APPROVED",
            session_id=order.session_id,
            order_id=order.id,
            details={
                "webhook_event_id": event_id,
                "paypal_order_id": paypal_order_id,
                "quote_id": quote.id if quote else None,
                "reconciliation_status": "AWAITING_APPROVAL",
                "signature_verified": True
            }
        )

    elif event_type == "PAYMENT.CAPTURE.DENIED" and order:
        if order.status != "PAID":
            order.status = "FAILED"
            order.updated_at = datetime.now(timezone.utc)
            if quote:
                quote.status = "STALE"
            db.commit()

        AuditService.record_event(
            db=db,
            event_type="WEBHOOK_PAYMENT_DENIED",
            session_id=order.session_id,
            order_id=order.id,
            details={
                "webhook_event_id": event_id,
                "paypal_order_id": paypal_order_id,
                "quote_id": quote.id if quote else None,
                "reconciliation_status": "FAILED",
                "signature_verified": True
            }
        )

    elif order:
        # General tracked event for existing order
        AuditService.record_event(
            db=db,
            event_type=f"WEBHOOK_{event_type.replace('.', '_')}",
            session_id=order.session_id,
            order_id=order.id,
            details={"webhook_event_id": event_id, "summary": payload.get("summary"), "signature_verified": True}
        )

    # Mandatory HTTP 200 OK acknowledgment
    return {
        "status": "received",
        "event_id": event_id,
        "event_type": event_type,
        "matched_order_id": order.id if order else None
    }
