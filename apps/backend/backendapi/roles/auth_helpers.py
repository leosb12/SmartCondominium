"""
Helpers de autenticación para el módulo de roles

Funciones y decoradores para validar tokens JWT de Supabase
y verificar permisos basados en roles.
"""

from functools import wraps
from typing import Optional
from django.http import JsonResponse
from core.supabase_client import supabase_admin
from .services import user_has_role


def get_user_id_from_request(request) -> Optional[str]:
    """
    Extrae y valida el token JWT del header Authorization
    y devuelve el user_id si es válido.
    
    Args:
        request: Django HttpRequest object
        
    Returns:
        str: user_id de Supabase si el token es válido
        None: si el token es inválido o no existe
    """
    auth_header = request.headers.get("Authorization", "")
    
    if not auth_header.startswith("Bearer "):
        return None
    
    access_token = auth_header.split(" ", 1)[1].strip()
    
    try:
        # Validar token con Supabase usando cliente admin
        # Usamos auth.admin para acceder con privilegios de administrador
        res = supabase_admin.auth.admin.get_user_by_access_token(access_token)
        
        if not res or not hasattr(res, 'user') or not res.user:
            return None
            
        return res.user.id
    except Exception as e:
        print(f"Error validating token: {e}")
        # Intentar método alternativo si el primero falla
        try:
            res = supabase_admin.auth.get_user(access_token)
            user = getattr(res, "user", None)
            
            if not user:
                return None
                
            return getattr(user, "id", None)
        except Exception as e2:
            print(f"Error with alternative method: {e2}")
            return None


def require_auth(view_func):
    """
    Decorador que requiere autenticación válida.
    Inyecta request.user_id en la vista si el token es válido.
    
    Usage:
        @require_auth
        def my_view(request):
            user_id = request.user_id  # Disponible automáticamente
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        user_id = get_user_id_from_request(request)
        
        if not user_id:
            return JsonResponse({
                "success": False,
                "error": "Token de autenticación requerido o inválido"
            }, status=401)
        
        # Inyectar user_id en el request
        request.user_id = user_id
        
        return view_func(request, *args, **kwargs)
    
    return _wrapped_view


def require_role(role_name: str):
    """
    Decorador que requiere que el usuario tenga un rol específico.
    Debe usarse junto con @require_auth.
    
    Args:
        role_name: Nombre del rol requerido (ej: "administrador")
        
    Usage:
        @require_auth
        @require_role("administrador")
        def admin_only_view(request):
            # Solo usuarios con rol administrador pueden acceder
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Verificar que el decorador @require_auth fue aplicado
            if not hasattr(request, 'user_id'):
                return JsonResponse({
                    "success": False,
                    "error": "Error interno: @require_auth debe aplicarse antes de @require_role"
                }, status=500)
            
            # Verificar que el usuario tiene el rol requerido
            if not user_has_role(request.user_id, role_name):
                return JsonResponse({
                    "success": False,
                    "error": f"Acceso denegado. Se requiere rol: {role_name}"
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        
        return _wrapped_view
    return decorator


def require_admin(view_func):
    """
    Decorador de conveniencia para requerir rol de administrador.
    Equivalente a @require_role("administrador")
    
    Usage:
        @require_auth
        @require_admin
        def admin_view(request):
            # Solo administradores pueden acceder
    """
    return require_role("administrador")(view_func)