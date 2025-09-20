# Reservas Module - Gestión de Áreas Sociales

Este módulo implementa un sistema completo de gestión de reservas para áreas sociales del condominio, siguiendo los casos de uso CU-17, CU-18 y CU-19.

## Características Principales

### 1. Gestión de Áreas Sociales (Solo Administradores)
- ✅ CRUD completo de áreas sociales
- ✅ Control de estado (activo/inactivo)
- ✅ Capacidad máxima configurable
- ✅ Descripciones detalladas

### 2. Sistema de Reservas (Usuarios Autenticados)
- ✅ Creación de reservas con validación automática
- ✅ Prevención de solapamientos temporales
- ✅ Cálculo automático de costos
- ✅ Estados: confirmada, cancelada, completada
- ✅ Control de permisos (propietario + admin)

### 3. Validaciones Automáticas (Triggers PostgreSQL)
- ✅ No solapamiento de reservas para la misma área
- ✅ Duración mínima: 1 hora
- ✅ Duración máxima: 24 horas
- ✅ No reservas en el pasado
- ✅ Solo áreas activas pueden reservarse
- ✅ Cálculo automático de costo por duración

## Estructura del Módulo

```
reservas/
├── __init__.py
├── urls.py              # Rutas del módulo
├── views.py             # Controladores con autenticación
├── services.py          # Lógica de negocio
├── repositories.py      # Acceso a datos (Supabase)
├── serializers.py       # Serialización de datos
├── management/          # Comandos Django
│   └── commands/
│       └── setup_reservas.py
└── sql/                 # Scripts de base de datos
    ├── create_tables.sql
    ├── create_triggers.sql
    ├── sample_data.sql
    └── setup.sql
```

## Endpoints API

### Áreas Sociales (Admin Only)
- `GET /api/reservas/areas-sociales/` - Listar áreas sociales
- `POST /api/reservas/areas-sociales/` - Crear área social
- `GET /api/reservas/areas-sociales/{id}/` - Obtener área social
- `PUT /api/reservas/areas-sociales/{id}/` - Actualizar área social
- `DELETE /api/reservas/areas-sociales/{id}/` - Eliminar área social

### Reservas (Authenticated Users)
- `GET /api/reservas/reservas/` - Listar todas las reservas
- `POST /api/reservas/reservas/` - Crear reserva
- `GET /api/reservas/reservas/{id}/` - Obtener reserva
- `PUT /api/reservas/reservas/{id}/` - Actualizar reserva (propietario/admin)
- `DELETE /api/reservas/reservas/{id}/` - Eliminar reserva (propietario/admin)
- `GET /api/reservas/mis-reservas/` - Reservas del usuario actual

## Modelos de Datos

### Area Social
```json
{
  "id": 1,
  "nombre": "Salón de Eventos",
  "descripcion": "Salón principal para eventos y celebraciones",
  "capacidad_maxima": 100,
  "activo": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Reserva
```json
{
  "id": 1,
  "area_social_id": 1,
  "area_social_nombre": "Salón de Eventos",
  "propietario_username": "user1",
  "fecha_inicio": "2024-12-25T18:00:00Z",
  "fecha_fin": "2024-12-25T23:00:00Z",
  "estado": "confirmada",
  "observaciones": "Celebración de Navidad",
  "costo": 250.00,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## Instalación y Configuración

### 1. Configuración de Base de Datos
Ejecuta los siguientes archivos SQL en tu panel de Supabase en orden:

```sql
-- 1. Crear tablas y constraints
\i create_tables.sql

-- 2. Crear triggers y funciones
\i create_triggers.sql

-- 3. Insertar datos de ejemplo (opcional)
\i sample_data.sql
```

### 2. Comando de Gestión Django
```bash
python manage.py setup_reservas
```

### 3. URLs Configuradas
El módulo ya está incluido en `backendapi/urls.py`:
```python
path("reservas/", include("backendapi.reservas.urls")),
```

## Reglas de Negocio Implementadas

### Validaciones Automáticas (Triggers)
1. **No Solapamiento**: Constraint de exclusión PostgreSQL evita reservas superpuestas
2. **Duración Válida**: Mínimo 1 hora, máximo 24 horas
3. **Fechas Futuras**: No se permiten reservas en el pasado
4. **Áreas Activas**: Solo áreas sociales activas pueden reservarse
5. **Costo Automático**: $50 por hora (configurable en trigger)

### Permisos y Autenticación
1. **Áreas Sociales**: Solo administradores pueden gestionar
2. **Reservas**: Usuarios autenticados pueden crear
3. **Modificación**: Solo propietario o admin puede modificar/eliminar
4. **Listado**: Usuarios ven todas las reservas, endpoint especial para propias

## Casos de Uso Implementados

### CU-17: Gestionar Áreas Sociales
- ✅ Crear, leer, actualizar, eliminar áreas sociales
- ✅ Solo accesible por administradores
- ✅ Validación de datos obligatorios

### CU-18: Realizar Reserva
- ✅ Selección de área social disponible
- ✅ Definición de fecha y hora
- ✅ Validación automática de disponibilidad
- ✅ Cálculo de costo automático

### CU-19: Consultar Reservas
- ✅ Lista completa de reservas (todos los usuarios)
- ✅ Reservas propias del usuario
- ✅ Detalles completos de cada reserva
- ✅ Información del área social asociada

## Extensibilidad

El módulo está diseñado para ser fácilmente extensible:

1. **Nuevas Validaciones**: Agregar triggers o funciones PostgreSQL
2. **Tipos de Área**: Extensible con campos adicionales
3. **Estados de Reserva**: Enum fácilmente modificable
4. **Cálculo de Costos**: Función PostgreSQL personalizable
5. **Notificaciones**: Hooks disponibles en services.py

## Pruebas

### Datos de Ejemplo Incluidos
- 8 áreas sociales predefinidas
- 4 reservas de ejemplo
- Diferentes estados y usuarios

### Casos de Prueba Recomendados
1. Crear reserva válida
2. Intentar solapamiento (debe fallar)
3. Reserva muy corta/larga (debe fallar)
4. Reserva en el pasado (debe fallar)
5. Modificar reserva propia vs ajena
6. Admin vs usuario regular permisos

## Integración con Frontend

El módulo está listo para integración con React/TypeScript siguiendo el mismo patrón que otros módulos:

1. Crear `reservasService.ts` similar a `financeService.ts`
2. Usar `getAuthHeaders()` para autenticación
3. Componentes para áreas sociales (admin) y reservas (usuarios)
4. Calendario/agenda para visualización de disponibilidad

## Monitoreo y Logs

- Todos los errores se registran con stack traces
- Operaciones de base de datos trackeadas
- Timestamps automáticos en todas las operaciones
- Estados de respuesta consistentes