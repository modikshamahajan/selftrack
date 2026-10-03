import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SelfTrack API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security & Tokens
    SECRET_KEY: str = os.getenv("SECRET_KEY", "selftrack-ultra-secure-jwt-secret-key-2026-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Database (defaults to SQLite async for zero-config, supports PostgreSQL asyncpg)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./selftrack.db")
    
    # AI & Local LLM Defaults
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    DEFAULT_LOCAL_MODEL: str = os.getenv("DEFAULT_LOCAL_MODEL", "llama3.2:1b")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    CORS_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
