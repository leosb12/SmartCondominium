"""
Serializers para la gestión de roles

Define los serializers de Django REST Framework para las operaciones
de roles y usuarios.
"""

from rest_framework import serializers
from typing import Dict, Any


class RoleSerializer(serializers.Serializer):
    """Serializer para representar un rol"""
    
    id = serializers.IntegerField(read_only=True)
    nombre = serializers.CharField(max_length=50, read_only=True)
    
    class Meta:
        fields = ['id', 'nombre']


class UserRoleSerializer(serializers.Serializer):
    """Serializer para representar un usuario con sus roles"""
    
    id = serializers.CharField(read_only=True, help_text="UUID del usuario en Supabase Auth")
    email = serializers.EmailField(read_only=True, help_text="Email del usuario")
    roles = RoleSerializer(many=True, read_only=True, help_text="Lista de roles asignados")
    
    class Meta:
        fields = ['id', 'email', 'roles']


class AssignRoleSerializer(serializers.Serializer):
    """Serializer para asignar un rol a un usuario"""
    
    user_id = serializers.CharField(
        max_length=36,
        help_text="UUID del usuario al que se asignará el rol"
    )
    role_name = serializers.CharField(
        max_length=50,
        help_text="Nombre del rol a asignar (ej: 'administrador', 'propietario')"
    )
    
    def validate_user_id(self, value):
        """Validar formato UUID básico"""
        if not value or len(value) < 32:
            raise serializers.ValidationError("ID de usuario inválido")
        return value
    
    def validate_role_name(self, value):
        """Validar que el nombre del rol no esté vacío"""
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre del rol es requerido")
        return value.strip().lower()
    
    class Meta:
        fields = ['user_id', 'role_name']


class RemoveRoleSerializer(serializers.Serializer):
    """Serializer para remover un rol de un usuario"""
    
    user_id = serializers.CharField(
        max_length=36,
        help_text="UUID del usuario del que se removerá el rol"
    )
    role_name = serializers.CharField(
        max_length=50,
        help_text="Nombre del rol a remover"
    )
    
    def validate_user_id(self, value):
        """Validar formato UUID básico"""
        if not value or len(value) < 32:
            raise serializers.ValidationError("ID de usuario inválido")
        return value
    
    def validate_role_name(self, value):
        """Validar que el nombre del rol no esté vacío"""
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre del rol es requerido")
        return value.strip().lower()
    
    class Meta:
        fields = ['user_id', 'role_name']


class UserRolesResponseSerializer(serializers.Serializer):
    """Serializer para la respuesta de roles de un usuario específico"""
    
    user_id = serializers.CharField(read_only=True)
    roles = RoleSerializer(many=True, read_only=True)
    
    class Meta:
        fields = ['user_id', 'roles']


class PaginatedUsersResponseSerializer(serializers.Serializer):
    """Serializer para respuesta paginada de usuarios con roles"""
    
    count = serializers.IntegerField(
        read_only=True,
        help_text="Total de usuarios que coinciden con los filtros"
    )
    next = serializers.CharField(
        allow_null=True,
        read_only=True,
        help_text="URL de la siguiente página (si existe)"
    )
    previous = serializers.CharField(
        allow_null=True,
        read_only=True,
        help_text="URL de la página anterior (si existe)"
    )
    results = UserRoleSerializer(
        many=True,
        read_only=True,
        help_text="Lista de usuarios con sus roles"
    )
    
    class Meta:
        fields = ['count', 'next', 'previous', 'results']


class RoleOperationResponseSerializer(serializers.Serializer):
    """Serializer para respuestas de operaciones de roles (asignar/remover)"""
    
    success = serializers.BooleanField(read_only=True)
    message = serializers.CharField(read_only=True)
    user_id = serializers.CharField(read_only=True, allow_null=True)
    role_name = serializers.CharField(read_only=True, allow_null=True)
    
    class Meta:
        fields = ['success', 'message', 'user_id', 'role_name']


class ErrorResponseSerializer(serializers.Serializer):
    """Serializer para respuestas de error consistentes"""
    
    error = serializers.CharField(read_only=True)
    detail = serializers.CharField(read_only=True, allow_null=True)
    
    class Meta:
        fields = ['error', 'detail']


class ListUsersQuerySerializer(serializers.Serializer):
    """Serializer para validar query parameters en el listado de usuarios"""
    
    search = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
        help_text="Filtrar usuarios por email"
    )
    page = serializers.IntegerField(
        required=False,
        min_value=1,
        default=1,
        help_text="Número de página"
    )
    page_size = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=100,
        default=20,
        help_text="Elementos por página (máximo 100)"
    )
    
    class Meta:
        fields = ['search', 'page', 'page_size']


class AllRolesResponseSerializer(serializers.Serializer):
    """Serializer para la respuesta con todos los roles disponibles"""
    
    roles = RoleSerializer(many=True, read_only=True)
    
    class Meta:
        fields = ['roles']