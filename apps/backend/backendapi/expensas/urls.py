from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExpensasViewSet

router = DefaultRouter()
router.register(r"expensas", ExpensasViewSet, basename="expensas")

urlpatterns = [path("", include(router.urls))]
