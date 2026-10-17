import time

from fastapi import APIRouter

from app.schemas.session import SessionCreateResponse
from app.security import issue_session_token, new_session_id

router = APIRouter(prefix="/api/v1/sessions", tags=["Sessions"])


@router.post("", response_model=SessionCreateResponse)
def create_session():
    """Create an anonymous, isolated session with a signed bearer credential."""
    session_id = new_session_id()
    expires_at = int(time.time()) + 60 * 60 * 12
    return SessionCreateResponse(
        session_id=session_id,
        access_token=issue_session_token(session_id, expires_at),
        expires_at=expires_at,
    )
