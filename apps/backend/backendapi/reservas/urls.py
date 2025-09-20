from django.urls import path
from . import views

urlpatterns = [
    # Area social endpoints (admin only)
    path('areas-sociales/', views.list_create_area_social, name='areas-sociales'),
    path('areas-sociales/<int:area_id>/', views.get_update_delete_area_social, name='area-social-detail'),

    # Reserva endpoints (authenticated users)
    path('reservas/', views.list_create_reserva, name='reservas'),
    path('reservas/<int:reserva_id>/', views.get_update_delete_reserva, name='reserva-detail'),

    # Additional endpoint for user's own reservas
    path('mis-reservas/', views.get_user_reservas, name='mis-reservas'),

    # Additional endpoints for supporting data
    path('mis-propiedades/', views.get_user_propiedades, name='mis-propiedades'),
    path('horas/', views.get_all_horas, name='horas'),
    path('areas-disponibles/', views.get_areas_sociales_disponibles, name='areas-disponibles'),
]