# backendapi/pases_temporales/schema.py
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class CrearPaseIn:
    start_at: str
    expires_at: str
    created_by: str  # UUID de Supabase (quien crea)
    visitor_id: Optional[str] = None
    auth_user_id: Optional[str] = None
    max_uses: int = 1
    meta: Optional[Dict[str, Any]] = None

@dataclass
class CrearPaseOut:
    pass_id: str
    pass_code: str
    pass_status: str
    start_at: str
    expires_at: str
    max_uses: int

@dataclass
class ValidarPaseIn:
    code: str
    by_user: Optional[str] = None
    reader_id: Optional[str] = None

@dataclass
class ValidarPaseOut:
    ok: bool
    status: str
    remaining_uses: int
    expires_at: str
