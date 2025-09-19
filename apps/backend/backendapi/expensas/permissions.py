from rest_framework.permissions import BasePermission
from core.supabase_client import supabase_admin as sb

ROLE_ADMIN = 1  # ajusta a tu catálogo

def _is_admin(user_uuid: str) -> bool:
    if not user_uuid:
        return False
    res = sb.table("roles_usuario").select("rol_id").eq("user_id", user_uuid).limit(1).execute()
    rows = getattr(res, "data", []) or []
    return any(r.get("rol_id") == ROLE_ADMIN for r in rows)

class IsAdminRole(BasePermission):
    message = "Solo el Administrador puede realizar esta acción."
    def has_permission(self, request, view):
        return _is_admin(request.headers.get("X-User-Id"))
