from django.urls import path
from .views import VisitorMatchView

urlpatterns = [
    path("visitors/match", VisitorMatchView.as_view(), name="visitors-match"),
]