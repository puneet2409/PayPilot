from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.agent import AgentTurnRequest, AgentTurnResponse
from app.services.orchestrator import orchestrator
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/v1/agent", tags=["Agent"])

@router.post("/sessions/{session_id}/turn", response_model=AgentTurnResponse)
async def process_agent_turn(
    session_id: str,
    request: AgentTurnRequest,
    db: Session = Depends(get_db)
):
    response = await orchestrator.handle_turn(session_id, request)

    AuditService.record_event(
        db=db,
        event_type="AGENT_TURN_PROCESSED",
        session_id=session_id,
        details={
            "user_message": request.message,
            "category": response.intent.category if response.intent else None,
            "budget": response.intent.budget if response.intent else None,
            "recommendations_count": len(response.recommendations)
        }
    )

    return response
