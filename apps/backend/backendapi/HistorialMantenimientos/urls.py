from django.urls import path
from .views import HistorialMantenimientoList, HistorialMantenimientoDetail

urlpatterns = [
    path("", HistorialMantenimientoList.as_view(), name="historial-mantenimiento-list"),
    path("<int:orden_id>/", HistorialMantenimientoDetail.as_view(), name="historial-mantenimiento-detail"),
]