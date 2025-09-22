from django.urls import path
from . import views

urlpatterns = [
    path("", views.CostoMaterialListCreateView.as_view(), name="costo_material_list_create"),
    path("<int:pk>/", views.CostoMaterialDetailView.as_view(), name="costo_material_detail"),
]