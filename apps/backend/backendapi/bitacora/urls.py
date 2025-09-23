from django.urls import path
from .views import BitacoraListAPIView, BitacoraDetailAPIView

urlpatterns = [
    path("bitacora/", BitacoraListAPIView.as_view(), name="bitacora-list"),
    path("bitacora/<int:pk>/", BitacoraDetailAPIView.as_view(), name="bitacora-detail"),
]