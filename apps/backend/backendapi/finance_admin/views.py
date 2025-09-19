"""
Vistas para el módulo de administración de finanzas

Define todos los endpoints para la gestión de tarifas, extraordinarias
y generación de expensas. Todas las rutas requieren rol de administrador.
"""

import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator

from .permissions import require_auth, require_admin
from .validators import (
    validate_and_normalize_periodo,
    validate_future_periodo,
    validate_monto,
    validate_json_required_fields,
    validate_query_periodo,
    ValidationError
)
from .services import (
    insert_tarifa,
    get_tarifa_vigente,
    upsert_extraordinaria,
    get_extraordinaria,
    generar_expensas_hoy,
    test_database_connection
)
from .serializers import (
    TarifaSerializer,
    ExtraordinariaSerializer,
    ExpensaSerializer,
    DatabaseTestSerializer,
    error_response,
    success_response
)


@csrf_exempt
@require_http_methods(["POST"])
@require_auth 
@require_admin
def post_tarifa(request):
    """
    [POST] /api/admin/finanzas/tarifa
    
    Inserta una nueva tarifa en tarifa_m2.
    Body: { "monto": number } (Bs/m²)
    """
    try:
        # Parsear JSON del body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse(
                error_response("JSON inválido en el body"),
                status=400
            )

        # Validar campos requeridos
        is_valid, error_msg = validate_json_required_fields(data, ['monto'])
        if not is_valid:
            return JsonResponse(
                error_response(error_msg),
                status=400
            )

        # Validar monto
        is_valid, error_msg, monto_decimal = validate_monto(data['monto'], 'monto')
        if not is_valid:
            return JsonResponse(
                error_response(error_msg),
                status=400
            )

        # Insertar tarifa en BD
        tarifa_data = insert_tarifa(monto_decimal)

        # Serializar respuesta
        response_data = TarifaSerializer.serialize_response(
            tarifa_data,
            message="Tarifa creada exitosamente"
        )

        return JsonResponse(response_data, status=201)

    except Exception as e:
        return JsonResponse(
            error_response("Error interno del servidor", str(e)),
            status=500
        )


@require_http_methods(["GET"])
@require_auth
@require_admin
def get_tarifa_vigente_view(request):
    """
    [GET] /api/admin/finanzas/tarifa/vigente
    
    Retorna la tarifa vigente (última insertada).
    """
    try:
        # Obtener tarifa vigente
        tarifa_data = get_tarifa_vigente()

        if not tarifa_data:
            return JsonResponse(
                error_response("No hay tarifas configuradas en el sistema"),
                status=404
            )

        # Serializar respuesta
        response_data = TarifaSerializer.serialize_response(
            tarifa_data,
            message="Tarifa vigente obtenida exitosamente"
        )

        return JsonResponse(response_data, status=200)

    except Exception as e:
        return JsonResponse(
            error_response("Error interno del servidor", str(e)),
            status=500
        )


@csrf_exempt
@require_http_methods(["POST"])
@require_auth
@require_admin
def post_extraordinaria(request):
    """
    [POST] /api/admin/finanzas/extraordinaria
    
    Crea/actualiza la extraordinaria para un mes FUTURO.
    Body: {
        "periodo": "YYYY-MM",
        "total_monto": number,
        "descripcion": "string opcional"
    }
    """
    try:
        # Parsear JSON del body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse(
                error_response("JSON inválido en el body"),
                status=400
            )

        # Validar campos requeridos
        is_valid, error_msg = validate_json_required_fields(data, ['periodo', 'total_monto'])
        if not is_valid:
            return JsonResponse(
                error_response(error_msg),
                status=400
            )

        # Validar y normalizar período
        is_valid, error_msg, periodo_date = validate_and_normalize_periodo(data['periodo'])
        if not is_valid:
            return JsonResponse(
                error_response(error_msg),
                status=400
            )

        # Validar que sea período futuro
        is_valid, error_msg = validate_future_periodo(periodo_date)
        if not is_valid:
            return JsonResponse(
                error_response(error_msg),
                status=400
            )

        # Validar total_monto
        is_valid, error_msg, monto_decimal = validate_monto(data['total_monto'], 'total_monto')
        if not is_valid:
            return JsonResponse(
                error_response(error_msg),
                status=400
            )

        # Obtener descripción opcional
        descripcion = data.get('descripcion', '')

        # Insertar/actualizar extraordinaria en BD
        extraordinaria_data = upsert_extraordinaria(periodo_date, monto_decimal, descripcion)

        # Serializar respuesta
        response_data = ExtraordinariaSerializer.serialize_response(
            extraordinaria_data,
            message="Extraordinaria configurada exitosamente"
        )

        return JsonResponse(response_data, status=200)

    except Exception as e:
        return JsonResponse(
            error_response("Error interno del servidor", str(e)),
            status=500
        )


