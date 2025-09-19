from django.urls import path
from .views import MensajeListCreateView, ConversacionView

app_name = "mensaje"

urlpatterns = [
    path("mensajes/", MensajeListCreateView.as_view(), name="mensajes"),
    path("mensajes/conversacion/<uuid:other_id>/", ConversacionView.as_view(), name="conversacion"),
]