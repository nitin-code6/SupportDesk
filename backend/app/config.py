import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base root directory of the repository
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_ENV_FILE = ROOT_DIR / ".env"
CANONICAL_DB_FILE = ROOT_DIR / "supportdesk.db"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_ENV_FILE) if ROOT_ENV_FILE.exists() else ".env", 
        extra="allow"
    )

    PROJECT_NAME: str = "SupportDesk API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SNAPSHOT_DATE: str = os.getenv("SNAPSHOT_DATE", "2026-09-30T23:59:59")
    DATA_DIR: Path = ROOT_DIR / "data"
    CANONICAL_CSV: Path = ROOT_DIR / "data" / "rideops_support_tickets.csv"
    
    # Database: Default to absolute path of canonical database file
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{CANONICAL_DB_FILE.as_posix()}"
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
