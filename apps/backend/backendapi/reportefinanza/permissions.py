# backendapi/reportefinanza/permissions.py
from rest_framework.permissions import BasePermission
from core.supabase_client import supabase_admin as sb
import jwt

ADMIN_ROLE_ID = 1

class IsAdminByBearer(BasePermission):
    """
    Extrae el user_id desde el token Bearer (JWT) enviado en Authorization:
    Bearer <token>
    y valida que exista una fila en roles_usuario con rol_id == ADMIN_ROLE_ID.
    """

    message = "Solo el administrador puede generar reportes financieros."

    def _get_token_sub(self, token: str):
        # Notamos que supabase usa JWT; para obtener el sub (user UUID)
        # podemos decodificar sin verificar la firma: jwt.decode(..., options={"verify_signature": False})
        # Si querés verificar la firma, habría que obtener JWKS y validar; aquí asumimos
        # ambiente de desarrollo local y confianza en el token.
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload.get("sub") or payload.get("user_id")
        except Exception:
            return None

    def has_permission(self, request, view):
        auth = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
        if not auth or not auth.startswith("Bearer "):
            self.message = "Falta token Bearer en Authorization."
            return False

        token = auth.split(" ", 1)[1]
        user_id = self._get_token_sub(token)
        if not user_id:
            self.message = "Token inválido o no se pudo extraer user_id."
            return False

        # Consulta tabla roles_usuario para verificar rol
        try:
            res = sb.table("roles_usuario").select("rol_id").eq("usuario_id", user_id).execute()
            rows = res.data or []
            for r in rows:
                if int(r.get("rol_id", 0)) == ADMIN_ROLE_ID:
                    return True
            self.message = "El usuario no tiene rol de administrador."
            return False
        except Exception as e:
            self.message = f"Error validando roles: {e}"
            return False
