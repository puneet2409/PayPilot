import json
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, Payment
from app.models.catalogue import DemoProduct
from app.schemas.order import (
    OrderDetailResponse,
    AuditTimelineResponse,
    AuditTimelineEvent,
    OrderSummaryItem
)
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
                created_at=e.created_at.isoformat(),
                prev_hash=e.prev_hash,
                entry_hash=e.entry_hash
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
                created_at=e.created_at.isoformat(),
                prev_hash=e.prev_hash,
                entry_hash=e.entry_hash
            )
            for e in events
        ]
    )

@router.get("/sessions/{session_id}/orders", response_model=List[OrderSummaryItem])
def get_session_orders(
    session_id: str,
    db: Session = Depends(get_db),
    authenticated_session_id: str = Depends(require_session),
):
    require_session_match(session_id, authenticated_session_id)
    orders = (
        db.query(Order)
        .filter(Order.session_id == session_id)
        .order_by(Order.created_at.desc())
        .all()
    )

    skus = {o.sku for o in orders}
    products = db.query(DemoProduct).filter(DemoProduct.sku.in_(skus)).all() if skus else []
    sku_to_title = {p.sku: p.title for p in products}

    order_ids = [o.id for o in orders]
    payments = db.query(Payment).filter(Payment.order_id.in_(order_ids)).all() if order_ids else []
    order_to_payment = {p.order_id: p for p in payments}

    result = []
    for o in orders:
        pmt = order_to_payment.get(o.id)
        result.append(
            OrderSummaryItem(
                order_id=o.id,
                quote_id=o.quote_id,
                session_id=o.session_id,
                sku=o.sku,
                item_title=sku_to_title.get(o.sku, o.sku),
                paypal_order_id=o.paypal_order_id,
                capture_id=pmt.capture_id if pmt else None,
                status=o.status,
                amount=o.amount,
                currency=o.currency,
                created_at=o.created_at.isoformat() if o.created_at else "",
                updated_at=o.updated_at.isoformat() if o.updated_at else None,
            )
        )
    return result

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
