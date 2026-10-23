import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, Payment
from app.models.quote import Quote
from app.schemas.checkout import (
    CheckoutCreateRequest, CheckoutCreateResponse,
    CheckoutCaptureRequest, CheckoutCaptureResponse, PaymentDetails
)
from app.services.quote_service import QuoteService
from app.services.audit_service import AuditService
from app.integrations.paypal import paypal_client
from app.security import require_session, require_session_match

router = APIRouter(prefix="/api/v1/checkout", tags=["Checkout"])


def _paypal_mode(paypal_order_id: str) -> str:
    return "simulated" if paypal_order_id.startswith("SANDBOX_ORDER_") else "sandbox"


async def _complete_paypal_order_creation(db: Session, order: Order, quote: Quote, idemp_key: str) -> None:
    """Create or safely retry the remote order using the same provider key."""
    try:
        quote_sig = quote.quote_signature or QuoteService.compute_quote_signature(
            quote_id=quote.id,
            sku=quote.sku,
            merchant=quote.merchant or "PayPilot Demo Store",
            landed_cost=quote.landed_cost or quote.amount,
            expires_at_iso=quote.expires_at.isoformat()
        )
        paypal_res = await paypal_client.create_order(
            amount=quote.amount,
            currency=quote.currency,
            quote_id=quote.id,
            quote_signature=quote_sig,
            idempotency_key=idemp_key,
            item_total=quote.item_price or quote.amount,
            tax_total=quote.estimated_tax or 0.0,
            shipping=quote.shipping_cost or 0.0,
            invoice_id=quote.id
        )
    except Exception as e:
        order.status = "RECONCILIATION_REQUIRED"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=502, detail=f"PayPal API error: {str(e)}")

    paypal_order_id = paypal_res.get("id") if isinstance(paypal_res, dict) else None
    if not paypal_order_id:
        order.status = "RECONCILIATION_REQUIRED"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=502, detail="PayPal returned a response without an order id; checkout requires reconciliation")

    order.paypal_order_id = paypal_order_id
    order.status = "AWAITING_APPROVAL"
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    AuditService.record_event(
        db=db,
        event_type="PAYPAL_ORDER_CREATED",
        session_id=quote.session_id,
        order_id=order.id,
        details={
            "paypal_order_id": paypal_order_id,
            "amount": quote.amount,
            "currency": quote.currency,
            "sku": quote.sku
        }
    )

