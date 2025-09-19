# backendapi/reportefinanza/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .permissions import IsAdminByBearer
from .services import build_financial_report

class GenerarReporteFinancieroView(APIView):
    authentication_classes = []           # evitar Auth global (Session/Token) para que llegue Authorization header
    permission_classes = [IsAdminByBearer]

    def post(self, request):
        filtros = request.data or {}
        dfrom = filtros.get("desde")
        dto   = filtros.get("hasta")
        propiedad_id = filtros.get("propiedad_id")
        try:
            pid = int(propiedad_id) if propiedad_id not in (None, "",) else None
        except Exception:
            pid = None

        try:
            report = build_financial_report(dfrom, dto, pid)
            return Response(report, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Error generando reporte: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
