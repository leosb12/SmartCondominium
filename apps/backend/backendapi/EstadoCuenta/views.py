from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from backendapi.roles.auth_helpers import require_auth

from .serializers import EstadoCuentaQuerySerializer, EstadoCuentaResponseSerializer
from .services import get_estado_de_cuenta

class EstadoDeCuentaView(APIView):
    @require_auth
    def get(self, request):
        s = EstadoCuentaQuerySerializer(data=request.query_params)
        s.is_valid(raise_exception=True)

        data = get_estado_de_cuenta(
            usuario_id=request.user_id,
            filtros=s.validated_data
        )
        out = EstadoCuentaResponseSerializer(data)
        return Response(out.data, status=status.HTTP_200_OK)
