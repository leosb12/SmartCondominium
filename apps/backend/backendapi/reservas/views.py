from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import traceback
from datetime import datetime

from backendapi.roles.auth_helpers import require_auth, require_admin
from backendapi.roles.services import user_has_role
from core.supabase_client import supabase_admin
from .services import ReservaService
from .serializers import AreaSocialSerializer, ReservaSerializer, PropiedadSerializer, HoraSerializer
from .repositories import ReservaRepository


def get_user_info(request):
    """
    Helper para obtener información del usuario desde request.user_id
    """
    user_id = request.user_id
    try:
        user_response = supabase_admin.auth.admin.get_user_by_id(user_id)

        if not user_response or not user_response.user:
            return {
                'user_id': user_id,
                'username': f"user_{str(user_id)[:8]}",
                'email': '',
                'is_admin': user_has_role(user_id, "administrador"),
            }

        user = user_response.user
        email = getattr(user, 'email', '') or ''
        username = email.split('@')[0] if email else f"user_{str(user_id)[:8]}"

        return {
            'user_id': user_id,
            'username': username,
            'email': email,
            'is_admin': user_has_role(user_id, "administrador"),
        }
    except Exception as e:
        print(f"Error getting user info: {e}")
        return {
            'user_id': user_id,
            'username': f"user_{str(user_id)[:8]}",
            'email': '',
            'is_admin': user_has_role(user_id, "administrador"),
        }


