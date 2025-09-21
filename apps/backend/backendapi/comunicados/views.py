# backendapi/comunicados/views.py
from rest_framework import status, viewsets
from rest_framework.response import Response

from .serializers import ComunicadoCreateSerializer
from .permissions import IsAdminSupabase
from .services import crear_comunicado


class ComunicadosViewSet(viewsets.ViewSet):
    """
    /api/comunicados/   -> GET (list opcional), POST (create)
    """
    permission_classes = [IsAdminSupabase]
    serializer_class = ComunicadoCreateSerializer

    def get_serializer(self, *args, **kwargs):
        """DRF llama a get_serializer en ViewSet; devolvemos nuestro serializer."""
        return self.serializer_class(*args, **kwargs)

    # Opcional: habilita GET /api/comunicados/ (puedes quitarlo si no lo usas)
    def list(self, request, *args, **kwargs):
        return Response({"detail": "Listing not implemented yet."}, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        """
        POST /api/comunicados/
        - Si NO hay scheduled_for => publica ahora (published_at = now())
        - Si hay scheduled_for    => queda programado (published_at = NULL)
        """
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # user_id inyectado por permiso; si no, fallback
            user_id = getattr(request, "user_id", None)
            if not user_id:
                from backendapi.roles.auth_helpers import get_user_id_from_request
                user_id = get_user_id_from_request(request)

            if not user_id:
                return Response(
                    {"success": False, "error": "Token inválido o faltante"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            row = crear_comunicado(serializer.validated_data, user_id=user_id)
            return Response({"success": True, "data": row}, status=status.HTTP_201_CREATED)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
