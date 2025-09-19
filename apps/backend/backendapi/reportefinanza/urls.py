from django.urls import path
from .views import GenerarReporteFinancieroView

urlpatterns = [
    path("financieros/generar", GenerarReporteFinancieroView.as_view(), name="generar-reporte-financiero"),
]
