# backendapi/pases_temporales/validators.py
from datetime import datetime
from .errors import ValidationError

def _require_iso(dt: str) -> None:
    try:
        # fromisoformat tolera "YYYY-MM-DDTHH:MM:SS[.ffffff][+HH:MM]"
        datetime.fromisoformat(dt)
    except Exception:
        raise ValidationError(f"Fecha inválida (ISO8601 esperado): {dt}")

def validate_crear_pase(payload: dict):
    if not payload.get("start_at"):
        raise ValidationError("start_at es requerido")
    if not payload.get("expires_at"):
        raise ValidationError("expires_at es requerido")
    if not payload.get("created_by"):
        raise ValidationError("created_by es requerido")
    if not (payload.get("visitor_id") or payload.get("auth_user_id")):
        raise ValidationError("Debe enviar visitor_id o auth_user_id")

    _require_iso(payload["start_at"])
    _require_iso(payload["expires_at"])

def validate_validar_pase(payload: dict):
    if not payload.get("code"):
        raise ValidationError("code es requerido")
