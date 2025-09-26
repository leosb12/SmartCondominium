from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Anomalia
from .serializers import AnomaliaSerializer

class AnomaliaListAPIView(generics.ListAPIView):
    queryset = Anomalia.objects.all().order_by('-fecha')
    serializer_class = AnomaliaSerializer

@api_view(['PATCH'])
def set_anomalia_procesado(request, anomalia_id):
    try:
        anomalia = Anomalia.objects.get(pk=anomalia_id)
    except Anomalia.DoesNotExist:
        return Response({"error": "Anomalía no encontrada."}, status=status.HTTP_404_NOT_FOUND)
    procesado = request.data.get("procesado")
    if procesado is None:
        return Response({"error": "Debe enviar el campo 'procesado'."}, status=status.HTTP_400_BAD_REQUEST)
    anomalia.procesado = bool(procesado)
    anomalia.save()
    serializer = AnomaliaSerializer(anomalia)
    return Response(serializer.data, status=status.HTTP_200_OK)