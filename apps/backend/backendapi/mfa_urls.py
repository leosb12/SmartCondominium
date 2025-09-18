"""
URLs para el sistema MFA TOTP
"""

from django.urls import path
from . import mfa_views

# Prefijo: /api/mfa/
urlpatterns = [
    # Configuración MFA
    path('setup/', mfa_views.setup_mfa, name='mfa_setup'),
    path('activate/', mfa_views.activate_mfa, name='mfa_activate'),
    path('verify/', mfa_views.verify_mfa, name='mfa_verify'),
    path('disable/', mfa_views.disable_mfa, name='mfa_disable'),
    
    # Estado y gestión
    path('status/', mfa_views.mfa_status, name='mfa_status'),
    path('backup-tokens/', mfa_views.regenerate_backup_tokens, name='mfa_backup_tokens'),
    path('attempts/', mfa_views.mfa_attempts, name='mfa_attempts'),
]