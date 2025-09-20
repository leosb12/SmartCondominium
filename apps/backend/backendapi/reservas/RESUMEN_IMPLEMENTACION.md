# Módulo de Reservas - Resumen de Implementación

## Validaciones de Seguridad Implementadas

### ✅ Estado de Usuario Habitante
- Solo usuarios con `estado = 1` en la tabla `usuario_habitante` pueden crear reservas
- Se valida en el backend antes de crear la reserva
- Se valida también en los triggers de base de datos

### ✅ Validación de Propiedades
- Los usuarios solo pueden crear reservas para propiedades donde son habitantes/propietarios activos
- Se verifica la relación usuario-propiedad a través de la tabla `usuario_habitante`
- Se usa el email del usuario (desde Supabase Auth) para hacer la validación

### ✅ Prevención de Solapamientos
- Constraint de base de datos que previene reservas solapadas para la misma área en la misma fecha
- Validación de rangos de horas usando PostgreSQL `int4range`

## Endpoints Disponibles

### Para Administradores (@require_admin)
- `GET/POST /api/reservas/areas-sociales/` - Gestionar áreas sociales
- `GET/PUT/DELETE /api/reservas/areas-sociales/{id}/` - CRUD área social específica

### Para Usuarios Autenticados (@require_auth)
- `GET/POST /api/reservas/reservas/` - Listar/crear reservas
- `GET/PUT/DELETE /api/reservas/reservas/{id}/` - CRUD reserva específica
- `GET /api/reservas/mis-reservas/` - Reservas del usuario actual
- `GET /api/reservas/mis-propiedades/` - Propiedades del usuario (solo estado=1)
- `GET /api/reservas/areas-disponibles/` - Áreas sociales disponibles
- `GET /api/reservas/horas/` - Catálogo de horas (0-23)

## Estructura de Datos para Crear Reserva (POST)

```json
{
    "area_social_id": 1,
    "propiedad_id": 2,
    "fecha": "2024-12-25",
    "hora_inicio_id": 18,
    "hora_fin_id": 22
}
```

## Validaciones Automatizadas por Triggers

1. **Cálculo de Total**: Se calcula automáticamente basado en `precioxhora` del área social
2. **Timestamps**: `created_at` se setea automáticamente
3. **Fecha de Vencimiento**: Se setea automáticamente (+15 días)
4. **Validaciones de Negocio**:
   - Hora fin > hora inicio
   - Fecha futura (solo para INSERT)
   - Duración máxima 8 horas
5. **Estado de Usuario**: Solo usuarios con estado=1 pueden crear reservas

## Archivos SQL para Ejecutar

1. `create_triggers.sql` - Crear triggers y funciones de validación
2. `sample_data.sql` - Datos de ejemplo (opcional)
3. `verify_tables.sql` - Script de verificación de estructura

## Flujo de Autorización

1. Usuario se autentica → obtiene `user_id` de Supabase Auth
2. Sistema obtiene `email` del usuario desde Supabase Auth  
3. Verifica relación `usuario_habitante` con `estado = 1`
4. Solo permite reservas para propiedades donde el usuario es habitante/propietario activo
5. Valida que no haya solapamientos de horarios
6. Crea reserva con cálculos automáticos por triggers

## Casos de Uso Implementados

- **CU-17 Gestionar Áreas Sociales**: ✅ CRUD completo (solo admin)
- **CU-18 Realizar Reserva**: ✅ Con validaciones de usuario y propiedad
- **CU-19 Consultar Reservas**: ✅ Por usuario y general (admin)

## Próximos Pasos

1. Ejecutar SQL triggers en Supabase
2. Probar endpoints con Postman/frontend
3. Verificar flujo completo de reservas