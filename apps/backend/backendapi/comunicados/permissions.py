# backendapi/comunicados/permissions.py
from rest_framework.permissions import BasePermission
from django.http import HttpRequest
from backendapi.roles.auth_helpers import get_user_id_from_request, user_has_role  # usa tu helper real


class IsAdminSupabase(BasePermission):
    """Permiso DRF: requiere token válido y rol 'administrador'."""

    message = "Acceso denegado. Se requiere rol administrador."

    def has_permission(self, request: HttpRequest, view) -> bool:
        user_id = get_user_id_from_request(request)
        if not user_id:
            self.message = "Token de autenticación requerido o inválido"
            return False

        # Guardamos el user_id para que la vista lo use (igual que tus decoradores)
        setattr(request, "user_id", user_id)

        try:
            return user_has_role(user_id, "administrador")
        except Exception:
            # Si falla el servicio de roles, denegamos por seguridad
            self.message = "No se pudieron verificar los permisos"
            return False
