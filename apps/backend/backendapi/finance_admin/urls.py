"""
URLs para el módulo de administración de finanzas

Define las rutas para todas las APIs de gestión financiera.
Todas las rutas requieren rol de administrador.
"""

from django.urls import path
from .views import (
    post_tarifa,
    get_tarifa_vigente_view,
    post_extraordinaria,
    get_extraordinaria_view,
    post_generar_expensas_hoy,
    debug_database_test
)

# Patrón de URLs del módulo
urlpatterns = [
    # Gestión de tarifas
    path('tarifa', post_tarifa, name='finance_admin_post_tarifa'),                          # POST
    path('tarifa/vigente', get_tarifa_vigente_view, name='finance_admin_get_tarifa_vigente'),  # GET
    
    # Gestión de extraordinarias
    path('extraordinaria', post_extraordinaria, name='finance_admin_post_extraordinaria'),    # POST
    path('extraordinaria', get_extraordinaria_view, name='finance_admin_get_extraordinaria'), # GET (mismo path, diferente método)
    
    # Generación de expensas
    path('expensas/generar-hoy', post_generar_expensas_hoy, name='finance_admin_generar_expensas_hoy'), # POST
    
    # Debug endpoints (temporales)
    path('debug/database-test', debug_database_test, name='finance_admin_debug_database_test'), # GET
]

"""
Estructura de endpoints resultante:

Gestión de tarifas:
- POST /api/admin/finanzas/tarifa                    -> Crear nueva tarifa
- GET  /api/admin/finanzas/tarifa/vigente           -> Obtener tarifa vigente

Gestión de extraordinarias:
- POST /api/admin/finanzas/extraordinaria           -> Crear/actualizar extraordinaria
- GET  /api/admin/finanzas/extraordinaria?periodo=YYYY-MM -> Obtener extraordinaria

Generación de expensas:
- POST /api/admin/finanzas/expensas/generar-hoy     -> Ejecutar generación manual

Debug (temporal):
- GET  /api/admin/finanzas/debug/database-test      -> Test de conectividad BD

Ejemplos de uso:

1. Crear nueva tarifa:
   POST /api/admin/finanzas/tarifa
   {
     "monto": 150.50
   }

2. Obtener tarifa vigente:
   GET /api/admin/finanzas/tarifa/vigente

3. Configurar extraordinaria:
   POST /api/admin/finanzas/extraordinaria
   {
     "periodo": "2025-11",
     "total_monto": 50000.00,
     "descripcion": "Reparación de elevador"
   }

4. Consultar extraordinaria:
   GET /api/admin/finanzas/extraordinaria?periodo=2025-11

5. Generar expensas manualmente:
   POST /api/admin/finanzas/expensas/generar-hoy

Todas las rutas:
- Requieren token JWT válido en header Authorization: Bearer <token>
- Requieren que el usuario tenga rol de 'administrador'
- Retornan JSON con formato consistente { success, data?, message?, error? }
- Usan códigos de estado HTTP apropiados (200, 201, 400, 401, 403, 404, 500)
"""