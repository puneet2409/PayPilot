from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.policy import PolicyEvaluateRequest, PolicyEvaluateResponse, QuoteSummary
from app.services.policy_engine import PolicyEngine
from app.services.quote_service import QuoteService
from app.services.audit_service import AuditService
from app.security import require_session, require_session_match

router = APIRouter(prefix="/api/v1/policies", tags=["Policies"])

@router.post("/evaluate", response_model=PolicyEvaluateResponse)
def evaluate_purchase_policy(
    request: PolicyEvaluateRequest,
    db: Session = Depends(get_db),
    authenticated_session_id: str = Depends(require_session),
):
    require_session_match(request.session_id, authenticated_session_id)
    passed, checks, product, reason = PolicyEngine.evaluate(
        db=db,
        demo_sku=request.demo_sku,
        max_total=request.max_total,
        currency=request.currency,
        required_features=request.required_features,
        excluded_terms=request.excluded_terms
    )

    if not product:
        raise HTTPException(status_code=404, detail="Demo product SKU not found")

    landed_cost, estimated_tax, shipping = PolicyEngine.calculate_landed_cost(product.fixed_price)
    quote_summary = None
    if passed:
        quote = QuoteService.create_quote(
            db=db,
            session_id=request.session_id,
            product=product
        )
        quote_sig = QuoteService.compute_quote_signature(
            quote.id,
            quote.amount,
            quote.sku,
            quote.expires_at.isoformat()
        )
        quote_summary = QuoteSummary(
            id=quote.id,
            amount=quote.amount,
            currency=quote.currency,
            expires_at=quote.expires_at.isoformat(),
            item_price=product.fixed_price,
            estimated_tax=estimated_tax,
            shipping=shipping,
            landed_cost=landed_cost,
            quote_signature=quote_sig
        )
        AuditService.record_event(
            db=db,
            event_type="POLICY_EVALUATED",
            session_id=request.session_id,
            details={
                "sku": request.demo_sku,
                "passed": True,
                "quote_id": quote.id,
                "amount": quote.amount,
                "max_total": request.max_total,
                "landed_cost": landed_cost,
                "estimated_tax": estimated_tax,
                "shipping": shipping,
                "quote_signature": quote_sig,
                "checks": [c.model_dump() for c in checks]
            }
        )
    else:
        AuditService.record_event(
            db=db,
            event_type="REJECTED_BY_POLICY",
            session_id=request.session_id,
            details={
                "sku": request.demo_sku,
                "passed": False,
                "reason": reason,
                "max_total": request.max_total,
                "item_price": product.fixed_price,
                "landed_cost": landed_cost,
                "checks": [c.model_dump() for c in checks]
            }
        )

    return PolicyEvaluateResponse(
        eligible=passed,
        policy_version="v1",
        currency=request.currency,
        max_total=request.max_total,
        item_price=product.fixed_price,
        sku=product.sku,
        item_title=product.title,
        checks=checks,
        quote=quote_summary,
        reason=reason,
        estimated_tax=estimated_tax,
        shipping=shipping,
        landed_cost=landed_cost
    )
