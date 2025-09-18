"""
URLs para el módulo de gestión de roles

Define las rutas para las APIs de roles y usuarios.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleManagementViewSet, UserRolesView, MyRolesView

# Router para ViewSets
router = DefaultRouter()
router.register(r'management', RoleManagementViewSet, basename='role-management')

# Patrón de URLs del módulo
urlpatterns = [
    # Rutas del router (ViewSet)
    path('', include(router.urls)),
    
    # Rutas adicionales (APIViews)
    path('user/', UserRolesView.as_view(), name='user-roles'),
    path('me/', MyRolesView.as_view(), name='my-roles'),
]

"""
Estructura de endpoints resultante:

API de gestión (solo administradores):
- GET  /api/roles/management/users/          -> Listar usuarios con roles (paginado, con filtros)
- POST /api/roles/management/assign/         -> Asignar rol a usuario
- POST /api/roles/management/remove/         -> Remover rol de usuario  
- GET  /api/roles/management/available/      -> Listar roles disponibles

API de consulta de roles:
- GET  /api/roles/user/?user_id=UUID         -> Ver roles de usuario específico (admin) o propio
- GET  /api/roles/me/                        -> Ver mis propios roles (usuario autenticado)

Ejemplos de uso:

1. Listar usuarios con roles (admin):
   GET /api/roles/management/users/?search=john&page=1&page_size=20

2. Asignar rol de administrador:
   POST /api/roles/management/assign/
   {
     "user_id": "123e4567-e89b-12d3-a456-426614174000",
     "role_name": "administrador"
   }

3. Ver mis propios roles:
   GET /api/roles/me/
   
4. Ver roles de otro usuario (admin):
   GET /api/roles/user/?user_id=123e4567-e89b-12d3-a456-426614174000
"""