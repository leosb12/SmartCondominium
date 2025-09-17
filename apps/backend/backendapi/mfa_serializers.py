"""
Serializers para el sistema MFA
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserMFAProfile, MFAAttempt, MFASession
import re

class MFASetupSerializer(serializers.Serializer):
    """Serializer para configurar MFA inicial"""
    pass  # No requiere campos de entrada

class MFAActivateSerializer(serializers.Serializer):
    """Serializer para activar MFA con código TOTP"""
    totp_code = serializers.CharField(
        max_length=6,
        min_length=6,
        help_text="Código TOTP de 6 dígitos de la app autenticadora"
    )
    
    def validate_totp_code(self, value):
        """Valida que el código TOTP sea numérico de 6 dígitos"""
        if not re.match(r'^\d{6}$', value):
            raise serializers.ValidationError(
                "El código TOTP debe ser de 6 dígitos numéricos"
            )
        return value

class MFAVerifySerializer(serializers.Serializer):
    """Serializer para verificar códigos MFA"""
    code = serializers.CharField(
        max_length=8,
        min_length=6,
        help_text="Código TOTP (6 dígitos) o token de respaldo (8 caracteres)"
    )
    method = serializers.ChoiceField(
        choices=['totp', 'backup'],
        default='totp',
        help_text="Método de verificación: 'totp' o 'backup'"
    )
    
    def validate_code(self, value):
        """Valida el formato del código según el método"""
        method = self.initial_data.get('method', 'totp')
        
        if method == 'totp':
            if not re.match(r'^\d{6}$', value):
                raise serializers.ValidationError(
                    "El código TOTP debe ser de 6 dígitos numéricos"
                )
        elif method == 'backup':
            if not re.match(r'^[A-Z0-9]{8}$', value.upper()):
                raise serializers.ValidationError(
                    "El token de respaldo debe ser de 8 caracteres alfanuméricos"
                )
            return value.upper()
        
        return value

class MFADisableSerializer(serializers.Serializer):
    """Serializer para desactivar MFA"""
    confirmation = serializers.CharField(
        max_length=20,
        help_text="Escriba 'DISABLE MFA' para confirmar"
    )
    
    def validate_confirmation(self, value):
        """Valida que la confirmación sea correcta"""
        if value.upper() != 'DISABLE MFA':
            raise serializers.ValidationError(
                "Debe escribir 'DISABLE MFA' para confirmar la desactivación"
            )
        return value

class MFAStatusSerializer(serializers.ModelSerializer):
    """Serializer para mostrar el estado MFA del usuario"""
    backup_tokens_count = serializers.SerializerMethodField()
    last_setup = serializers.DateTimeField(source='updated_at', read_only=True)
    
    class Meta:
        model = UserMFAProfile
        fields = [
            'mfa_enabled',
            'backup_tokens_count', 
            'last_setup',
            'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_backup_tokens_count(self, obj):
        """Retorna la cantidad de tokens de respaldo disponibles"""
        return len(obj.backup_tokens) if obj.backup_tokens else 0

class MFASetupResponseSerializer(serializers.Serializer):
    """Serializer para la respuesta de configuración MFA"""
    secret = serializers.CharField(
        help_text="Secreto TOTP para configuración manual"
    )
    qr_code = serializers.CharField(
        help_text="Código QR en base64 para escanear con la app"
    )
    provisioning_uri = serializers.CharField(
        help_text="URI de provisioning para apps autenticadoras"
    )
    instructions = serializers.SerializerMethodField()
    
    def get_instructions(self, obj):
        """Retorna instrucciones de configuración"""
        return {
            "step_1": "Descarga una app autenticadora (Google Authenticator, Authy, etc.)",
            "step_2": "Escanea el código QR o ingresa el secreto manualmente",
            "step_3": "Ingresa el código de 6 dígitos para activar MFA",
            "apps_recomendadas": [
                "Google Authenticator",
                "Microsoft Authenticator", 
                "Authy",
                "1Password",
                "Bitwarden"
            ]
        }

class MFAActivateResponseSerializer(serializers.Serializer):
    """Serializer para la respuesta de activación MFA"""
    success = serializers.BooleanField()
    message = serializers.CharField()
    backup_tokens = serializers.ListField(
        child=serializers.CharField(),
        help_text="Tokens de respaldo para usar si pierdes acceso a tu app"
    )
    warning = serializers.SerializerMethodField()
    
    def get_warning(self, obj):
        """Retorna advertencia sobre tokens de respaldo"""
        return {
            "importante": "Guarda estos tokens de respaldo en un lugar seguro",
            "uso": "Cada token solo se puede usar una vez",
            "renovacion": "Puedes generar nuevos tokens desde tu perfil",
            "acceso": "Estos tokens te permitirán acceder si pierdes tu teléfono"
        }

class MFAVerifyResponseSerializer(serializers.Serializer):
    """Serializer para la respuesta de verificación MFA"""
    success = serializers.BooleanField()
    message = serializers.CharField()
    session_token = serializers.CharField(
        required=False,
        help_text="Token de sesión para autenticación completa"
    )

class MFAAttemptSerializer(serializers.ModelSerializer):
    """Serializer para mostrar intentos de autenticación MFA"""
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = MFAAttempt
        fields = [
            'id',
            'username',
            'success',
            'method',
            'failure_reason',
            'ip_address',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class BackupTokensSerializer(serializers.Serializer):
    """Serializer para generar nuevos tokens de respaldo"""
    confirmation = serializers.CharField(
        max_length=30,
        help_text="Escriba 'REGENERATE TOKENS' para confirmar"
    )
    
    def validate_confirmation(self, value):
        """Valida que la confirmación sea correcta"""
        if value.upper() != 'REGENERATE TOKENS':
            raise serializers.ValidationError(
                "Debe escribir 'REGENERATE TOKENS' para confirmar"
            )
        return value

class BackupTokensResponseSerializer(serializers.Serializer):
    """Serializer para la respuesta de tokens de respaldo"""
    backup_tokens = serializers.ListField(
        child=serializers.CharField(),
        help_text="Nuevos tokens de respaldo"
    )
    message = serializers.CharField()
    warning = serializers.SerializerMethodField()
    
    def get_warning(self, obj):
        """Retorna advertencia sobre los nuevos tokens"""
        return {
            "importante": "Los tokens anteriores ya no son válidos",
            "guardar": "Guarda estos nuevos tokens en un lugar seguro",
            "cantidad": "Se han generado 10 nuevos tokens de respaldo"
        }

class MFASessionSerializer(serializers.ModelSerializer):
    """Serializer para sesiones MFA"""
    username = serializers.CharField(source='user.username', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = MFASession
        fields = [
            'session_token',
            'username',
            'step',
            'is_expired',
            'expires_at',
            'created_at'
        ]
        read_only_fields = ['session_token', 'created_at']
    
    def get_is_expired(self, obj):
        """Indica si la sesión ha expirado"""
        return obj.is_expired()

# Serializers de respuesta para documentación de API
class StandardResponseSerializer(serializers.Serializer):
    """Serializer estándar para respuestas de la API"""
    success = serializers.BooleanField()
    message = serializers.CharField()
    data = serializers.JSONField(required=False)
    errors = serializers.JSONField(required=False)

class ErrorResponseSerializer(serializers.Serializer):
    """Serializer para respuestas de error"""
    success = serializers.BooleanField(default=False)
    message = serializers.CharField()
    errors = serializers.JSONField(required=False)
    code = serializers.CharField(required=False)