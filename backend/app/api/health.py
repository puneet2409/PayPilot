from fastapi import APIRouter
from app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "app_env": settings.APP_ENV,
        "paypal_env": settings.PAYPAL_ENV,
        "ai_provider": settings.AI_PROVIDER
    }
