from django.urls import path
from .views import VisitorDataView, VisitorMatchView

urlpatterns = [
    path("visitor-data/<str:visitor_id>/", VisitorDataView.as_view(), name="visitor-data"),
    path("visitors/match", VisitorMatchView.as_view(), name="visitors-match"),
]