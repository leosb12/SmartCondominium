# backendapi/analytics/urls.py
from django.urls import re_path
from .views import (
    DashboardView,
    MorosidadView,
    AreasUsoView,
    SeguridadView,
    ExportView,
)

urlpatterns = [
    re_path(r"^dashboard/?$",  DashboardView.as_view(),  name="analytics-dashboard"),
    re_path(r"^morosidad/?$",  MorosidadView.as_view(),  name="analytics-morosidad"),
    re_path(r"^areas-uso/?$",  AreasUsoView.as_view(),   name="analytics-areas-uso"),
    re_path(r"^seguridad/?$",  SeguridadView.as_view(),  name="analytics-seguridad"),
    re_path(r"^export/?$",     ExportView.as_view(),     name="analytics-export"),
]
