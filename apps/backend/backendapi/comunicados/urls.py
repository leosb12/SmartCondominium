from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ComunicadosViewSet

router = DefaultRouter()
# ruta base: /api/comunicados/  → GET (list), POST (create)
router.register(r'', ComunicadosViewSet, basename='comunicados')

urlpatterns = router.urls
