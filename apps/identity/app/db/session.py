from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from apps.identity.app.core.config import get_settings

settings = get_settings()

def _normalize_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql+psycopg2://"):
        url = url.replace("psycopg2", "psycopg", 1)
    return url

DB_URL = _normalize_url(settings.DB_URL)

engine = create_engine(DB_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()