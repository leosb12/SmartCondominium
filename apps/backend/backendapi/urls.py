from django.urls import path
from backendapi import views
urlpatterns = [
    path("login/", views.login, name="login"),
    path("register/", views.register, name="register"),
    path("forgot-password/", views.forgot_password, name="forgot_password"),
    path("reset-password/", views.reset_password, name="reset_password"),
]
