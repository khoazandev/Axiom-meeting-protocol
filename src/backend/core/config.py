"""
Application configuration using Pydantic Settings.

All environment variables are centralized here instead of scattered os.getenv() calls.
"""

import os
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "sqlite:///./sql_app.db"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # LiveKit
    livekit_api_key: str = "devkey"
    livekit_api_secret: str = "secret"
    livekit_url: str = "ws://localhost:7880"

    # Application
    app_title: str = "Axiom — Enterprise Meeting Protocol API"
    debug: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache
def get_settings() -> Settings:
    """Cached singleton for application settings."""
    return Settings()
