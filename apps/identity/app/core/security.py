from fastapi import Header, HTTPException, status
from .config import get_settings

def verify_api_key(x_identity_key: str | None = Header(None)):
    if x_identity_key != get_settings().API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key inválida"
        )