from pydantic import BaseModel


class SessionCreateResponse(BaseModel):
    session_id: str
    access_token: str
    token_type: str = "bearer"
    expires_at: int
