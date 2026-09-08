import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from src.backend.core.config import get_settings

settings = get_settings()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", settings.database_url)

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
