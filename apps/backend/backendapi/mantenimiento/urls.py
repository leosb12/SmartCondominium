# backendapi/mantenimiento/urls.py
from django.urls import path
from .views import (
    PreventivoCreateView, AsignarOrdenView, MisOrdenesView, ListarPersonalView, 
    CatalogoListView, HoraListView, OrdenesPendientesView, TecnicosConNombresView
)

urlpatterns = [
    path("preventivos/", PreventivoCreateView.as_view(), name="crear-preventivo"),    # POST
    path("asignaciones/", AsignarOrdenView.as_view(), name="asignar-orden"),          # POST
    path("mis-ordenes/", MisOrdenesView.as_view(), name="mis-ordenes"),               # GET
    path("personal/", ListarPersonalView.as_view(), name="listar-personal"),          # GET ?tipo=interno|externo
    path("ordenes-pendientes/", OrdenesPendientesView.as_view(), name="ordenes-pendientes"), # GET
    path("tecnicos/", TecnicosConNombresView.as_view(), name="tecnicos-con-nombres"), # GET ?tipo=interno|externo

    path("catalogo/", CatalogoListView.as_view(), name="catalogo-list"),
    path("hora/", HoraListView.as_view(), name="hora-list"),
]