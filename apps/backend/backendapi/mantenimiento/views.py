# backendapi/mantenimiento/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from backendapi.roles.auth_helpers import require_auth, require_admin
from .serializers import (
    PreventivoCreateSerializer, PreventivoResponseSerializer,
    AsignacionSerializer, StaffQuerySerializer
)
from .services import orders as orders_srv, staff as staff_srv
from .repository import orden_trabajo as repo
from core.supabase_client import supabase

class PreventivoCreateView(APIView):
    @require_auth
    @require_admin
    def post(self, request):
        s = PreventivoCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            data = orders_srv.crear_preventivo(
                creado_por_id=request.user_id,
                catalogo_id=s.validated_data["catalogo_id"],
                descripcion=s.validated_data["descripcion"],
                fecha_programada=s.validated_data["fecha_programada"],
                hora_id=s.validated_data["hora_id"],
                costo=s.validated_data.get("costo"),
                ordenado_a_id=s.validated_data.get("ordenado_a_id"),
            )
            return Response(PreventivoResponseSerializer(data).data, status=201)
        except (ValueError, PermissionError) as e:
            return Response({"detail": str(e)}, status=400)

class AsignarOrdenView(APIView):
    @require_auth
    @require_admin
    def post(self, request):
        s = AsignacionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            data = orders_srv.asignar(
                orden_trabajo_id=s.validated_data["orden_trabajo_id"],
                usuario_id=s.validated_data["usuario_id"],
            )
            return Response(PreventivoResponseSerializer(data).data, status=200)
        except (ValueError, PermissionError) as e:
            return Response({"detail": str(e)}, status=400)

class MisOrdenesView(APIView):
    @require_auth
    def get(self, request):
        data = repo.listar_por_asignado(request.user_id)
        return Response(data, status=200)

class ListarPersonalView(APIView):
    @require_auth
    @require_admin
    def get(self, request):
        s = StaffQuerySerializer(data=request.query_params)
        s.is_valid(raise_exception=True)
        usuarios = staff_srv.listar_personal(s.validated_data["tipo"])
        return Response({"usuarios": usuarios}, status=200)
    
class CatalogoListView(APIView):
    @require_auth
    @require_admin
    def get(self, request):
        res = supabase.table("catalogo").select("id,nombre,descripcion").order("nombre").execute()
        return Response(res.data or [], status=200)

class HoraListView(APIView):
    @require_auth
    @require_admin
    def get(self, request):
        # id int8 (0..23), valor time
        res = supabase.table("hora").select("id,valor").order("id").execute()
        return Response(res.data or [], status=200)

class OrdenesPendientesView(APIView):
    @require_auth
    @require_admin
    def get(self, request):
        # Obtener órdenes con estado_trabajo_id = 1 (pendiente) y ordenado_a_id = null
        data = repo.listar_pendientes()
        return Response(data, status=200)

class TecnicosConNombresView(APIView):
    @require_auth
    @require_admin
    def get(self, request):
        s = StaffQuerySerializer(data=request.query_params)
        s.is_valid(raise_exception=True)
        tecnicos = staff_srv.listar_personal_con_nombres(s.validated_data["tipo"])
        return Response({"tecnicos": tecnicos}, status=200)