from django.urls import path, include
from rest_framework.routers import DefaultRouter
from backendapi import views

router = DefaultRouter()
router.register(r"tipo-multa", views.TipoMultaViewSet, basename="tipo-multa")
router.register(r"multas", views.MultaViewSet, basename="multas")
router.register(r"propiedades", views.PropiedadViewSet, basename="propiedades")
router.register(r"cargo-multa", views.CargoMultaViewSet, basename="cargo-multa")

urlpatterns = [
    path("login/", views.login, name="login"),
    path("register/", views.register, name="register"),
    path("forgot-password/", views.forgot_password, name="forgot_password"),
    path("reset-password/", views.reset_password, name="reset_password"),
    path("me/", views.me, name="me"),

    # Endpoints REST
    path("", include(router.urls)),

    # URLs MFA
    path("mfa/", include("backendapi.mfa_urls")),

    # URLs Gestión de Roles
    path("roles/", include("backendapi.roles.urls")),

    # URLs Administración de Finanzas
    path("admin/finanzas/", include("backendapi.finance_admin.urls")),

    # URLs Reservas de Áreas Sociales
    path("reservas/", include("backendapi.reservas.urls")),

    path("", include("backendapi.expensas.urls")),

    path("reportesfinanza/", include("backendapi.reportefinanza.urls")),

    path("", include("backendapi.mensaje.urls")),

    path("users/", views.users, name="users"),

    path("mantenimiento/", include("backendapi.mantenimiento.urls")),

    path("", include("backendapi.historialComunicados.urls")),

    path("", include("backendapi.ReporteAreasComunes.urls")),

    # Estado de Órdenes de Trabajo
    path("orden-trabajo-estado/", include("backendapi.orden_trabajo_estado.urls")),

    # Comunicados
    path("comunicados/", include("backendapi.comunicados.urls")),

    # Costo de materiales y mano de obra
    path("costo-material/", include("backendapi.costo_material.urls")),

# Historial de Mantenimiento (nuevo, sin VIEW)
    path("historial-mantenimiento/", include("backendapi.HistorialMantenimientos.urls")),

    # backendapi/urls.py (además de lo que ya tienes)
    path("finanzas/", include("backendapi.EstadoCuenta.urls")),
    path("pagos/", include("backendapi.Pagos.urls")),
    path("reportes-consolidados/", include("backendapi.reportesConsolidados.urls")),
    path("", include("backendapi.bitacora.urls")),
]