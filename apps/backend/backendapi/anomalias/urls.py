from django.urls import path
from .views import AnomaliaListAPIView, set_anomalia_procesado

urlpatterns = [
    path('', AnomaliaListAPIView.as_view(), name='listar_anomalias'),
    path('<int:anomalia_id>/procesado/', set_anomalia_procesado, name='set_anomalia_procesado'),
]