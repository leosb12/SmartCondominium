from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AreaSocialViewSet, ReservaViewSet

# Si quieres que funcione sin barra final, cambia a: DefaultRouter(trailing_slash=False)
router = DefaultRouter()
router.register(r"areas-sociales", AreaSocialViewSet, basename="areas-sociales")
router.register(r"reservas-areas", ReservaViewSet, basename="reservas-areas")

urlpatterns = [
    path("", include(router.urls)),
]