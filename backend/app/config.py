import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "SupportDesk API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./supportdesk.db"
    )
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    # AI Providers Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    GEMINI_API_URL: str = os.getenv("GEMINI_API_URL", "https://generativelanguage.googleapis.com/v1beta/interactions")

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    GROQ_API_URL: str = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")

    AI_ROTATION_STRATEGY: str = os.getenv("AI_ROTATION_STRATEGY", "round_robin")
    AI_FALLBACK_ENABLED: bool = os.getenv("AI_FALLBACK_ENABLED", "true").lower() in ("true", "1", "yes")
    AI_REQUEST_TIMEOUT: int = int(os.getenv("AI_REQUEST_TIMEOUT", "30"))

settings = Settings()
