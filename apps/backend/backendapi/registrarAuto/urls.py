from django.urls import path
from .views import AutoListCreateView, AutoRetrieveUpdateDestroyView, MisAutosView

urlpatterns = [
    path('', AutoListCreateView.as_view(), name='auto-list-create'),
    path('mis-autos/', MisAutosView.as_view(), name='mis-autos'),
    path('<str:placa>/', AutoRetrieveUpdateDestroyView.as_view(), name='auto-detail'),
]