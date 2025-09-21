from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from . import services


@api_view(["GET"])
@permission_classes([AllowAny])
def listar_estados_trabajo_view(request):
    data, error = services.listar_estados_trabajo()
    if error:
        return Response({"detail": error}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def listar_ordenes_view(request):
    """
    GET /orden-trabajo-estado/ordenes/?q=texto
    Sin autenticación, sin verificación de roles.
    """
    q = request.query_params.get("q")
    data, error = services.listar_ordenes_trabajo(q=q)
    if error:
        return Response({"detail": error}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(data or [], status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def obtener_orden_view(request, orden_id: int):
    """
    GET /orden-trabajo-estado/ordenes/<id>/
    Sin autenticación, sin verificación de roles.
    """
    data, error = services.obtener_orden(orden_id)
    if error:
        return Response({"detail": error}, status=status.HTTP_404_NOT_FOUND)
    return Response(data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([AllowAny])
def actualizar_estado_orden_view(request, orden_id: int):
    """
    PATCH /orden-trabajo-estado/ordenes/<id>/estado/
    Body: { "estado_trabajo_id": number, "comentario"?: string }
    Sin autenticación, sin verificación de roles.
    """
    estado_id = request.data.get("estado_trabajo_id")
    comentario = request.data.get("comentario")

    if estado_id is None:
        return Response({"detail": "Falta 'estado_trabajo_id'."}, status=status.HTTP_400_BAD_REQUEST)

    if not services.estado_existe(int(estado_id)):
        return Response({"detail": "El estado_trabajo indicado no existe."}, status=status.HTTP_400_BAD_REQUEST)

    data, error = services.actualizar_estado_orden(
        orden_id=int(orden_id),
        estado_id=int(estado_id),
        user_id=None,
        comentario=comentario,
    )
    if error:
        return Response({"detail": error}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(data, status=status.HTTP_200_OK)