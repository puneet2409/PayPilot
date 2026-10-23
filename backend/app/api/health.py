from fastapi import APIRouter
from app.config import settings
from app.integrations.paypal import paypal_client
from app.integrations.channel3 import channel3_client

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "app_env": settings.APP_ENV,
        "paypal_env": settings.PAYPAL_ENV,
        "paypal_configured": paypal_client.is_configured,
        "channel3_configured": channel3_client.is_configured,
        "ai_provider": settings.AI_PROVIDER,
        "gemini_model": settings.GEMINI_MODEL
    }
