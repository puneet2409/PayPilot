from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, Payment
from app.models.catalogue import DemoProduct
from app.security import require_session, require_session_match

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics & AG Studio"])

def _format_utc_iso(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    s = dt.isoformat()
    if not s.endswith("Z") and "+" not in s:
        s += "Z"
    return s

@router.get("/sessions/{session_id}/dashboard", response_model=Dict[str, Any])
def get_dashboard_api_data(
    session_id: str,
    db: Session = Depends(get_db),
    authenticated_session_id: str = Depends(require_session),
):
    """
    Implements getDashboardAPIData from Section 1.2 of Embedded Financial Analytics Blueprint:
    Consolidates operational PayPal transactional data into structured tabular sources,
    relational join definitions, calculated KPI expressions, and temporal boundaries
    tailored for AG Studio and AI context harness ingestion.
    """
    require_session_match(session_id, authenticated_session_id)

    orders = (
        db.query(Order)
        .filter(Order.session_id == session_id)
        .order_by(Order.created_at.asc())
        .all()
    )

    skus = {o.sku for o in orders}
    products = db.query(DemoProduct).filter(DemoProduct.sku.in_(skus)).all() if skus else []
    sku_to_title = {p.sku: p.title for p in products}

    order_ids = [o.id for o in orders]
    payments = db.query(Payment).filter(Payment.order_id.in_(order_ids)).all() if order_ids else []
    order_to_payment = {p.order_id: p for p in payments}

    # Transform orders into AG Studio "orders" source
    orders_data = []
    total_issued = 0.0
    total_paid = 0.0
    timestamps = []

    for o in orders:
        pmt = order_to_payment.get(o.id)
        is_paid = o.status == "PAID"
        paid_val = o.amount if is_paid else 0.0
        total_issued += o.amount
        total_paid += paid_val

        created_iso = _format_utc_iso(o.created_at)
        if o.created_at:
            timestamps.append(o.created_at)

        orders_data.append({
            "id": o.id,
            "quoteId": o.quote_id,
            "customerId": session_id,
            "sku": o.sku,
            "title": sku_to_title.get(o.sku, o.sku),
            "status": o.status,
            "issued_amount": round(o.amount, 2),
            "paid_amount": round(paid_val, 2),
            "currency": o.currency,
            "paypalOrderId": o.paypal_order_id or "",
            "captureId": pmt.capture_id if pmt else "",
            "create_time": created_iso,
        })

    # Transform payments into AG Studio "transactions" source
    import json
    transactions_data = []
    for p in payments:
        created_iso = _format_utc_iso(p.created_at)
        if p.created_at:
            timestamps.append(p.created_at)

        fee_val = None
        fee_type = "estimated"
        if p.raw_response_json:
            try:
                raw_payload = json.loads(p.raw_response_json)
                for pu in raw_payload.get("purchase_units", []):
                    for cap in pu.get("payments", {}).get("captures", []):
                        pp_fee = cap.get("seller_receivable_breakdown", {}).get("paypal_fee", {}).get("value")
                        if pp_fee is not None:
                            fee_val = round(float(pp_fee), 2)
                            fee_type = "provider_reported"
                            break
            except Exception:
                pass

        if fee_val is None:
            # Standard PayPal merchant processing formula (2.9% + $0.30)
            fee_val = round(p.captured_amount * 0.029 + 0.30, 2)

        net_val = round(p.captured_amount - fee_val, 2)

        transactions_data.append({
            "transaction_id": p.capture_id,
            "order_id": p.order_id,
            "provider": p.provider,
            "transaction_status": p.status,
            "gross_amount": round(p.captured_amount, 2),
            "fee_amount": fee_val,
            "fee_type": fee_type,
            "fee_basis": "PayPal API Reported" if fee_type == "provider_reported" else "Standard Rate Estimate (2.9% + $0.30)",
            "net_amount": net_val,
            "currency": p.currency,
            "transaction_initiation_date": created_iso,
        })

    # Customers source
    customers_data = [{
        "id": session_id,
        "given_name": "Sandbox Buyer",
        "company_name": "PayPilot Customer",
        "account_type": "Personal Sandbox",
        "currency": "USD"
    }]

    # Computed Financial Metrics
    paid_count = sum(1 for o in orders if o.status == "PAID")
    collection_rate = (total_paid / total_issued * 100.0) if total_issued > 0 else 100.0
    aov = (total_paid / paid_count) if paid_count > 0 else 0.0

    # Temporal Bounds Calculation (Section 2.4)
    now = datetime.now(timezone.utc)
    if timestamps:
        start_date = min(timestamps).isoformat()
        end_date = max(timestamps).isoformat()
    else:
        start_date = datetime(now.year, 1, 1, tzinfo=timezone.utc).isoformat()
        end_date = now.isoformat()

    return {
        "description": "PayPal Financial Analytics Data Model - Enterprise Invoicing, Orders, and Customer Metrics",
        "sources": {
            "orders": orders_data,
            "transactions": transactions_data,
            "customers": customers_data
        },
        "relationships": [
            {
                "type": "many-to-one",
                "from": {"source": "orders", "field": "customerId"},
                "to": {"source": "customers", "field": "id"}
            },
            {
                "type": "many-to-one",
                "from": {"source": "transactions", "field": "order_id"},
                "to": {"source": "orders", "field": "id"}
            }
        ],
        "expressions": [
            {
                "source": "orders",
                "name": "collection_rate",
                "label": "Collection Rate (%)",
                "dataType": "number",
                "expression": "paid_amount / issued_amount"
            }
        ],
        "calendar": {
            "startDate": start_date,
            "endDate": end_date,
            "defaultRange": "thisYear"
        },
        "metrics": {
            "total_issued_amount": round(total_issued, 2),
            "total_paid_amount": round(total_paid, 2),
            "collection_rate_percent": round(collection_rate, 1),
            "total_orders": len(orders),
            "paid_orders": paid_count,
            "average_order_value": round(aov, 2),
            "currency": "USD"
        }
    }
