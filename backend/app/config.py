from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    PORT: int = 8000
    DATABASE_URL: str = "sqlite:///./paypilot.db"
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    SESSION_SIGNING_SECRET: str = ""

    # PayPal Configuration
    PAYPAL_ENV: str = "sandbox"
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_BASE_URL: str = "https://api-m.sandbox.paypal.com"
    PAYPAL_WEBHOOK_ID: str = ""

    # Channel3 API Configuration
    CHANNEL3_API_KEY: str = ""
    CHANNEL3_BASE_URL: str = "https://api.trychannel3.com/v1"

    # AI Configuration (Gemini)
    AI_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

settings = Settings()
