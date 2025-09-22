from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from postgrest.exceptions import APIError

from .serializers import (
    CostoTrabajoCreateSerializer,
    CostoTrabajoUpdateSerializer,
    CostoTrabajoResponseSerializer,
    CostoTrabajoListQuerySerializer,
)
from . import repository as repo


class CostoMaterialListCreateView(APIView):
    """
    GET  /api/costo-material/?orden_id=...
    POST /api/costo-material/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            qs = CostoTrabajoListQuerySerializer(data=request.query_params)
            qs.is_valid(raise_exception=True)
            orden_id = qs.validated_data.get("orden_id")
            data = repo.listar(orden_id=orden_id)
            return Response(data, status=200)
        except APIError as e:
            return Response({"detail": e.args[0].get("message") if e.args else str(e)}, status=400)

    def post(self, request):
        try:
            s = CostoTrabajoCreateSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            created = repo.crear(s.validated_data)
            return Response(CostoTrabajoResponseSerializer(created).data, status=201)
        except APIError as e:
            return Response({"detail": e.args[0].get("message") if e.args else str(e)}, status=400)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)


class CostoMaterialDetailView(APIView):
    """
    GET    /api/costo-material/<id>/
    PATCH  /api/costo-material/<id>/
    PUT    /api/costo-material/<id>/
    DELETE /api/costo-material/<id>/
    """
    permission_classes = [AllowAny]

    def get(self, request, pk: int):
        try:
            data = repo.obtener_por_id(pk)
            if not data:
                return Response({"detail": "No encontrado"}, status=404)
            return Response(CostoTrabajoResponseSerializer(data).data, status=200)
        except APIError as e:
            return Response({"detail": e.args[0].get("message") if e.args else str(e)}, status=400)

    def patch(self, request, pk: int):
        try:
            s = CostoTrabajoUpdateSerializer(data=request.data, partial=True)
            s.is_valid(raise_exception=True)
            upd = repo.actualizar(pk, s.validated_data)
            if not upd:
                return Response({"detail": "No encontrado"}, status=404)
            return Response(CostoTrabajoResponseSerializer(upd).data, status=200)
        except APIError as e:
            return Response({"detail": e.args[0].get("message") if e.args else str(e)}, status=400)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    def put(self, request, pk: int):
        try:
            s = CostoTrabajoUpdateSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            upd = repo.actualizar(pk, s.validated_data)
            if not upd:
                return Response({"detail": "No encontrado"}, status=404)
            return Response(CostoTrabajoResponseSerializer(upd).data, status=200)
        except APIError as e:
            return Response({"detail": e.args[0].get("message") if e.args else str(e)}, status=400)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    def delete(self, request, pk: int):
        try:
            ok = repo.eliminar(pk)
            if not ok:
                return Response({"detail": "No encontrado"}, status=404)
            return Response(status=204)
        except APIError as e:
            return Response({"detail": e.args[0].get("message") if e.args else str(e)}, status=400)