import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, Payment
from app.schemas.order import OrderDetailResponse, AuditTimelineResponse, AuditTimelineEvent
from app.services.audit_service import AuditService
from app.security import require_session, require_session_match

router = APIRouter(prefix="/api/v1", tags=["Orders & Audit"])

@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
def get_order_details(
    order_id: str,
    db: Session = Depends(get_db),
    authenticated_session_id: str = Depends(require_session),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    require_session_match(order.session_id, authenticated_session_id)

    payment_info = None
    payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if payment:
        payment_info = {
            "capture_id": payment.capture_id,
            "status": payment.status,
            "amount": payment.captured_amount,
            "currency": payment.currency
        }

    return OrderDetailResponse(
        order_id=order.id,
        quote_id=order.quote_id,
        session_id=order.session_id,
        sku=order.sku,
        paypal_order_id=order.paypal_order_id,
        status=order.status,
        amount=order.amount,
        currency=order.currency,
        created_at=order.created_at.isoformat(),
        payment=payment_info
    )

@router.get("/orders/{order_id}/timeline", response_model=AuditTimelineResponse)
def get_order_audit_timeline(
    order_id: str,
    db: Session = Depends(get_db),
    authenticated_session_id: str = Depends(require_session),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    require_session_match(order.session_id, authenticated_session_id)
    events = AuditService.get_timeline(db, order_id=order_id)
    return AuditTimelineResponse(
        order_id=order_id,
        events=[
            AuditTimelineEvent(
                id=e.id,
                event_type=e.event_type,
                details=json.loads(e.details_json or "{}"),
                created_at=e.created_at.isoformat()
            )
            for e in events
        ]
    )

@router.get("/sessions/{session_id}/timeline", response_model=AuditTimelineResponse)
def get_session_audit_timeline(
    session_id: str,
    db: Session = Depends(get_db),
    authenticated_session_id: str = Depends(require_session),
):
    require_session_match(session_id, authenticated_session_id)
    events = AuditService.get_timeline(db, session_id=session_id)
    return AuditTimelineResponse(
        session_id=session_id,
        events=[
            AuditTimelineEvent(
                id=e.id,
                event_type=e.event_type,
                details=json.loads(e.details_json or "{}"),
                created_at=e.created_at.isoformat()
            )
            for e in events
        ]
    )

@router.post("/orders/{order_id}/cancel")
def cancel_order(
    order_id: str,
    db: Session = Depends(get_db),
    authenticated_session_id: str = Depends(require_session),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    require_session_match(order.session_id, authenticated_session_id)
    previous_status = order.status
    if previous_status != "AWAITING_APPROVAL":
        raise HTTPException(status_code=409, detail=f"Cannot cancel order in {previous_status} state")
    cancelled = (
        db.query(Order)
        .filter(Order.id == order.id, Order.status == "AWAITING_APPROVAL")
        .update({"status": "CANCELLED", "updated_at": datetime.now(timezone.utc)})
    )
    if not cancelled:
        db.rollback()
        raise HTTPException(status_code=409, detail="Order state changed; cancellation was not applied")
    db.commit()
    AuditService.record_event(
        db=db,
        event_type="ORDER_CANCELLED",
        session_id=order.session_id,
        order_id=order.id,
        details={"previous_status": previous_status}
    )
    return {"order_id": order.id, "status": "CANCELLED"}
