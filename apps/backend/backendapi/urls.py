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
]
