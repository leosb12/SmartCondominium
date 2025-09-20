# Test de Validaciones del Módulo de Reservas

## Ejecutar con Django Shell

```bash
python manage.py shell
```

## Pruebas de Validación

### 1. Importar módulos
```python
from backendapi.reservas.repositories import ReservaRepository
from core.supabase_client import supabase_admin
```

### 2. Probar validación de usuario activo (estado=1)
```python
# Ejemplo de validación - reemplaza con user_id y propiedad_id reales
user_id = "tu-user-id-de-supabase"
propiedad_id = 1

can_reserve, message = ReservaRepository.validate_user_can_reserve(user_id, propiedad_id)
print(f"¿Puede reservar?: {can_reserve}")
print(f"Mensaje: {message}")
```

### 3. Obtener propiedades de un usuario
```python
propiedades = ReservaRepository.get_user_propiedades(user_id)
print(f"Propiedades disponibles: {propiedades}")
```

### 4. Probar endpoints (necesita servidor corriendo)

#### Obtener áreas sociales disponibles
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8001/api/reservas/areas-disponibles/
```

#### Obtener propiedades del usuario
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8001/api/reservas/mis-propiedades/
```

#### Crear reserva (validará automáticamente permisos)
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "area_social_id": 1,
       "propiedad_id": 1,
       "fecha": "2024-12-25",
       "hora_inicio_id": 18,
       "hora_fin_id": 22
     }' \
     http://localhost:8001/api/reservas/reservas/
```

## Validaciones que se ejecutarán automáticamente:

1. ✅ Usuario tiene estado=1 en usuario_habitante
2. ✅ Usuario es habitante/propietario de la propiedad especificada  
3. ✅ No hay solapamiento con otras reservas existentes
4. ✅ Hora fin > hora inicio
5. ✅ Fecha es futura
6. ✅ Duración máxima 8 horas
7. ✅ Cálculo automático del total basado en precioxhora
8. ✅ Asignación automática de timestamps y fecha vencimiento

## Casos de Error Esperados:

- Si usuario no tiene estado=1: "Solo usuarios con estado activo (1) pueden crear reservas"
- Si usuario no es habitante de la propiedad: "No tienes permisos para reservar en esta propiedad"
- Si hay solapamiento: Error de constraint unique_area_fecha_horario
- Si hora_fin <= hora_inicio: "La hora de fin debe ser posterior a la hora de inicio"