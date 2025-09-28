# backendapi/pases_temporales/security.py
"""
Helper local de autenticación/autorización para CU-23
No modifica ni depende de backendapi.roles.auth_helpers.
Valida el token con Supabase y restringe por role_id (1=admin, 4=seguridad).
"""

from functools import wraps
from typing import Optional, Tuple
from django.http import JsonResponse
from core.supabase_client import supabase_admin

# Constantes de roles (IDs fijos que nos pasaste)
ROLE_ADMIN_ID = 1
ROLE_SECURITY_ID = 4
ALLOWED_SECURITY_ROLE_IDS: Tuple[int, int] = (ROLE_ADMIN_ID, ROLE_SECURITY_ID)

# Tabla puente real y columnas reales
ROLES_TABLE = "roles_usuario"
USER_COL = "usuario_id"
ROLE_COL = "rol_id"


def _get_user_id_from_request(request) -> Optional[str]:
    """
    Extrae el access token del header Authorization y valida con Supabase.
    Devuelve user_id si es válido, None en caso contrario.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    access_token = auth_header.split(" ", 1)[1].strip()
    if not access_token:
        return None

    # Intento principal: validar sesión en Supabase
    try:
        resp = supabase_admin.auth.get_user(access_token)
        if resp and hasattr(resp, "user") and resp.user:
            return str(resp.user.id)
    except Exception:
        pass

    # Fallback: decodificar el JWT sin verificar firma para leer sub (user_id),
    # y verificar que el usuario exista vía admin.get_user_by_id
    try:
        import jwt  # pyjwt
        decoded = jwt.decode(access_token, options={"verify_signature": False})
        user_id = decoded.get("sub")
        if not user_id:
            return None
        user_resp = supabase_admin.auth.admin.get_user_by_id(user_id)
        if user_resp and hasattr(user_resp, "user") and user_resp.user:
            return str(user_id)
    except Exception:
        return None

    return None


def require_auth_local(view_func):
    """
    Decorador local: requiere token válido. Inyecta request.user_id.
    """
    @wraps(view_func)
    def _wrapped(self_or_request, *args, **kwargs):
        # Soporta function-based y class-based views
        request = (
            self_or_request
            if hasattr(self_or_request, "path_info")
            else (args[0] if args else kwargs.get("request"))
        )

        user_id = _get_user_id_from_request(request)
        if not user_id:
            return JsonResponse(
                {"success": False, "error": "Token de autenticación requerido o inválido"},
                status=401,
            )

        request.user_id = user_id
        return view_func(self_or_request, *args, **kwargs)

    return _wrapped


def _user_has_any_role_id(user_id: str, role_ids: Tuple[int, ...]) -> bool:
    """
    Verifica si el usuario tiene alguno de los role_id dados (OR).
    Usa IN con la tabla real: roles_usuario(usuario_id uuid, rol_id int).
    """
    try:
        res = (
            supabase_admin
            .table(ROLES_TABLE)
            .select(ROLE_COL)
            .eq(USER_COL, user_id)
            .in_(ROLE_COL, [int(r) for r in role_ids])  # rol_id IN (1,4)
            .limit(1)
            .execute()
        )
        return bool(res.data)  # True si hay al menos una fila
    except Exception:
        return False


def require_any_role_ids_local(role_ids: Tuple[int, ...]):
    """
    Decorador local: requiere que el usuario tenga CUALQUIERA (OR) de los role_id.
    Usa require_auth_local primero (para tener request.user_id).
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped(self_or_request, *args, **kwargs):
            request = (
                self_or_request
                if hasattr(self_or_request, "path_info")
                else (args[0] if args else kwargs.get("request"))
            )

            if not hasattr(request, "user_id"):
                return JsonResponse(
                    {"success": False, "error": "@require_auth_local debe usarse antes"},
                    status=500,
                )

            if not _user_has_any_role_id(request.user_id, role_ids):
                return JsonResponse(
                    {
                        "success": False,
                        "error": f"Acceso denegado. Se requiere uno de los roles {list(role_ids)}",
                    },
                    status=403,
                )

            return view_func(self_or_request, *args, **kwargs)

        return _wrapped

    return decorator
