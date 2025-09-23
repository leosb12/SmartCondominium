from django.urls import path
from .views import RegistroIngresoReporteView

app_name = "reportesConsolidados"

urlpatterns = [
    path("ingresos/", RegistroIngresoReporteView.as_view(), name="reporte-ingresos"),
]