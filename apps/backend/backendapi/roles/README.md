# Módulo de Gestión de Roles - SmartCondominium

## Descripción

Módulo profesional para la gestión de roles y usuarios integrado con Supabase Auth y Django REST Framework. Proporciona un sistema completo de autorización basado en roles.

## Estructura del Módulo

```
backendapi/roles/
├── __init__.py          # Inicialización del módulo
├── auth_helpers.py      # Utilidades de autenticación JWT
├── services.py          # Lógica de negocio con Supabase
├── serializers.py       # Serializers de DRF
├── permissions.py       # Clases de permisos personalizados
├── views.py            # ViewSets y APIViews
└── urls.py             # Configuración de rutas
```

## Funcionalidades Principales

### 🔐 Autenticación y Autorización
- Validación de tokens JWT de Supabase
- Decoradores para proteger vistas: `@require_auth`, `@require_role`, `@require_admin`
- Clases de permisos DRF: `IsAdminRole`, `HasRolePermission`, `IsOwnerOrAdmin`

### 👥 Gestión de Usuarios y Roles
- Listar usuarios con paginación y filtros
- Asignar/remover roles con validaciones
- Consultar roles de usuarios (propios o de otros si es admin)
- Salvaguardas para no eliminar el último administrador

### 📊 API REST Completa
- Endpoints con documentación OpenAPI/Swagger
- Paginación automática con `PageNumberPagination`
- Respuestas consistentes con serializers dedicados
- Manejo de errores estructurado

## Endpoints Disponibles

### 🔧 API de Gestión (Solo Administradores)

```
GET  /api/roles/management/users/          # Listar usuarios con roles
POST /api/roles/management/assign/         # Asignar rol a usuario
POST /api/roles/management/remove/         # Remover rol de usuario  
GET  /api/roles/management/available/      # Listar roles disponibles
```

### 👤 API de Consulta de Roles

```
GET  /api/roles/user/?user_id=UUID         # Ver roles de usuario específico
GET  /api/roles/me/                        # Ver mis propios roles
```

## Ejemplos de Uso

### Listar usuarios con roles (con filtros y paginación)
```http
GET /api/roles/management/users/?search=john&page=1&page_size=20
Authorization: Bearer <supabase-jwt-token>
```

### Asignar rol de administrador
```http
POST /api/roles/management/assign/
Content-Type: application/json
Authorization: Bearer <supabase-jwt-token>

{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "role_name": "administrador"
}
```

### Ver mis propios roles
```http
GET /api/roles/me/
Authorization: Bearer <supabase-jwt-token>
```

## Integración con Supabase

### Tablas Requeridas
- `public.roles`: Tabla de roles disponibles
- `public.roles_usuario`: Tabla de relación usuario-rol

### Clientes Supabase
- `supabase_admin`: Cliente con privilegios administrativos para operaciones CRUD
- `supabase`: Cliente regular para operaciones de usuario

## Permisos y Seguridad

### Niveles de Acceso
1. **Usuario Autenticado**: Puede ver sus propios roles
2. **Administrador**: Acceso completo a gestión de roles y usuarios

### Validaciones de Seguridad
- Verificación de tokens JWT válidos
- Validación de UUIDs de usuario
- Prevención de eliminación del último administrador
- Verificación de existencia de roles antes de asignar/remover

## Arquitectura

### Separación de Responsabilidades
- **auth_helpers.py**: Manejo de autenticación JWT
- **services.py**: Lógica de negocio y operaciones con BD
- **permissions.py**: Control de acceso granular
- **serializers.py**: Validación y serialización de datos
- **views.py**: Lógica de presentación y endpoints
- **urls.py**: Configuración de rutas

### Patrones Implementados
- **Service Layer**: Abstracción de la lógica de negocio
- **Repository Pattern**: Acceso consistente a datos
- **Decorator Pattern**: Protección de vistas con decoradores
- **Factory Pattern**: Creación dinámica de permisos

## Testing y Documentación

### Swagger/OpenAPI
- Documentación automática con `drf-spectacular`
- Esquemas detallados para cada endpoint
- Ejemplos de request/response

### Manejo de Errores
- Respuestas consistentes con formato estándar
- Logging de errores para debugging
- Validaciones comprensivas con mensajes claros

## Extensibilidad

### Agregar Nuevos Roles
1. Insertar en tabla `public.roles`
2. Crear permiso específico con `create_role_permission()`
3. Usar en vistas con `permission_classes`

### Permisos Personalizados
```python
from backendapi.roles.permissions import create_role_permission

# Crear permiso para rol específico
IsManagerRole = create_role_permission('manager')

# Usar en vista
class MyView(APIView):
    permission_classes = [IsManagerRole]
```

### Decoradores en Vistas Funcionales
```python
from backendapi.roles.auth_helpers import require_role

@require_role('administrador')
def my_admin_view(request):
    # Solo administradores pueden acceder
    pass
```

## Configuración

### Settings Requeridos
- Configuración de Supabase en `core/supabase_client.py`
- `SUPABASE_URL` y `SUPABASE_ANON_KEY` en variables de entorno
- `SUPABASE_SERVICE_ROLE_KEY` para operaciones administrativas

### Dependencias
- Django REST Framework
- drf-spectacular (documentación OpenAPI)
- supabase-py (cliente Python de Supabase)

---

**Autor**: Sistema de gestión SmartCondominium
**Versión**: 1.0
**Última actualización**: Diciembre 2024