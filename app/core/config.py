from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import secrets
from pathlib import Path


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Create a .env file based on .env.example to configure.
    """

    # Application Settings
    APP_NAME: str = "Mind Map WebApp"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security Settings
    SECRET_KEY: str = secrets.token_urlsafe(32)  # Auto-generate if not set
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database Settings
    # Use absolute path to ensure DB is always in the db/ folder relative to project root
    DATABASE_URL: str = f"sqlite:///{Path(__file__).resolve().parent.parent.parent / 'db' / 'mindmap.db'}"

    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    LOGIN_RATE_LIMIT: int = 5
    SIGNUP_RATE_LIMIT: int = 3

    # Password Settings
    MIN_PASSWORD_LENGTH: int = 8

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def database_is_postgres(self) -> bool:
        return self.DATABASE_URL.startswith("postgresql")


# Create a global settings instance
settings = Settings()
