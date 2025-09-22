from django.urls import path
from .views import EstadoDeCuentaView

urlpatterns = [
    path("estado", EstadoDeCuentaView.as_view(), name="estado-cuenta"),
]
