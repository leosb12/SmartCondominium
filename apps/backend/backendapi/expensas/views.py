from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
# from .permissions import IsAdminRole  # activa si quieres restringir
from .serializers import ExpensaCreateSerializer, AbonoExpensaSerializer
from . import services as svc

class ExpensasViewSet(viewsets.ViewSet):
    """
    Endpoints:
    - GET    /expensas?propiedad_id=...
    - GET    /expensas/{id}
    - POST   /expensas                (crear deuda)
    - POST   /expensas/{id}/abonar    (registrar cuota)
    - GET    /expensas/{id}/pagos     (historial)
    """
    # permission_classes = [IsAdminRole]  # si TODO requiere admin

    def list(self, request):
        propiedad_id = request.query_params.get("propiedad_id")
        data = svc.list_expensas(int(propiedad_id)) if propiedad_id else svc.list_expensas()
        return Response(data)

    def retrieve(self, request, pk=None):
        data = svc.get_expensa(int(pk))
        if not data:
            return Response({"detail": "No encontrado"}, status=404)
        return Response(data)

    def create(self, request):
        ser = ExpensaCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        out = svc.create_expensa(ser.validated_data)
        return Response(out, status=201)

    @action(detail=True, methods=["post"])
    def abonar(self, request, pk=None):
        ser = AbonoExpensaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        monto = float(ser.validated_data["monto"])

        # (Opcional) Control de sobrepago
        estado = svc.get_expensa(int(pk))
        if not estado:
            return Response({"detail": "Expensa no existe"}, status=404)
        saldo = float(estado.get("saldo", estado.get("total", 0)))
        if monto <= 0:
            return Response({"detail": "Monto inválido"}, status=400)
        if "saldo" in estado and monto > saldo:
            return Response({"detail": f"El monto excede el saldo ({saldo})."}, status=400)

        user_uuid = request.headers.get("X-User-Id")  # trae del Auth
        out = svc.abonar_expensa(int(pk), monto, user_uuid)
        return Response(out, status=201)

    @action(detail=True, methods=["get"])
    def pagos(self, request, pk=None):
        return Response(svc.listar_pagos_expensa(int(pk)))