@csrf_exempt
@require_http_methods(["GET", "POST"])
@require_auth
@require_admin
def list_create_area_social(request):
    """
    GET: List all areas sociales (admin only)
    POST: Create new area social (admin only)
    """
    try:
        if request.method == 'GET':
            areas = ReservaService.get_all_areas_sociales()
            return JsonResponse({
                'status': 'success',
                'data': [AreaSocialSerializer.to_dict(area) for area in areas]
            })

        elif request.method == 'POST':
            data = json.loads(request.body)

            # Validaciones mínimas
            if 'nombre' not in data or not str(data.get('nombre', '')).strip():
                return JsonResponse({
                    'status': 'error',
                    'message': 'El nombre del área social es requerido'
                }, status=400)

            if 'precioxhora' in data and (data['precioxhora'] is None or float(data['precioxhora']) < 0):
                return JsonResponse({
                    'status': 'error',
                    'message': 'El precio por hora debe ser un valor válido'
                }, status=400)

            area = ReservaService.create_area_social(data)
            return JsonResponse({
                'status': 'success',
                'message': 'Área social creada exitosamente',
                'data': AreaSocialSerializer.to_dict(area)
            }, status=201)

    except Exception as e:
        print(f"Error in list_create_area_social: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'status': 'error',
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
@require_auth
@require_admin
def get_update_delete_area_social(request, area_id):
    """
    GET: Get area social by ID (admin only)
    PUT: Update area social (admin only)
    DELETE: Delete area social (admin only)
    """
    try:
        if request.method == 'GET':
            area = ReservaService.get_area_social_by_id(area_id)
            if not area:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Área social no encontrada'
                }, status=404)

            return JsonResponse({
                'status': 'success',
                'data': AreaSocialSerializer.to_dict(area)
            })

        elif request.method == 'PUT':
            data = json.loads(request.body)
            area = ReservaService.update_area_social(area_id, data)
            if not area:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Área social no encontrada'
                }, status=404)

            return JsonResponse({
                'status': 'success',
                'message': 'Área social actualizada exitosamente',
                'data': AreaSocialSerializer.to_dict(area)
            })

        elif request.method == 'DELETE':
            success = ReservaService.delete_area_social(area_id)
            if not success:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Área social no encontrada o no se puede eliminar'
                }, status=404)

            return JsonResponse({
                'status': 'success',
                'message': 'Área social eliminada exitosamente'
            })

    except Exception as e:
        print(f"Error in get_update_delete_area_social: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'status': 'error',
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET", "POST"])
@require_auth
def list_create_reserva(request):
    """
    GET: List all reservas (authenticated users)
    POST: Create new reserva (authenticated users)
    """
    try:
        user_info = get_user_info(request)

        if request.method == 'GET':
            reservas = ReservaService.get_all_reservas()
            return JsonResponse({
                'status': 'success',
                'data': [ReservaSerializer.to_dict(reserva) for reserva in reservas]
            })

        elif request.method == 'POST':
            data = json.loads(request.body)

            # Campos requeridos: validar por presencia de clave (no truthy) para permitir 0
            required_fields = ['area_social_id', 'propiedad_id', 'fecha', 'hora_inicio_id', 'hora_fin_id']
            missing = [f for f in required_fields if f not in data or data[f] is None]
            if missing:
                return JsonResponse({
                    'status': 'error',
                    'message': f'Faltan campos requeridos: {", ".join(missing)}'
                }, status=400)

            # Validación: hora fin > hora inicio
            try:
                ini = int(data['hora_inicio_id'])
                fin = int(data['hora_fin_id'])
            except Exception:
                return JsonResponse({
                    'status': 'error',
                    'message': 'hora_inicio_id y hora_fin_id deben ser enteros'
                }, status=400)

            if fin <= ini:
                return JsonResponse({
                    'status': 'error',
                    'message': 'La hora de fin debe ser posterior a la hora de inicio'
                }, status=400)

            # Validar que el usuario pueda reservar para esa propiedad (estado=1)
            can_reserve, message = ReservaRepository.validate_user_can_reserve(
                user_info['user_id'],
                data['propiedad_id']
            )
            if not can_reserve:
                return JsonResponse({
                    'status': 'error',
                    'message': message
                }, status=403)

            # Crear reserva (pasando usuario_id al service por si aplica lógicas extra)
            created = ReservaService.create_reserva(data, usuario_id=user_info['user_id'])

            # Manejar posibles errores del service (p.ej. RESERVA_SOLAPADA)
            if isinstance(created, dict) and created.get('error'):
                code = created.get('code', 'ERROR_AL_CREAR_RESERVA')
                status = 409 if code == 'RESERVA_SOLAPADA' else 400
                return JsonResponse({
                    'status': 'error',
                    'code': code,
                    'message': created.get('detail', 'Error al crear reserva')
                }, status=status)

            return JsonResponse({
                'status': 'success',
                'message': 'Reserva creada exitosamente',
                'data': ReservaSerializer.to_dict(created)
            }, status=201)

    except Exception as e:
        print(f"Error in list_create_reserva: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'status': 'error',
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
@require_auth
def get_update_delete_reserva(request, reserva_id):
    """
    GET: Get reserva by ID (authenticated users)
    PUT: Update reserva (habitante activo de esa propiedad o admin)
    DELETE: Delete reserva (habitante activo de esa propiedad o admin)
    """
    try:
        user_info = get_user_info(request)

        if request.method == 'GET':
            reserva = ReservaService.get_reserva_by_id(reserva_id)
            if not reserva:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Reserva no encontrada'
                }, status=404)

            return JsonResponse({
                'status': 'success',
                'data': ReservaSerializer.to_dict(reserva)
            })

        # Para PUT/DELETE verificar pertenencia (usuario_habitante estado=1) o admin
        reserva = ReservaService.get_reserva_by_id(reserva_id)
        if not reserva:
            return JsonResponse({
                'status': 'error',
                'message': 'Reserva no encontrada'
            }, status=404)

        propiedad_id = reserva.get('propiedad_id')
        is_admin = user_info.get('is_admin', False)

        if not is_admin:
            can_reserve, _ = ReservaRepository.validate_user_can_reserve(
                user_info['user_id'],
                propiedad_id
            )
            if not can_reserve:
                return JsonResponse({
                    'status': 'error',
                    'message': 'No tienes permisos para modificar/eliminar esta reserva'
                }, status=403)

        if request.method == 'PUT':
            data = json.loads(request.body)
            updated = ReservaService.update_reserva(reserva_id, data)

            if isinstance(updated, dict) and updated.get('error'):
                code = updated.get('code', 'ERROR_AL_ACTUALIZAR_RESERVA')
                status = 409 if code == 'RESERVA_SOLAPADA' else 400
                return JsonResponse({
                    'status': 'error',
                    'code': code,
                    'message': updated.get('detail', 'Error al actualizar reserva')
                }, status=status)

            return JsonResponse({
                'status': 'success',
                'message': 'Reserva actualizada exitosamente',
                'data': ReservaSerializer.to_dict(updated)
            })

        elif request.method == 'DELETE':
            success = ReservaService.delete_reserva(reserva_id)
            if not success:
                return JsonResponse({
                    'status': 'error',
                    'message': 'No se pudo eliminar la reserva'
                }, status=404)

            return JsonResponse({
                'status': 'success',
                'message': 'Reserva eliminada exitosamente'
            })

    except Exception as e:
        print(f"Error in get_update_delete_reserva: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'status': 'error',
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def get_user_reservas(request):
    """
    GET: Get current user's reservas (todas las reservas de propiedades donde es habitante activo)
    """
    try:
        user_info = get_user_info(request)
        reservas = ReservaService.get_reservas_by_user(user_info['user_id'])

        return JsonResponse({
            'status': 'success',
            'data': [ReservaSerializer.to_dict(reserva) for reserva in reservas]
        })

    except Exception as e:
        print(f"Error in get_user_reservas: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'status': 'error',
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def get_user_propiedades(request):
    """
    GET: Get current user's available properties for reservations
    Solo devuelve propiedades donde el usuario tiene estado=1 en usuario_habitante
    """
    try:
        user_info = get_user_info(request)
        propiedades = ReservaService.get_user_propiedades(user_info['user_id'])

        return JsonResponse({
            'status': 'success',
            'data': [PropiedadSerializer.to_dict(propiedad) for propiedad in propiedades]
        })

    except Exception as e:
        print(f"Error in get_user_propiedades: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'status': 'error',
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def get_areas_sociales_disponibles(request):
    """
    GET: Get available areas sociales for making reservations (all authenticated users)
    """
    try:
        areas = ReservaService.get_all_areas_sociales()

        return JsonResponse({
            'status': 'success',
            'data': [AreaSocialSerializer.to_dict(area) for area in areas]
        })

    except Exception as e:
        print(f"Error in get_areas_sociales_disponibles: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'status': 'error',
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def get_all_horas(request):
    """
    GET: Get all available hours (0-23) for making reservations
    """
    try:
        horas = ReservaService.get_all_horas()

        return JsonResponse({
            'status': 'success',
            'data': [HoraSerializer.to_dict(hora) for hora in horas]
        })

    except Exception as e:
        print(f"Error in get_all_horas: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'status': 'error',
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)