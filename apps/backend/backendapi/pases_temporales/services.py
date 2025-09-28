# backendapi/pases_temporales/services.py
from dataclasses import dataclass
from core.supabase_client import supabase_admin
from .errors import AppError
from .schema import CrearPaseIn, ValidarPaseIn


# ------------------------
# DTOs de salida
# ------------------------
@dataclass
class CrearPaseOut:
    pass_id: str
    pass_code: str
    pass_status: str
    start_at: str
    expires_at: str
    max_uses: int


@dataclass
class ValidarPaseOut:
    ok: bool
    status: str
    remaining_uses: int
    expires_at: str


# ------------------------
# Crear Pase
# ------------------------
def crear_pase(dto: CrearPaseIn) -> CrearPaseOut:
    """
    Crea un pase temporal llamando al RPC en Postgres.
    Mapea DTO -> parámetros que espera la función SQL (p_*).
    """
    if not dto.created_by:
        raise AppError("created_by requerido", 400)
    if not dto.start_at or not dto.expires_at:
        raise AppError("start_at y expires_at son requeridos", 400)
    if (not getattr(dto, "visitor_id", None)) and (not getattr(dto, "auth_user_id", None)):
        raise AppError("visitor_id o auth_user_id es requerido", 400)

    params = {
        "p_start_at":   dto.start_at,
        "p_expires_at": dto.expires_at,
        "p_created_by": dto.created_by,
        "p_max_uses":   int(dto.max_uses or 1),
        "p_meta":       (dto.meta or {}),
    }
    if getattr(dto, "visitor_id", None):
        params["p_visitor_id"] = dto.visitor_id
    if getattr(dto, "auth_user_id", None):
        params["p_auth_user_id"] = dto.auth_user_id

    data = None
    # Primero intentamos alias corto (si lo creaste); si no, la función base
    try:
        res = supabase_admin.rpc("generate_pass", params).execute()
        data = res.data
    except Exception:
        res = supabase_admin.rpc("sc_security_generate_pass", params).execute()
        data = res.data

    if not data:
        raise AppError("No se pudo crear el pase (RPC no devolvió filas)", 502)

    row = data[0]
    try:
        return CrearPaseOut(
            pass_id     = row["pass_id"],
            pass_code   = row["pass_code"],
            pass_status = row["pass_status"],
            start_at    = row.get("pass_start_at")   or row.get("start_at"),
            expires_at  = row.get("pass_expires_at") or row.get("expires_at"),
            max_uses    = row.get("pass_max_uses")   or row.get("max_uses"),
        )
    except KeyError as e:
        raise AppError(f"Campos faltantes en RPC: {e}", 500)


# ------------------------
# Validar Pase
# ------------------------
def validar_pase(dto: ValidarPaseIn) -> ValidarPaseOut:
    """
    Valida (y opcionalmente consume) un pase temporal.
    Espera que exista el RPC: sc_security_validate_pass (o alias validate_pass).
    """
    if not dto.code:
        raise AppError("code es requerido", 400)
    if not getattr(dto, "by_user", None):
        raise AppError("by_user es requerido", 400)

    params = {
        "p_code": dto.code.strip(),
        "p_by_user": dto.by_user,
        "p_mark_use": bool(getattr(dto, "mark_use", True)),
    }

    data = None
    try:
        res = supabase_admin.rpc("validate_pass", params).execute()
        data = res.data
    except Exception:
        res = supabase_admin.rpc("sc_security_validate_pass", params).execute()
        data = res.data

    if not data:
        raise AppError("No se pudo validar el pase (RPC no devolvió filas)", 502)

    row = data[0]
    try:
        return ValidarPaseOut(
            ok             = bool(row.get("ok", False)),
            status         = row["status"],
            remaining_uses = int(row.get("remaining_uses", 0)),
            expires_at     = row["expires_at"],
        )
    except KeyError as e:
        raise AppError(f"Campos faltantes en RPC (validar): {e}", 500)
