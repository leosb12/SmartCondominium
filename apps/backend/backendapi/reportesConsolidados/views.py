from typing import Any, Dict
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework.pagination import LimitOffsetPagination

from .services import fetch_registros_ingreso
from .serializers import IngresoReporteSerializer

class RegistroIngresoReporteView(APIView):
    """
    Público: no requiere autenticación.
    GET /reportes-consolidados/ingresos/
    Parámetros opcionales:
      - invitado: true|false
      - resultado: Permitido|Rechazado
      - fecha_desde, fecha_hasta (ISO 8601)
      - limit, offset (paginación DRF)
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # sin auth

    def get(self, request, *args, **kwargs):
        params: Dict[str, Any] = {
            "invitado": self._parse_bool(request.query_params.get("invitado")),
            "resultado": request.query_params.get("resultado"),
            "fecha_desde": request.query_params.get("fecha_desde"),
            "fecha_hasta": request.query_params.get("fecha_hasta"),
        }

        data = fetch_registros_ingreso(**params)

        # Paginación segura (sin error de 'count')
        paginator = LimitOffsetPagination()
        page = paginator.paginate_queryset(data, request, view=self)
        if page is not None:
            serializer = IngresoReporteSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = IngresoReporteSerializer(data, many=True)
        return Response(serializer.data)

    @staticmethod
    def _parse_bool(val):
        if val is None:
            return None
        v = str(val).strip().lower()
        if v in ("true", "1", "t", "yes", "y", "si", "sí"):
            return True
        if v in ("false", "0", "f", "no", "n"):
            return False
        return None