import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, Payment
from app.schemas.checkout import (
    CheckoutCreateRequest, CheckoutCreateResponse,
    CheckoutCaptureRequest, CheckoutCaptureResponse, PaymentDetails
)
from app.services.quote_service import QuoteService
from app.services.audit_service import AuditService
from app.integrations.paypal import paypal_client

router = APIRouter(prefix="/api/v1/checkout", tags=["Checkout"])

@router.post("/create", response_model=CheckoutCreateResponse)
async def create_checkout_order(
    request: CheckoutCreateRequest,
    db: Session = Depends(get_db)
):
    # 1. Authoritative Quote Verification
    quote = QuoteService.get_valid_quote(db, request.quote_id)
    if not quote:
        raise HTTPException(
            status_code=400,
            detail="Quote is expired, invalid, or already consumed. Please re-evaluate purchase policy."
        )

    # 2. Check Idempotency / Existing Order
    idemp_key = request.idempotency_key or f"idemp_{uuid.uuid4().hex[:12]}"
    existing_order = db.query(Order).filter(Order.idempotency_key == idemp_key).first()
    if existing_order:
        return CheckoutCreateResponse(
            order_id=existing_order.id,
            paypal_order_id=existing_order.paypal_order_id,
            status=existing_order.status,
            amount=existing_order.amount,
            currency=existing_order.currency
        )

    # 3. Create PayPal Sandbox Order
    try:
        paypal_res = await paypal_client.create_order(
            amount=quote.amount,
            currency=quote.currency,
            quote_id=quote.id,
            idempotency_key=idemp_key
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"PayPal API error: {str(e)}")

    paypal_order_id = paypal_res.get("id")
    local_order_id = f"order_{uuid.uuid4().hex[:10]}"

    # 4. Consume Quote and Persist Order
    QuoteService.consume_quote(db, quote.id)

    order = Order(
        id=local_order_id,
        quote_id=quote.id,
        session_id=quote.session_id,
        sku=quote.sku,
        paypal_order_id=paypal_order_id,
        status="AWAITING_APPROVAL",
        amount=quote.amount,
        currency=quote.currency,
        idempotency_key=idemp_key
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # 5. Audit Logging
    AuditService.record_event(
        db=db,
        event_type="PAYPAL_ORDER_CREATED",
        session_id=quote.session_id,
        order_id=local_order_id,
        details={
            "paypal_order_id": paypal_order_id,
            "amount": quote.amount,
            "currency": quote.currency,
            "sku": quote.sku
        }
    )

    return CheckoutCreateResponse(
        order_id=local_order_id,
        paypal_order_id=paypal_order_id,
        status="AWAITING_APPROVAL",
        amount=quote.amount,
        currency=quote.currency
    )

@router.post("/{order_id}/capture", response_model=CheckoutCaptureResponse)
async def capture_checkout_order(
    order_id: str,
    request: CheckoutCaptureRequest,
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == "PAID":
        payment = db.query(Payment).filter(Payment.order_id == order.id).first()
        return CheckoutCaptureResponse(
            order_id=order.id,
            status="PAID",
            payment=PaymentDetails(
                provider="paypal_sandbox",
                capture_id=payment.capture_id if payment else "ALREADY_CAPTURED",
                amount=order.amount,
                currency=order.currency
            )
        )

    # Execute PayPal Capture
    try:
        capture_res = await paypal_client.capture_order(
            paypal_order_id=order.paypal_order_id,
            idempotency_key=request.idempotency_key
        )
    except Exception as e:
        order.status = "FAILED"
        db.commit()
        AuditService.record_event(
            db=db,
            event_type="PAYMENT_FAILED",
            session_id=order.session_id,
            order_id=order.id,
            details={"error": str(e)}
        )
        raise HTTPException(status_code=502, detail=f"PayPal capture failed: {str(e)}")

    paypal_status = capture_res.get("status")
    # Verify capture status
    if paypal_status != "COMPLETED":
        order.status = "RECONCILIATION_REQUIRED"
        db.commit()
        raise HTTPException(status_code=400, detail=f"Payment capture returned unverified status: {paypal_status}")

    # Extract Capture ID
    captures = []
    for pu in capture_res.get("purchase_units", []):
        for c in pu.get("payments", {}).get("captures", []):
            captures.append(c)

    primary_cap = captures[0] if captures else {}
    capture_id = primary_cap.get("id") or f"CAP_{uuid.uuid4().hex[:10].upper()}"

    # Update Order to PAID
    order.status = "PAID"

    payment = Payment(
        id=f"pay_{uuid.uuid4().hex[:10]}",
        order_id=order.id,
        provider="paypal_sandbox",
        capture_id=capture_id,
        status="COMPLETED",
        captured_amount=order.amount,
        currency=order.currency,
        raw_response_json=json.dumps(capture_res)
    )
    db.add(payment)
    db.commit()

    # Immutable Audit Log
    AuditService.record_event(
        db=db,
        event_type="PAYMENT_CAPTURED",
        session_id=order.session_id,
        order_id=order.id,
        details={
            "capture_id": capture_id,
            "paypal_order_id": order.paypal_order_id,
            "captured_amount": order.amount,
            "currency": order.currency,
            "verified": True
        }
    )

    return CheckoutCaptureResponse(
        order_id=order.id,
        status="PAID",
        payment=PaymentDetails(
            provider="paypal_sandbox",
            capture_id=capture_id,
            amount=order.amount,
            currency=order.currency
        )
    )
