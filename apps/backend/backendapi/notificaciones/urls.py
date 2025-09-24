from django.urls import path
from .views import send_test_email, send_test_push, process_pending, run_reminders, register_push_token

urlpatterns = [
    path("send-test-email", send_test_email),
    path("send-test-push", send_test_push),
    path("process-pending", process_pending),
    path("run-reminders", run_reminders),
    path("register-push-token", register_push_token),
]
