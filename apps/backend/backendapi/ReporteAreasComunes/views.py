from rest_framework import viewsets, decorators, response, status, permissions
from rest_framework.request import Request

from .models import AreaSocial, Reserva
from .serializers import AreaSocialSerializer, ReservaSerializer
from .services import (
    get_hourly_price,
    get_known_types_with_prices,
    CHURRASQUERA_ID,
    PISCINA_ID,
)


class AreaSocialViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AreaSocial.objects.all().order_by("id")
    serializer_class = AreaSocialSerializer
    permission_classes = [permissions.AllowAny]

    @decorators.action(detail=False, methods=["get"], url_path="tipos")
    def tipos(self, request: Request):
        data = get_known_types_with_prices()
        for item in data:
            if item.get("precioxhora") is not None:
                item["precioxhora"] = str(item["precioxhora"])
        return response.Response(data, status=status.HTTP_200_OK)

    @decorators.action(detail=False, methods=["get"], url_path="precios")
    def precios(self, request: Request):
        data = {
            str(CHURRASQUERA_ID): (
                str(get_hourly_price(CHURRASQUERA_ID))
                if get_hourly_price(CHURRASQUERA_ID) is not None
                else None
            ),
            str(PISCINA_ID): (
                str(get_hourly_price(PISCINA_ID))
                if get_hourly_price(PISCINA_ID) is not None
                else None
            ),
        }
        return response.Response(data, status=status.HTTP_200_OK)

    @decorators.action(detail=False, methods=["get"], url_path="reservas")
    def reservas_all(self, request: Request):
        # Trae área y propiedad para incluir nro_casa sin N+1
        qs = Reserva.objects.select_related("area_social", "propiedad").order_by("-fecha", "-id")
        # Filtros opcionales
        area_id = request.query_params.get("area_id")
        propiedad_id = request.query_params.get("propiedad_id")  # sigue disponible si lo necesitas
        f_desde = request.query_params.get("fecha_desde")
        f_hasta = request.query_params.get("fecha_hasta")
        if area_id:
            qs = qs.filter(area_social_id=area_id)
        if propiedad_id:
            qs = qs.filter(propiedad_id=propiedad_id)
        if f_desde:
            qs = qs.filter(fecha__gte=f_desde)
        if f_hasta:
            qs = qs.filter(fecha__lte=f_hasta)
        ser = ReservaSerializer(qs, many=True)
        return response.Response(ser.data, status=status.HTTP_200_OK)

    @decorators.action(detail=True, methods=["get"], url_path="reservas")
    def reservas_por_area(self, request: Request, pk=None):
        qs = Reserva.objects.select_related("area_social", "propiedad").filter(area_social_id=pk).order_by("-fecha", "-id")
        f_desde = request.query_params.get("fecha_desde")
        f_hasta = request.query_params.get("fecha_hasta")
        if f_desde:
            qs = qs.filter(fecha__gte=f_desde)
        if f_hasta:
            qs = qs.filter(fecha__lte=f_hasta)
        ser = ReservaSerializer(qs, many=True)
        return response.Response(ser.data, status=status.HTTP_200_OK)


class ReservaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    - GET /api/reservas-areas/
    - GET /api/reservas-areas/{id}/

    Filtros opcionales:
      - area_id
      - propiedad_id
      - fecha_desde (YYYY-MM-DD)
      - fecha_hasta (YYYY-MM-DD)
    """
    serializer_class = ReservaSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Reserva.objects.select_related("area_social", "propiedad").order_by("-fecha", "-id")
        req = self.request
        if not req:
            return qs
        area_id = req.query_params.get("area_id")
        propiedad_id = req.query_params.get("propiedad_id")
        f_desde = req.query_params.get("fecha_desde")
        f_hasta = req.query_params.get("fecha_hasta")
        if area_id:
            qs = qs.filter(area_social_id=area_id)
        if propiedad_id:
            qs = qs.filter(propiedad_id=propiedad_id)
        if f_desde:
            qs = qs.filter(fecha__gte=f_desde)
        if f_hasta:
            qs = qs.filter(fecha__lte=f_hasta)
        return qs