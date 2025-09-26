from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import fetch_visitor_data
from .serializers import VisitorSerializer
import requests

# Usa siempre la URL de ngrok, tanto en local como en producción
IDENTITY_API_BASE = "https://daryl-draftable-overdogmatically.ngrok-free.dev"

class VisitorDataView(APIView):
    def get(self, request, visitor_id):
        visitor = fetch_visitor_data(visitor_id)
        if visitor:
            serializer = VisitorSerializer(visitor)
            return Response(serializer.data)
        return Response({"detail": "Visitor not found"}, status=status.HTTP_404_NOT_FOUND)

class VisitorMatchView(APIView):
    def post(self, request):
        face_image = request.FILES.get("face_image")
        if not face_image:
            return Response({"detail": "No se envió imagen"}, status=status.HTTP_400_BAD_REQUEST)
        resp = requests.post(
            f"{IDENTITY_API_BASE}/visitors/match",
            files={"face_image": (face_image.name, face_image.read(), face_image.content_type)},
            headers={"X-IDENTITY-KEY": "clave-interna-identity"},
            timeout=20,
        )
        if resp.status_code != 200:
            return Response({"detail": "Error al detectar visitante"}, status=status.HTTP_502_BAD_GATEWAY)
        data = resp.json()
        if data.get("match") and data.get("visitor_id"):
            return Response(data)
        else:
            return Response({"match": False})