# backendapi/comunicados/services.py
from typing import Dict, Any, Optional
from django.utils import timezone
from core.supabase_client import supabase_admin


def _assert_user_exists(user_id: str):
    """
    Verifica que el user_id exista en Supabase Auth.
    Lanza un error claro si no existe (evita FK 500 genérico).
    """
    try:
        res = supabase_admin.auth.admin.get_user_by_id(user_id)
        if not (res and hasattr(res, "user") and res.user):
            raise RuntimeError
    except Exception:
        raise RuntimeError(
            f"El user_id '{user_id}' no existe en auth.users de este proyecto Supabase. "
            "Revisa que el backend y el login apunten al MISMO SUPABASE_URL/KEY y que el usuario exista."
        )


DEFAULT_BUCKET = "comunicados"


def crear_comunicado(data: Dict[str, Any], *, user_id: str) -> Dict[str, Any]:
    """
    Crea un comunicado en public.comunicados.
    - Si NO hay scheduled_for => publica ahora (published_at = now()).
    - Si hay scheduled_for     => deja published_at = NULL.
    Retorna la fila creada (dict) tal como la devuelve Supabase.
    """
    titulo = (data.get("titulo") or "").strip()
    contenido = (data.get("contenido") or "").strip()
    portada_path = ((data.get("portada_path") or "").strip()) or None
    portada_bucket = ((data.get("portada_bucket") or DEFAULT_BUCKET).strip()) or DEFAULT_BUCKET

    scheduled_for: Optional[str] = data.get("scheduled_for")  # ISO o None
    expires_at: Optional[str] = data.get("expires_at")        # ISO o None

    # Si no hay programación, publicamos ahora
    published_at: Optional[str] = None
    if not scheduled_for:
        published_at = timezone.now().isoformat()

    # Verifica que el usuario exista en Auth (evita error de FK silencioso)
    _assert_user_exists(user_id)

    payload = {
        "titulo": titulo,
        "contenido": contenido,
        "portada_bucket": portada_bucket,
        "portada_path": portada_path,
        "created_by": user_id,
        "published_at": published_at,
        "scheduled_for": scheduled_for,
        "expires_at": expires_at,
    }

    # Insert simple: en esta versión del SDK, insert devuelve lista de filas
    res = (
        supabase_admin
        .table("comunicados")
        .insert(payload)
        .execute()
    )

    # Logs defensivos
    try:
        print("[COMUNICADOS][INSERT] payload:", payload)
        print("[COMUNICADOS][INSERT] raw response:", res)
    except Exception:
        pass

    # Manejo de errores según forma del SDK
    if hasattr(res, "error") and res.error:
        msg = getattr(res.error, "message", str(res.error))
        raise RuntimeError(f"Supabase insert error: {msg}")

    data_out = None
    if hasattr(res, "data"):
        data_out = res.data
    elif isinstance(res, dict):
        # por si res viene como dict crudo
        if res.get("error"):
            raise RuntimeError(f"Supabase insert error: {res['error']}")
        data_out = res.get("data")

    # data suele ser lista de filas insertadas
    if data_out:
        if isinstance(data_out, list):
            if len(data_out) == 0:
                raise RuntimeError("Insert OK pero sin filas devueltas")
            return data_out[0]
        return data_out  # por si ya viene como dict único

    raise RuntimeError("No se recibió data de Supabase al crear el comunicado")
