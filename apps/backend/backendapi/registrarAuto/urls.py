from django.urls import path
from .views import AutoListCreateView, AutoRetrieveUpdateDestroyView

urlpatterns = [
    path('', AutoListCreateView.as_view(), name='auto-list-create'),
    path('<str:placa>/', AutoRetrieveUpdateDestroyView.as_view(), name='auto-detail'),
]