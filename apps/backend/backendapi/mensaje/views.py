from typing import Optional
from uuid import UUID

from django.core.paginator import Paginator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from core.supabase_client import supabase
from .serializers import MensajeSerializer, MensajeListSerializer
from .services import get_inbox_queryset, get_thread_queryset, create_message


def _as_uuid(value) -> Optional[UUID]:
    try:
        return UUID(str(value))
    except Exception:
        return None


def get_supabase_user_uuid(request) -> tuple[Optional[UUID], Optional[Response]]:
    """
    Valida Authorization: Bearer <token> contra Supabase.
    Devuelve (uuid, None) si OK, o (None, Response) si error para retornar al cliente.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, Response({"detail": "Falta token (Authorization: Bearer <token>)"}, status=status.HTTP_401_UNAUTHORIZED)

    token = auth.split(" ", 1)[1].strip()
    try:
        res = supabase.auth.get_user(token)
        user = getattr(res, "user", None)
        if not user:
            return None, Response({"detail": "Token inválido o expirado"}, status=status.HTTP_401_UNAUTHORIZED)
        uid = _as_uuid(getattr(user, "id", None))
        if not uid:
            return None, Response({"detail": "No se pudo obtener UUID de usuario"}, status=status.HTTP_400_BAD_REQUEST)
        return uid, None
    except Exception as e:
        return None, Response({"detail": f"Error validando token: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MensajeListCreateView(APIView):
    """
    GET /mensajes/?with=<uuid>&limit=50&offset=0
      - Si 'with' viene, devuelve conversación con ese usuario.
      - Si no, devuelve inbox (enviados y recibidos).
    POST /mensajes/
      body: { "receptor_id": "<uuid>", "cuerpo": "texto" }
    """
    # No usamos DRF IsAuthenticated; validamos token de Supabase manualmente.

    def get(self, request):
        user_uuid, err = get_supabase_user_uuid(request)
        if err:
            return err

        other = request.query_params.get("with")
        limit = int(request.query_params.get("limit", 50))
        offset = int(request.query_params.get("offset", 0))

        if other:
            other_uuid = _as_uuid(other)
            if not other_uuid:
                return Response({"detail": "Parámetro 'with' inválido."}, status=status.HTTP_400_BAD_REQUEST)
            qs = get_thread_queryset(user_uuid, other_uuid)
        else:
            qs = get_inbox_queryset(user_uuid)

        page_size = limit if limit > 0 else 50
        paginator = Paginator(qs, page_size)
        page_num = (offset // page_size) + 1
        page = paginator.get_page(page_num)

        ser = MensajeListSerializer(page.object_list, many=True)
        return Response(
            {
                "count": paginator.count,
                "limit": page_size,
                "offset": offset,
                "results": ser.data,
            }
        )

    def post(self, request):
        user_uuid, err = get_supabase_user_uuid(request)
        if err:
            return err

        ser = MensajeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        receptor_uuid = ser.validated_data["receptor_id"]
        cuerpo = ser.validated_data["cuerpo"]

        if str(receptor_uuid) == str(user_uuid):
            return Response({"detail": "No puedes enviarte mensajes a ti mismo."}, status=status.HTTP_400_BAD_REQUEST)

        msg = create_message(emisor_uuid=user_uuid, receptor_uuid=receptor_uuid, cuerpo=cuerpo)
        out = MensajeListSerializer(msg)
        return Response(out.data, status=status.HTTP_201_CREATED)


class ConversacionView(APIView):
    """
    GET /mensajes/conversacion/<uuid:other_id>/?limit=50&offset=0
    """
    # Sin IsAuthenticated (validamos con Supabase manualmente)

    def get(self, request, other_id):
        user_uuid, err = get_supabase_user_uuid(request)
        if err:
            return err

        other_uuid = _as_uuid(other_id)
        if not other_uuid:
            return Response({"detail": "UUID inválido."}, status=status.HTTP_400_BAD_REQUEST)

        limit = int(request.query_params.get("limit", 50))
        offset = int(request.query_params.get("offset", 0))

        qs = get_thread_queryset(user_uuid, other_uuid)
        page_size = limit if limit > 0 else 50
        paginator = Paginator(qs, page_size)
        page_num = (offset // page_size) + 1
        page = paginator.get_page(page_num)

        ser = MensajeListSerializer(page.object_list, many=True)
        return Response(
            {
                "count": paginator.count,
                "limit": page_size,
                "offset": offset,
                "results": ser.data,
            }
        )