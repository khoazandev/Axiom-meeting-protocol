"""
Database engine and session configuration with enterprise connection pooling.

Supports both SQLite (development) and PostgreSQL (production)
via the DATABASE_URL environment variable.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from src.backend.core.config import get_settings

settings = get_settings()

# SQLite requires check_same_thread=False; PostgreSQL uses pool tuning.
connect_args = (
    {"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {}
)

engine_kwargs = {"connect_args": connect_args}

if not settings.database_url.startswith("sqlite"):
    engine_kwargs.update(
        {
            "pool_size": 20,
            "max_overflow": 30,
            "pool_timeout": 30,
            "pool_pre_ping": True,
        }
    )

engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Yield a database session, ensuring it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
