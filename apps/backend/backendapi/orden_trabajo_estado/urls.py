from django.urls import path
from . import views

urlpatterns = [
    path("estados-trabajo/", views.listar_estados_trabajo_view, name="listar_estados_trabajo"),
    path("ordenes/", views.listar_ordenes_view, name="listar_ordenes_trabajo"),
    path("ordenes/<int:orden_id>/", views.obtener_orden_view, name="obtener_orden_trabajo"),
    path("ordenes/<int:orden_id>/estado/", views.actualizar_estado_orden_view, name="actualizar_estado_orden"),
]