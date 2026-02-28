from pydantic_settings import BaseSettings
from typing import Optional
import secrets


class Settings(BaseSettings):
    # App
    APP_NAME: str = "MyFinance"
    DEBUG: bool = False

    # Database (using SQLite for development)
    DATABASE_URL: str = "sqlite:///./finance.db"

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "https://paraymn.com", "https://www.paraymn.com"]

    # Email (SMTP)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_USE_TLS: bool = True

    # Frontend URL (used in password reset emails)
    FRONTEND_URL: str = "https://paraymn.com"

    # Admin
    FIRST_ADMIN_EMAIL: Optional[str] = None
    FIRST_ADMIN_PASSWORD: Optional[str] = None
    ADMIN_SETUP_TOKEN: Optional[str] = None
    ALLOWED_ADMIN_IPS: list[str] = []

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
