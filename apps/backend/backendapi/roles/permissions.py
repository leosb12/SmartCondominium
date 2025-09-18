"""
Permisos personalizados para la gestión de roles

Define las clases de permisos de Django REST Framework
para controlar el acceso basado en roles.
"""

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import View
from .auth_helpers import get_user_id_from_request
from .services import user_has_role


class IsAuthenticated(BasePermission):
    """
    Permiso que requiere que el usuario esté autenticado vía JWT.
    Versión personalizada que usa nuestro sistema de auth con Supabase.
    """
    
    def has_permission(self, request: Request, view: View) -> bool:
        """
        Verifica si el request tiene un JWT válido.
        """
        try:
            user_id = get_user_id_from_request(request)
            return user_id is not None
        except Exception:
            return False


class IsAdminRole(BasePermission):
    """
    Permiso que requiere que el usuario tenga el rol de 'administrador'.
    """
    
    def has_permission(self, request: Request, view: View) -> bool:
        """
        Verifica si el usuario autenticado tiene rol de administrador.
        """
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                return False
            
            return user_has_role(user_id, 'administrador')
        except Exception:
            return False


class HasRolePermission(BasePermission):
    """
    Permiso genérico para verificar roles específicos.
    Debe ser subclasseado definiendo `required_role`.
    """
    
    required_role = None  # Debe ser sobrescrito en subclases
    
    def has_permission(self, request: Request, view: View) -> bool:
        """
        Verifica si el usuario tiene el rol requerido.
        """
        if not self.required_role:
            raise NotImplementedError(
                "HasRolePermission debe definir 'required_role' o ser subclasseado"
            )
        
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                return False
            
            return user_has_role(user_id, self.required_role)
        except Exception:
            return False


class IsPropietarioRole(HasRolePermission):
    """
    Permiso que requiere rol de 'propietario'.
    """
    required_role = 'propietario'


class IsAdministradorRole(HasRolePermission):
    """
    Permiso que requiere rol de 'administrador'.
    Alternativa a IsAdminRole usando la clase base genérica.
    """
    required_role = 'administrador'


class IsPorteroRole(HasRolePermission):
    """
    Permiso que requiere rol de 'portero'.
    """
    required_role = 'portero'


class HasAnyRole(BasePermission):
    """
    Permiso que verifica si el usuario tiene al menos uno de los roles especificados.
    Útil para endpoints que pueden ser accedidos por múltiples tipos de usuario.
    """
    
    allowed_roles = []  # Debe ser definido en la vista o subclase
    
    def __init__(self, allowed_roles=None):
        """
        Permite inicializar con roles específicos.
        
        Args:
            allowed_roles: Lista de nombres de roles permitidos
        """
        if allowed_roles:
            self.allowed_roles = allowed_roles
        super().__init__()
    
    def has_permission(self, request: Request, view: View) -> bool:
        """
        Verifica si el usuario tiene al menos uno de los roles permitidos.
        """
        allowed_roles = getattr(view, 'allowed_roles', self.allowed_roles)
        
        if not allowed_roles:
            raise NotImplementedError(
                "HasAnyRole requiere definir 'allowed_roles' en la vista o instancia"
            )
        
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                return False
            
            # Verificar si tiene alguno de los roles permitidos
            for role in allowed_roles:
                if user_has_role(user_id, role):
                    return True
            
            return False
        except Exception:
            return False


class IsOwnerOrAdmin(BasePermission):
    """
    Permiso que permite acceso si el usuario es el propietario del recurso
    o tiene rol de administrador.
    
    Requiere que la vista implemente get_object_owner_id() o tenga
    lookup_field configurado para obtener el ID del propietario.
    """
    
    def has_permission(self, request: Request, view: View) -> bool:
        """
        Verificación a nivel de vista - debe estar autenticado.
        """
        try:
            user_id = get_user_id_from_request(request)
            return user_id is not None
        except Exception:
            return False
    
    def has_object_permission(self, request: Request, view: View, obj) -> bool:
        """
        Verificación a nivel de objeto - debe ser propietario o admin.
        """
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                return False
            
            # Verificar si es administrador (acceso total)
            if user_has_role(user_id, 'administrador'):
                return True
            
            # Obtener ID del propietario del objeto
            owner_id = None
            
            # Método personalizado en la vista
            if hasattr(view, 'get_object_owner_id'):
                owner_id = view.get_object_owner_id(obj)
            
            # Atributo directo del objeto
            elif hasattr(obj, 'owner_id'):
                owner_id = obj.owner_id
            elif hasattr(obj, 'user_id'):
                owner_id = obj.user_id
            elif hasattr(obj, 'usuario_id'):
                owner_id = obj.usuario_id
            
            # Verificar si es el propietario
            return owner_id == user_id
            
        except Exception:
            return False


# Funciones de conveniencia para crear permisos personalizados

def create_role_permission(role_name: str):
    """
    Factory function para crear permisos de rol específicos.
    
    Args:
        role_name: Nombre del rol requerido
        
    Returns:
        Clase de permiso que requiere el rol especificado
    """
    class CustomRolePermission(HasRolePermission):
        required_role = role_name
    
    CustomRolePermission.__name__ = f'Is{role_name.title()}Role'
    return CustomRolePermission


def create_multi_role_permission(role_names: list):
    """
    Factory function para crear permisos que aceptan múltiples roles.
    
    Args:
        role_names: Lista de nombres de roles permitidos
        
    Returns:
        Clase de permiso que acepta cualquiera de los roles especificados
    """
    class CustomMultiRolePermission(HasAnyRole):
        allowed_roles = role_names
    
    roles_str = '_or_'.join(role_names)
    CustomMultiRolePermission.__name__ = f'Is{roles_str.title()}Role'
    return CustomMultiRolePermission