@require_http_methods(["GET"])
@require_auth
@require_admin
def get_extraordinaria_view(request):
    """
    [GET] /api/admin/finanzas/extraordinaria?periodo=YYYY-MM
    
    Devuelve la extraordinaria configurada para ese mes.
    """
    try:
        # Obtener parámetro periodo
        periodo_query = request.GET.get('periodo')
        if not periodo_query:
            return JsonResponse(
                error_response("Parámetro 'periodo' requerido"),
                status=400
            )

        # Validar y normalizar período
        is_valid, error_msg, periodo_date = validate_query_periodo(periodo_query)
        if not is_valid:
            return JsonResponse(
                error_response(error_msg),
                status=400
            )

        # Buscar extraordinaria en BD
        extraordinaria_data = get_extraordinaria(periodo_date)

        if not extraordinaria_data:
            # Respuesta cuando no se encuentra
            response_data = ExtraordinariaSerializer.serialize_not_found_response(
                periodo_date.strftime('%Y-%m')
            )
        else:
            # Serializar respuesta exitosa
            response_data = ExtraordinariaSerializer.serialize_response(
                extraordinaria_data,
                message="Extraordinaria encontrada"
            )

        return JsonResponse(response_data, status=200)

    except Exception as e:
        return JsonResponse(
            error_response("Error interno del servidor", str(e)),
            status=500
        )


@csrf_exempt
@require_http_methods(["POST"])
@require_auth
@require_admin
def post_generar_expensas_hoy(request):
    """
    [POST] /api/admin/finanzas/expensas/generar-hoy
    
    Ejecuta manual la generación diaria de expensas.
    """
    try:
        print(f"🟢 Iniciando generación de expensas - Usuario: {getattr(request, 'user_id', 'N/A')}")
        
        # Ejecutar generación de expensas
        success, expensas_data = generar_expensas_hoy()
        
        print(f"🟢 Resultado generación: success={success}, expensas={len(expensas_data) if expensas_data else 0}")

        if not success:
            print("🔴 Error: La función generar_expensas_hoy retornó success=False")
            return JsonResponse(
                error_response("Error ejecutando generación de expensas"),
                status=500
            )

        # Serializar respuesta
        response_data = ExpensaSerializer.serialize_generation_response(success, expensas_data)
        
        print(f"🟢 Respuesta serializada exitosamente")

        return JsonResponse(response_data, status=200)

    except Exception as e:
        print(f"🔴 Error en post_generar_expensas_hoy: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse(
            error_response("Error interno del servidor", str(e)),
            status=500
        )


@require_http_methods(["GET"])
@require_auth
@require_admin
def debug_database_test(request):
    """
    [GET] /api/admin/finanzas/debug/database-test
    
    Endpoint temporal para probar conectividad con base de datos.
    """
    try:
        # Ejecutar test de BD
        test_data = test_database_connection()

        # Serializar respuesta
        response_data = DatabaseTestSerializer.serialize_test_response(test_data)

        return JsonResponse(response_data, status=200)

    except Exception as e:
        return JsonResponse(
            error_response("Error en test de base de datos", str(e)),
            status=500
        )