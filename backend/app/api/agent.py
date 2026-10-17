from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.agent import AgentTurnRequest, AgentTurnResponse
from app.services.orchestrator import orchestrator
from app.services.audit_service import AuditService
from app.security import require_session, require_session_match

from app.integrations.channel3 import channel3_client

router = APIRouter(prefix="/api/v1/agent", tags=["Agent"])

@router.post("/sessions/{session_id}/turn", response_model=AgentTurnResponse)
async def process_agent_turn(
    session_id: str,
    request: AgentTurnRequest,
    db: Session = Depends(get_db),
    authenticated_session_id: str = Depends(require_session),
):
    require_session_match(session_id, authenticated_session_id)
    response = await orchestrator.handle_turn(session_id, request)

    AuditService.record_event(
        db=db,
        event_type="AGENT_TURN_PROCESSED",
        session_id=session_id,
        details={
            "user_message": request.message,
            "category": response.intent.category if response.intent else None,
            "budget": response.intent.budget if response.intent else None,
            "discovery_provider": "channel3" if channel3_client.is_configured else "channel3_catalog_cache",
            "channel3_mode": "agentic",
            "recommendations_count": len(response.recommendations),
            "multi_retailer_offers_analyzed": sum(len(r.offers) for r in response.recommendations),
        }
    )

    return response
