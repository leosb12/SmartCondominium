"""
Servicios de negocio para la gestión de roles

Contiene toda la lógica para interactuar con las tablas de roles
en Supabase usando el cliente admin.
"""

from typing import List, Dict, Any, Optional, Tuple
from core.supabase_client import supabase_admin, supabase


class RoleService:
    """Servicio para gestión de roles y usuarios"""
    
    @staticmethod
    def get_roles_for_user(user_id: str) -> List[Dict[str, Any]]:
        """
        Obtiene todos los roles asignados a un usuario.
        
        Args:
            user_id: UUID del usuario en Supabase Auth
            
        Returns:
            Lista de diccionarios con {id, nombre} de cada rol
        """
        try:
            result = supabase_admin.table("roles_usuario") \
                .select("rol_id, roles(id, nombre)") \
                .eq("usuario_id", user_id) \
                .execute()
            
            if not result.data:
                return []
            
            roles = []
            for item in result.data:
                role_data = item.get("roles")
                if role_data:
                    roles.append({
                        "id": role_data["id"],
                        "nombre": role_data["nombre"]
                    })
            
            return roles
        except Exception as e:
            print(f"Error obteniendo roles para usuario {user_id}: {e}")
            return []
    
    @staticmethod
    def user_has_role(user_id: str, role_name: str) -> bool:
        """
        Verifica si un usuario tiene un rol específico.
        
        Args:
            user_id: UUID del usuario
            role_name: Nombre del rol a verificar
            
        Returns:
            True si el usuario tiene el rol, False en caso contrario
        """
        try:
            # Obtener los IDs de rol del usuario
            roles_usuario_result = supabase_admin.table("roles_usuario") \
                .select("rol_id") \
                .eq("usuario_id", user_id) \
                .execute()
            
            if not roles_usuario_result.data:
                return False
            
            # Obtener los IDs de rol
            rol_ids = [item["rol_id"] for item in roles_usuario_result.data]
            
            # Verificar si alguno de esos roles tiene el nombre buscado
            roles_result = supabase_admin.table("roles") \
                .select("id") \
                .eq("nombre", role_name) \
                .in_("id", rol_ids) \
                .execute()
            
            return len(roles_result.data) > 0
        except Exception as e:
            print(f"Error verificando rol {role_name} para usuario {user_id}: {e}")
            return False
    
    @staticmethod
    def list_users_with_roles(search: str = "", limit: int = 50, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
        """
        Lista usuarios con sus roles asignados.
        
        Args:
            search: Texto para filtrar por email (opcional)
            limit: Número máximo de resultados
            offset: Offset para paginación
            
        Returns:
            Tupla con (lista_usuarios, total_count)
            Cada usuario tiene formato: {id, email, roles: [{id, nombre}]}
        """
        try:
            # PASO 1: Obtener TODOS los usuarios registrados de Supabase Auth
            try:
                auth_users_result = supabase_admin.auth.admin.list_users()
                print(f"Auth users result type: {type(auth_users_result)}")
                print(f"Auth users result length: {len(auth_users_result) if isinstance(auth_users_result, list) else 'Not a list'}")
                
                # auth_users_result es directamente la lista de usuarios
                if auth_users_result and isinstance(auth_users_result, list):
                    print(f"Users count: {len(auth_users_result)}")
                    auth_users = auth_users_result
                elif auth_users_result and hasattr(auth_users_result, 'users'):
                    print(f"Users count from .users: {len(auth_users_result.users)}")
                    auth_users = auth_users_result.users
                else:
                    print("No users found in auth result")
                    auth_users = []
                    
            except Exception as auth_e:
                print(f"Error getting auth users: {auth_e}")
                # Método alternativo: obtener usuarios desde roles_usuario y luego sus datos
                try:
                    roles_usuario_result = supabase_admin.table("roles_usuario") \
                        .select("usuario_id") \
                        .execute()
                    
                    auth_users = []
                    if roles_usuario_result.data:
                        unique_user_ids = set(item["usuario_id"] for item in roles_usuario_result.data)
                        for user_id in unique_user_ids:
                            try:
                                user_result = supabase_admin.auth.admin.get_user_by_id(user_id)
                                if user_result and hasattr(user_result, 'user') and user_result.user:
                                    auth_users.append(user_result.user)
                            except:
                                continue
                except Exception as fallback_e:
                    print(f"Fallback method also failed: {fallback_e}")
                    return [], 0
            
            if not auth_users:
                print("No auth users found")
                return [], 0
            
            # PASO 2: Obtener todas las relaciones usuario-rol existentes
            roles_usuario_result = supabase_admin.table("roles_usuario") \
                .select("usuario_id, rol_id") \
                .execute()
            
            # PASO 3: Obtener todos los roles disponibles
            roles_result = supabase_admin.table("roles") \
                .select("id, nombre") \
                .execute()
            
            # Crear diccionario de roles por ID
            roles_by_id = {}
            if roles_result.data:
                for role in roles_result.data:
                    roles_by_id[role["id"]] = role
            
            # Crear diccionario de roles por usuario
            user_roles_dict = {}
            if roles_usuario_result.data:
                for item in roles_usuario_result.data:
                    user_id = item["usuario_id"]
                    rol_id = item["rol_id"]
                    
                    if user_id not in user_roles_dict:
                        user_roles_dict[user_id] = []
                    
                    # Agregar rol si existe
                    if rol_id in roles_by_id:
                        user_roles_dict[user_id].append(roles_by_id[rol_id])
            
            # PASO 4: Construir lista de usuarios con sus roles (o sin roles)
            users_list = []
            for auth_user in auth_users:
                user_id = auth_user.id
                email = getattr(auth_user, 'email', f'Usuario {user_id[:8]}...')
                
                # Obtener roles del usuario (o lista vacía si no tiene)
                user_roles = user_roles_dict.get(user_id, [])
                
                users_list.append({
                    "id": user_id,
                    "email": email,
                    "roles": user_roles
                })
                
            print(f"Built users list with {len(users_list)} users")
            
            # PASO 5: Filtrar por search si se proporciona
            if search:
                search_lower = search.lower()
                users_list = [
                    user for user in users_list 
                    if search_lower in user["email"].lower()
                ]
            
            # PASO 6: Aplicar paginación
            total_count = len(users_list)
            
            # Ordenar por email para consistencia
            users_list.sort(key=lambda x: x["email"])
            
            start_idx = offset if offset else 0
            end_idx = (offset + limit) if (offset is not None and limit) else len(users_list)
            paginated_users = users_list[start_idx:end_idx]
            
            return paginated_users, total_count
            
        except Exception as e:
            print(f"Error listando usuarios con roles: {e}")
            return [], 0
    
    @staticmethod
    def assign_role(user_id: str, role_name: str) -> Tuple[bool, str]:
        """
        Asigna un rol a un usuario.
        
        Args:
            user_id: UUID del usuario
            role_name: Nombre del rol a asignar
            
        Returns:
            Tupla (success: bool, message: str)
        """
        try:
            # Verificar que el rol existe
            role_result = supabase_admin.table("roles") \
                .select("id") \
                .eq("nombre", role_name) \
                .single() \
                .execute()
            
            if not role_result.data:
                return False, f"El rol '{role_name}' no existe"
            
            role_id = role_result.data["id"]
            
            # Verificar si ya tiene el rol asignado
            existing = supabase_admin.table("roles_usuario") \
                .select("usuario_id") \
                .eq("usuario_id", user_id) \
                .eq("rol_id", role_id) \
                .execute()
            
            if existing.data:
                return False, f"El usuario ya tiene el rol '{role_name}'"
            
            # Asignar el rol
            supabase_admin.table("roles_usuario") \
                .insert({
                    "usuario_id": user_id,
                    "rol_id": role_id
                }) \
                .execute()
            
            return True, f"Rol '{role_name}' asignado correctamente"
            
        except Exception as e:
            print(f"Error asignando rol {role_name} a usuario {user_id}: {e}")
            return False, f"Error interno: {str(e)}"
    
    @staticmethod
    def remove_role(user_id: str, role_name: str) -> Tuple[bool, str]:
        """
        Remueve un rol de un usuario con salvaguarda para administradores.
        
        Args:
            user_id: UUID del usuario
            role_name: Nombre del rol a remover
            
        Returns:
            Tupla (success: bool, message: str)
        """
        try:
            # Verificar que el rol existe
            role_result = supabase_admin.table("roles") \
                .select("id") \
                .eq("nombre", role_name) \
                .single() \
                .execute()
            
            if not role_result.data:
                return False, f"El rol '{role_name}' no existe"
            
            role_id = role_result.data["id"]
            
            # Verificar si el usuario tiene el rol
            existing = supabase_admin.table("roles_usuario") \
                .select("usuario_id") \
                .eq("usuario_id", user_id) \
                .eq("rol_id", role_id) \
                .execute()
            
            if not existing.data:
                return False, f"El usuario no tiene el rol '{role_name}'"
            
            # Salvaguarda: No permitir eliminar el último administrador
            if role_name == "administrador":
                admin_count = supabase_admin.table("roles_usuario") \
                    .select("usuario_id", count="exact") \
                    .eq("roles.nombre", "administrador") \
                    .execute()
                
                if admin_count.count <= 1:
                    return False, "No se puede eliminar el último administrador del sistema"
            
            # Remover el rol
            supabase_admin.table("roles_usuario") \
                .delete() \
                .eq("usuario_id", user_id) \
                .eq("rol_id", role_id) \
                .execute()
            
            return True, f"Rol '{role_name}' removido correctamente"
            
        except Exception as e:
            print(f"Error removiendo rol {role_name} de usuario {user_id}: {e}")
            return False, f"Error interno: {str(e)}"
    
    @staticmethod
    def get_all_roles() -> List[Dict[str, Any]]:
        """
        Obtiene todos los roles disponibles en el sistema.
        
        Returns:
            Lista de diccionarios con {id, nombre} de cada rol
        """
        try:
            result = supabase_admin.table("roles") \
                .select("id, nombre") \
                .order("nombre") \
                .execute()
            
            return result.data or []
        except Exception as e:
            print(f"Error obteniendo todos los roles: {e}")
            return []


# Funciones de conveniencia para importar directamente
def get_roles_for_user(user_id: str) -> List[Dict[str, Any]]:
    """Función de conveniencia para obtener roles de un usuario"""
    return RoleService.get_roles_for_user(user_id)


def user_has_role(user_id: str, role_name: str) -> bool:
    """Función de conveniencia para verificar si un usuario tiene un rol"""
    return RoleService.user_has_role(user_id, role_name)


def list_users_with_roles(search: str = "", limit: int = 50, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
    """Función de conveniencia para listar usuarios con roles"""
    return RoleService.list_users_with_roles(search, limit, offset)


def assign_role(user_id: str, role_name: str) -> Tuple[bool, str]:
    """Función de conveniencia para asignar un rol"""
    return RoleService.assign_role(user_id, role_name)


def remove_role(user_id: str, role_name: str) -> Tuple[bool, str]:
    """Función de conveniencia para remover un rol"""
    return RoleService.remove_role(user_id, role_name)


def get_all_roles() -> List[Dict[str, Any]]:
    """Función de conveniencia para obtener todos los roles"""
    return RoleService.get_all_roles()