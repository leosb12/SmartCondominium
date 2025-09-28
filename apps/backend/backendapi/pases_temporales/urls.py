# backendapi/pases_temporales/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("crear/", views.crear, name="pases_crear"),
    path("validar/", views.validar, name="pases_validar"),
    path("listar/", views.listar, name="pases_listar"),
    path("<uuid:pass_id>/revocar/", views.revocar, name="pases_revocar"),
]
