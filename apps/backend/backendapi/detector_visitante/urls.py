from django.urls import path
from .views import VisitorMatchView

urlpatterns = [
    path("visitor-data/<str:visitor_id>/", name="visitor-data"),
    path("visitors/match", VisitorMatchView.as_view(), name="visitors-match"),
]