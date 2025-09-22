from django.urls import path
from .views import CrearOrdenPagoView, ComprobantesView

urlpatterns = [
    path("orden", CrearOrdenPagoView.as_view(), name="crear-orden-pago"),
    path("comprobantes", ComprobantesView.as_view(), name="pagos-comprobantes"),
]
