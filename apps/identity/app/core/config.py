import os
from functools import lru_cache
from dotenv import load_dotenv
load_dotenv("apps/identity/.env.local", override=False)
class Settings:
    # Clave de autenticación para el servicio de identidad
    API_KEY: str = os.getenv("IDENTITY_API_KEY", "dev-identity-key")

    # Cadena de conexión a Supabase (Postgres)
    # Ejemplo: postgresql+psycopg://postgres:<password>@<host>:5432/postgres?sslmode=require
    DB_URL: str = os.getenv("SUPABASE_DB_URL", "")

    # Carpeta local donde se guardan las imágenes
    IMAGES_ROOT: str = os.getenv("IMAGES_ROOT", "apps/identity/storage/visitors")

    # Orígenes permitidos (para CORS) -> lista separada por comas
    ALLOW_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("ALLOW_ORIGINS", "http://localhost:3000").split(",") if o.strip()
    ]

    # Parámetros de validación de rostro
    MIN_DET_SCORE: float = float(os.getenv("MIN_DET_SCORE", "0.80"))

    # Activar logging debug local
    DEBUG: bool = os.getenv("IDENTITY_DEBUG", "false").lower() == "true"

@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if not s.DB_URL:
        raise RuntimeError("SUPABASE_DB_URL no está definido.")
    return s