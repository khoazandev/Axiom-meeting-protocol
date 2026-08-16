"""
Application configuration using Pydantic Settings.

All environment variables are centralized here instead of scattered os.getenv() calls.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "sqlite:///./sql_app.db"

    # CORS
    cors_origins: str = "*"

    # LiveKit
    livekit_api_key: str = "devkey"
    livekit_api_secret: str = "secret"
    livekit_url: str = ""

    # JWT Authentication
    jwt_secret: str = "dev-secret-key-change-in-production-32bytesmin"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    refresh_token_expire_days: int = 7

    # Ollama / LLM
    ollama_base_url: str = ""
    ollama_model: str = ""  # auto-detect if empty
    ollama_timeout: int = 90

    # STT & Realtime AI Models
    stt_whisper_model: str = "large-v3"
    stt_ollama_model: str = "qwen2.5:0.5b"
    trans_vi_en_model: str = "Helsinki-NLP/opus-mt-vi-en"
    trans_en_vi_model: str = "Helsinki-NLP/opus-mt-en-vi"

    # AI Action Item Extraction
    extraction_model: str = "qwen3:0.6b"
    extraction_timeout: int = 900
    extraction_max_transcript_chars: int = 6000
    extraction_system_prompt: str = (
        "You are a senior product manager. Your job is to extract all action items from meeting transcripts.\n\n"
        "For each action item you identify, extract:\n"
        '- "task": What needs to be done (clear, actionable description)\n'
        '- "owner": Who is responsible (use their name from transcript, or "Unassigned" if no clear owner)\n'
        '- "due_date": When it\'s due (extract from context, or "Not specified")\n'
        '- "priority": HIGH / MEDIUM / LOW (infer from urgency in transcript)\n'
        '- "status": Always "TODO" for newly extracted items\n\n'
        "Rules:\n"
        "- Only extract real, actionable tasks — not opinions or general discussion\n"
        '- If someone says "I will...", "We need to...", "Please...", "Cần phải...", "Hãy..." — that\'s an action item\n'
        "- If a name is mentioned before/after the task, that person is the owner\n"
        '- Flag anything with no clear owner as "Unassigned"\n'
        "- Be concise in task descriptions (max 120 chars)\n\n"
        "Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.\n"
        'Example: [{"task": "Update API docs", "owner": "Khoa", "due_date": "Friday", "priority": "HIGH", "status": "TODO"}]\n\n'
        "If no action items found, return: []"
    )

    # Follow-up Task Extraction (task-extractor model)
    task_extractor_model: str = "task-extractor01"
    task_extractor_timeout: int = 900

    # Bot Test Scenario
    bot_test_script_delay_seconds: float = 2.0
    bot_test_stt_timeout: int = 10

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
