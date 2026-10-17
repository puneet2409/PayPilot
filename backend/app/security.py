import base64
import hashlib
import hmac
import secrets
import time
from uuid import uuid4

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

_bearer = HTTPBearer(auto_error=False)
_development_secret = secrets.token_urlsafe(48)


def validate_auth_config() -> None:
    if settings.APP_ENV.lower() == "production" and len(settings.SESSION_SIGNING_SECRET) < 32:
        raise RuntimeError("SESSION_SIGNING_SECRET must contain at least 32 characters in production")


def _secret() -> str:
    configured = settings.SESSION_SIGNING_SECRET
    if len(configured) >= 32:
        return configured
    if settings.APP_ENV.lower() == "production":
        raise RuntimeError("SESSION_SIGNING_SECRET must contain at least 32 characters in production")
    return _development_secret


def issue_session_token(session_id: str, expires_at: int) -> str:
    payload = f"{session_id}.{expires_at}"
    signature = hmac.new(_secret().encode(), payload.encode(), hashlib.sha256).digest()
    signature_text = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
    return f"{payload}.{signature_text}"


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="A valid session bearer token is required",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    try:
        session_id, expires_text, signature_text = credentials.credentials.split(".")
        expires_at = int(expires_text)
        payload = f"{session_id}.{expires_text}"
        expected = hmac.new(_secret().encode(), payload.encode(), hashlib.sha256).digest()
        provided = base64.urlsafe_b64decode(signature_text + "=" * (-len(signature_text) % 4))
    except (ValueError, TypeError):
        raise _unauthorized()

    if (
        not session_id.startswith("sess_")
        or expires_at <= int(time.time())
        or not hmac.compare_digest(expected, provided)
    ):
        raise _unauthorized()
    return session_id


def require_session_match(expected_session_id: str, authenticated_session_id: str) -> None:
    if not hmac.compare_digest(expected_session_id.encode("utf-8"), authenticated_session_id.encode("utf-8")):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Session does not match bearer token")


def new_session_id() -> str:
    return f"sess_{uuid4().hex}"