@router.post("/create", response_model=CheckoutCreateResponse)
async def create_checkout_order(
    request: CheckoutCreateRequest,
    db: Session = Depends(get_db),
    authenticated_session_id: str = Depends(require_session),
):
    require_session_match(request.session_id, authenticated_session_id)
    # Look up ownership before returning an idempotent result. Idempotency keys
    # are global, so a key must never disclose another session's order.
    quote = db.query(Quote).filter(Quote.id == request.quote_id).first()
    if not quote:
        raise HTTPException(status_code=400, detail="Quote is invalid. Please re-evaluate purchase policy.")
    if quote.session_id != request.session_id:
        raise HTTPException(
            status_code=403,
            detail="Quote does not belong to this session"
        )

    # Stable default lets a retry after a lost response recover the same order.
    idemp_key = request.idempotency_key or f"checkout_{quote.id}"
    existing_order = db.query(Order).filter(Order.idempotency_key == idemp_key).first()
    if existing_order:
        if existing_order.quote_id != quote.id or existing_order.session_id != request.session_id:
            raise HTTPException(status_code=409, detail="Idempotency key was already used for another checkout")
        if not existing_order.paypal_order_id and existing_order.status == "RECONCILIATION_REQUIRED":
            await _complete_paypal_order_creation(db, existing_order, quote, idemp_key)
            db.refresh(existing_order)
        if not existing_order.paypal_order_id:
            raise HTTPException(status_code=409, detail="Checkout is still being reconciled")
        return CheckoutCreateResponse(
            order_id=existing_order.id,
            paypal_order_id=existing_order.paypal_order_id,
            status=existing_order.status,
            amount=existing_order.amount,
            currency=existing_order.currency,
            paypal_mode=_paypal_mode(existing_order.paypal_order_id),
        )

    # 1. Verify quote is live and claim it atomically before contacting PayPal.
    quote = QuoteService.get_valid_quote(db, request.quote_id)
    if not quote:
        raise HTTPException(
            status_code=400,
            detail="Quote is expired, invalid, or already consumed. Please re-evaluate purchase policy."
        )

    if not QuoteService.consume_quote(db, quote.id):
        raise HTTPException(status_code=409, detail="Quote has already been used. Please re-evaluate purchase policy.")

    # Persist the intent before calling PayPal. A timeout can then be retried
    # with the same provider request ID without consuming a second quote.
    local_order_id = f"order_{uuid.uuid4().hex[:10]}"
    order = Order(
        id=local_order_id,
        quote_id=quote.id,
        session_id=quote.session_id,
        sku=quote.sku,
        paypal_order_id=None,
        status="CREATING",
        amount=quote.amount,
        currency=quote.currency,
        idempotency_key=idemp_key
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    await _complete_paypal_order_creation(db, order, quote, idemp_key)

    return CheckoutCreateResponse(
        order_id=local_order_id,
        paypal_order_id=order.paypal_order_id,
        status="AWAITING_APPROVAL",
        amount=quote.amount,
        currency=quote.currency,
        paypal_mode=_paypal_mode(order.paypal_order_id),
    )

@router.post("/{order_id}/capture", response_model=CheckoutCaptureResponse)
async def capture_checkout_order(
    order_id: str,
    request: CheckoutCaptureRequest,
    db: Session = Depends(get_db),
    authenticated_session_id: str = Depends(require_session),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    require_session_match(order.session_id, authenticated_session_id)

    if order.status == "PAID":
        payment = db.query(Payment).filter(Payment.order_id == order.id).first()
        if not payment:
            raise HTTPException(status_code=409, detail="Paid order has no recorded capture; reconciliation is required")
        return CheckoutCaptureResponse(
            order_id=order.id,
            status="PAID",
            payment=PaymentDetails(
                provider=payment.provider,
                capture_id=payment.capture_id,
                amount=order.amount,
                currency=order.currency
            )
        )

    if order.status != "AWAITING_APPROVAL":
        raise HTTPException(status_code=409, detail=f"Cannot capture order in {order.status} state")

    # Pre-capture Re-verification Guard
    now = datetime.now(timezone.utc)
    quote = db.query(Quote).filter(Quote.id == order.quote_id).first()
    if quote:
        # a) Check quote non-expiry
        exp = quote.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now > exp:
            order.status = "CANCELLED"
            order.updated_at = now
            quote.status = "EXPIRED"
            db.commit()
            AuditService.record_event(
                db=db,
                event_type="AUTO_VOID_EXPIRED_QUOTE",
                session_id=order.session_id,
                order_id=order.id,
                details={"quote_id": quote.id, "expires_at": quote.expires_at.isoformat()}
            )
            raise HTTPException(status_code=400, detail="Quote expired before payment capture. Please re-evaluate purchase policy.")

        # b) Check cryptographic HMAC signature integrity
        if not quote.quote_signature:
            order.status = "CANCELLED"
            order.updated_at = now
            db.commit()
            AuditService.record_event(
                db=db,
                event_type="SECURITY_ALERT_SIGNATURE_MISSING",
                session_id=order.session_id,
                order_id=order.id,
                details={"quote_id": quote.id, "sku": quote.sku, "reason": "Quote lacks cryptographic HMAC signature"}
            )
            raise HTTPException(status_code=400, detail="Quote cryptographic signature missing; cannot verify quote integrity")

        if not QuoteService.verify_quote_signature(
            quote_id=quote.id,
            sku=quote.sku,
            merchant=quote.merchant or "PayPilot Demo Store",
            landed_cost=quote.landed_cost or quote.amount,
            expires_at_iso=quote.expires_at.isoformat(),
            provided_sig=quote.quote_signature
        ):
            order.status = "CANCELLED"
            order.updated_at = now
            db.commit()
            AuditService.record_event(
                db=db,
                event_type="SECURITY_ALERT_SIGNATURE_TAMPERED",
                session_id=order.session_id,
                order_id=order.id,
                details={"quote_id": quote.id, "sku": quote.sku}
            )
            raise HTTPException(status_code=400, detail="Quote cryptographic signature verification failed; quote has been tampered with")

    # d) Live Merchant Price/Stock Drift Re-verification Guard
    from app.models.catalogue import DemoProduct
    from app.services.policy_engine import PolicyEngine
    product = db.query(DemoProduct).filter(DemoProduct.sku == order.sku).first()
    price_drifted = False
    live_price = order.amount
    if product:
        live_landed = PolicyEngine.calculate_landed_cost(product.fixed_price)[0]
        if not product.active:
            price_drifted = True
            live_price = live_landed
        elif live_landed > order.amount:
            price_drifted = True
            live_price = live_landed

    if request.simulate_price_drift or price_drifted:
        order.status = "CANCELLED"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        attempted_price = live_price if price_drifted else round(order.amount * 1.35, 2)
        AuditService.record_event(
            db=db,
            event_type="AUTO_VOID_PRICE_DRIFT",
            session_id=order.session_id,
            order_id=order.id,
            details={
                "reason": f"Pre-capture price-drift guardian detected merchant price spike from locked quote (${order.amount:.2f} -> ${attempted_price:.2f}). Order automatically voided to protect buyer funds.",
                "attempted_price": attempted_price,
                "locked_quote_amount": order.amount
            }
        )
        raise HTTPException(
            status_code=409,
            detail=f"Pre-capture guardian blocked payment: Merchant raised price above locked quote (${order.amount:.2f} -> ${attempted_price:.2f}). Order automatically voided to protect buyer funds."
        )

    # Claim capture atomically so two requests cannot issue separate captures.
    claimed = (
        db.query(Order)
        .filter(Order.id == order.id, Order.status == "AWAITING_APPROVAL")
        .update({"status": "CAPTURE_PENDING", "updated_at": datetime.now(timezone.utc)})
    )
    db.commit()
    if not claimed:
        raise HTTPException(status_code=409, detail="Order capture is already in progress")
    db.refresh(order)

    # Execute PayPal Capture. An ambiguous network failure must be reconciled;
    # blindly retrying with a fresh request ID could duplicate a capture.
    try:
        capture_res = await paypal_client.capture_order(
            paypal_order_id=order.paypal_order_id,
            idempotency_key=request.idempotency_key or f"capture_{order.id}",
            amount=order.amount,
            currency=order.currency
        )
    except Exception as e:
        order.status = "RECONCILIATION_REQUIRED"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        AuditService.record_event(
            db=db,
            event_type="PAYMENT_FAILED",
            session_id=order.session_id,
            order_id=order.id,
            details={"error": str(e)}
        )
        raise HTTPException(status_code=502, detail=f"PayPal capture failed: {str(e)}")

    if not isinstance(capture_res, dict):
        order.status = "RECONCILIATION_REQUIRED"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=502, detail="PayPal returned an invalid capture response")

    paypal_status = capture_res.get("status")
    # Verify capture status
    if paypal_status != "COMPLETED":
        order.status = "RECONCILIATION_REQUIRED"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Payment capture returned unverified status: {paypal_status}")

    # Verify the provider returned an actual capture matching the locked quote.
    captures = []
    for pu in capture_res.get("purchase_units", []):
        for c in pu.get("payments", {}).get("captures", []):
            captures.append(c)

    primary_cap = next((c for c in captures if c.get("status") == "COMPLETED"), None)
    cap_amount = (primary_cap or {}).get("amount") or {}
    try:
        amount_matches = float(cap_amount.get("value")) == round(order.amount, 2)
    except (TypeError, ValueError):
        amount_matches = False
    if (
        not primary_cap
        or not primary_cap.get("id")
        or not amount_matches
        or cap_amount.get("currency_code", "").upper() != order.currency.upper()
    ):
        order.status = "RECONCILIATION_REQUIRED"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=502, detail="PayPal capture could not be verified against the quoted amount")
    capture_id = primary_cap["id"]

    # Update Order to PAID
    order.status = "PAID"
    order.updated_at = datetime.now(timezone.utc)

    payment = Payment(
        id=f"pay_{uuid.uuid4().hex[:10]}",
        order_id=order.id,
        provider="simulated" if order.paypal_order_id.startswith("SANDBOX_ORDER_") else "paypal_sandbox",
        capture_id=capture_id,
        status="COMPLETED",
        captured_amount=order.amount,
        currency=order.currency,
        raw_response_json=json.dumps(capture_res)
    )
    db.add(payment)
    db.commit()

    paypal_mode = _paypal_mode(order.paypal_order_id)
    # Keep local simulation distinct from an actual PayPal capture in the audit.
    AuditService.record_event(
        db=db,
        event_type="PAYMENT_CAPTURED" if paypal_mode == "sandbox" else "SIMULATED_CHECKOUT_COMPLETED",
        session_id=order.session_id,
        order_id=order.id,
        details={
            "capture_id": capture_id,
            "paypal_order_id": order.paypal_order_id,
            "captured_amount": order.amount,
            "currency": order.currency,
            "paypal_mode": paypal_mode,
            "verified": True
        }
    )

    return CheckoutCaptureResponse(
        order_id=order.id,
        status="PAID",
        payment=PaymentDetails(
            provider=payment.provider,
            capture_id=capture_id,
            amount=order.amount,
            currency=order.currency
        )
    )
