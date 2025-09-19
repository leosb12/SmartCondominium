"""
Permisos para el módulo de administración de finanzas

Utiliza los helpers de autenticación existentes para verificar
que solo los administradores puedan acceder a estas funcionalidades.
"""

from django.http import JsonResponse
from functools import wraps
from ..roles.auth_helpers import get_user_id_from_request
from ..roles.services import user_has_role


def admin_required(view_func):
    """
    Decorador que requiere que el usuario sea administrador.
    
    Verifica:
    1. Token de autenticación válido
    2. Usuario tenga rol de administrador
    
    Returns:
        403 si no es admin o no está autenticado
        401 si el token es inválido
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Obtener user_id del token
        user_id = get_user_id_from_request(request)
        
        if not user_id:
            return JsonResponse({
                "success": False,
                "error": "Token de autenticación requerido o inválido"
            }, status=401)
        
        # Verificar que el usuario tenga rol de administrador
        if not user_has_role(user_id, 'administrador'):
            return JsonResponse({
                "success": False,
                "error": "Acceso denegado. Se requiere rol de administrador."
            }, status=403)
        
        # Inyectar user_id en el request para uso posterior
        request.user_id = user_id
        
        return view_func(request, *args, **kwargs)
    
    return _wrapped_view


def is_admin(request) -> bool:
    """
    Función helper para verificar si un request es de un administrador.
    
    Args:
        request: Django HttpRequest object
        
    Returns:
        bool: True si el usuario es administrador, False en caso contrario
    """
    user_id = get_user_id_from_request(request)
    
    if not user_id:
        return False
    
    return user_has_role(user_id, 'administrador')