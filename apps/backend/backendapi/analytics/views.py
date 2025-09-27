# backendapi/analytics/views.py
from typing import Optional
from django.utils.dateparse import parse_date
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

# Reutiliza tu permiso basado en roles (Supabase)
from backendapi.comunicados.permissions import IsAdminSupabase

# Servicios (los implementamos en services.py)
from .services import (
    dashboard_service,
    morosidad_service,
    areas_uso_service,
    seguridad_service,
    export_service,
)

# -----------------------------
# Helpers de parsing livianos
# -----------------------------
def _parse_int(value: Optional[str]) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

def _parse_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() in ("1", "true", "t", "yes", "y")

def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))

def _bad(message: str, code: int = 400) -> Response:
    return Response({"success": False, "error": message}, status=code)


# =============================
#        VISTAS (GET)
# =============================

class DashboardView(APIView):
    """
    GET /api/analytics/dashboard
    Query: torre_id?, desde?(YYYY-MM-DD), hasta?(YYYY-MM-DD)
    """
    permission_classes = [IsAdminSupabase]

    def get(self, request):
        torre_id = _parse_int(request.GET.get("torre_id"))
        desde = parse_date(request.GET.get("desde") or "")
        hasta = parse_date(request.GET.get("hasta") or "")

        try:
            data = dashboard_service(
                torre_id=torre_id,
                desde=desde,
                hasta=hasta,
                user_id=getattr(request, "user_id", None),  # inyectado por el permiso
            )
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return _bad(f"Error en dashboard: {e}", 500)


class MorosidadView(APIView):
    """
    GET /api/analytics/morosidad
    Query: torre_id?, propiedad_id?, desde?, hasta?,
           min_riesgo?(bajo|medio|alto),
           ordering?(score|-score|saldo_total|-saldo_total),
           limit?(<=100), offset?
    """
    permission_classes = [IsAdminSupabase]

    def get(self, request):
        torre_id = _parse_int(request.GET.get("torre_id"))
        propiedad_id = _parse_int(request.GET.get("propiedad_id"))
        desde = parse_date(request.GET.get("desde") or "")
        hasta = parse_date(request.GET.get("hasta") or "")

        min_riesgo = (request.GET.get("min_riesgo") or "").lower() or None
        if min_riesgo and min_riesgo not in ("bajo", "medio", "alto"):
            return _bad("min_riesgo debe ser uno de: bajo|medio|alto", 400)

        ordering = request.GET.get("ordering") or "-score"
        if ordering not in ("score", "-score", "saldo_total", "-saldo_total"):
            return _bad("ordering inválido. Use: score|-score|saldo_total|-saldo_total", 400)

        limit = _parse_int(request.GET.get("limit")) or 50
        offset = _parse_int(request.GET.get("offset")) or 0
        limit = _clamp(limit, 1, 100)
        offset = max(0, offset)

        try:
            result = morosidad_service(
                torre_id=torre_id,
                propiedad_id=propiedad_id,
                desde=desde,
                hasta=hasta,
                min_riesgo=min_riesgo,
                ordering=ordering,
                limit=limit,
                offset=offset,
                user_id=getattr(request, "user_id", None),
            )
            # Convención del servicio: {"items": [...], "total": int, "filtros": {...}}
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return _bad(f"Error en morosidad: {e}", 500)


class AreasUsoView(APIView):
    """
    GET /api/analytics/areas-uso
    Query: area_social_id?, semanas?(def 8, máx 12), limit?, offset?
    """
    permission_classes = [IsAdminSupabase]

    def get(self, request):
        area_social_id = _parse_int(request.GET.get("area_social_id"))
        semanas = _parse_int(request.GET.get("semanas")) or 8
        semanas = _clamp(semanas, 1, 12)

        limit = _parse_int(request.GET.get("limit")) or 100
        offset = _parse_int(request.GET.get("offset")) or 0
        limit = _clamp(limit, 1, 200)  # puede ser un poco más alto para áreas
        offset = max(0, offset)

        try:
            result = areas_uso_service(
                area_social_id=area_social_id,
                semanas=semanas,
                limit=limit,
                offset=offset,
                user_id=getattr(request, "user_id", None),
            )
            # Convención: {"items": [...], "total": int, "filtros": {...}}
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return _bad(f"Error en áreas de uso: {e}", 500)


class SeguridadView(APIView):
    """
    GET /api/analytics/seguridad
    Query: dias?(def 21, máx 60), solo_pendientes?(bool), limit?, offset?
    """
    permission_classes = [IsAdminSupabase]

    def get(self, request):
        dias = _parse_int(request.GET.get("dias")) or 21
        dias = _clamp(dias, 1, 60)

        solo_pendientes = _parse_bool(request.GET.get("solo_pendientes"), default=False)

        limit = _parse_int(request.GET.get("limit")) or 100
        offset = _parse_int(request.GET.get("offset")) or 0
        limit = _clamp(limit, 1, 200)
        offset = max(0, offset)

        try:
            result = seguridad_service(
                dias=dias,
                solo_pendientes=solo_pendientes,
                limit=limit,
                offset=offset,
                user_id=getattr(request, "user_id", None),
            )
            # Convención: {"autos_por_hora": [...], "personas_por_hora": [...], "anomalias": [...], "filtros": {...}}
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return _bad(f"Error en seguridad: {e}", 500)


class ExportView(APIView):
    """
    GET /api/analytics/export
    Query: tipo=(pdf|csv_morosidad|csv_areas|csv_seguridad) + mismos filtros del resto
    """
    permission_classes = [IsAdminSupabase]

    def get(self, request):
        tipo = (request.GET.get("tipo") or "").lower().strip()
        if tipo not in ("pdf", "csv_morosidad", "csv_areas", "csv_seguridad"):
            return _bad("tipo inválido. Use: pdf|csv_morosidad|csv_areas|csv_seguridad", 400)

        try:
            # El servicio retorna una tupla: (bytes_content, content_type, filename_sugerido)
            content, content_type, filename = export_service(
                tipo=tipo,
                query_params=request.GET,  # el servicio reusa los mismos filtros
                user_id=getattr(request, "user_id", None),
            )

            resp = HttpResponse(content, content_type=content_type)
            resp["Content-Disposition"] = f'attachment; filename="{filename}"'
            return resp

        except Exception as e:
            return _bad(f"Error en exportación: {e}", 500)
