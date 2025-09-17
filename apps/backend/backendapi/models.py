import uuid
import secrets
import string
from django.db import models
from django.utils import timezone
from datetime import timedelta

class TipoMulta(models.Model):
    id = models.BigAutoField(primary_key=True)
    nombre = models.TextField()

    class Meta:
        db_table = "tipo_multa"
        managed = False


class Propiedad(models.Model):
    id = models.BigAutoField(primary_key=True)
    nro_casa = models.TextField(null=True, blank=True)
    m2 = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "propiedad"
        managed = False


class Multa(models.Model):
    id = models.BigAutoField(primary_key=True)
    propiedad = models.ForeignKey(
        Propiedad,
        db_column="propiedad_id",
        on_delete=models.DO_NOTHING,
        related_name="multas",
    )
    tipo_multa = models.ForeignKey(
        TipoMulta,
        db_column="tipo_multa_id",
        on_delete=models.DO_NOTHING,
        related_name="multas",
    )
    fecha = models.DateField()
    total = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = "multas"
        managed = False


class CargoMulta(models.Model):
    cargo_id = models.BigIntegerField()
    multa = models.ForeignKey(
        Multa,
        db_column="multa_id",
        on_delete=models.DO_NOTHING,
        related_name="cargos",
        primary_key=True,  # para que Django tenga una PK, aunque en DB sea compuesta
    )

    class Meta:
        db_table = "cargo_multa"
        managed = False
        unique_together = (("cargo_id", "multa"),)


class UserMFAProfile(models.Model):
    """
    Perfil MFA para usuarios - almacena configuración 2FA
    Usa el UUID de Supabase como identificador pero vive en Django
    """
    user_id = models.UUIDField(primary_key=True, help_text="UUID del usuario de Supabase")
    email = models.EmailField(help_text="Email del usuario para referencia")
    totp_secret = models.CharField(max_length=32, blank=True, null=True)
    mfa_enabled = models.BooleanField(default=False)
    backup_tokens = models.JSONField(default=list, blank=True)
    last_totp_used = models.CharField(max_length=6, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_mfa_profiles'
        verbose_name = 'Perfil MFA'
        verbose_name_plural = 'Perfiles MFA'
    
    def __str__(self):
        return f"MFA Profile for {self.email}"
    
    def generate_backup_tokens(self, count=10):
        """Genera tokens de respaldo"""
        chars = string.ascii_uppercase + string.digits
        tokens = []
        for _ in range(count):
            token = ''.join(secrets.choice(chars) for _ in range(8))
            tokens.append(token)
        
        self.backup_tokens = tokens
        self.save()
        return tokens
    
    def use_backup_token(self, token):
        """Usa un token de respaldo (solo una vez)"""
        if token in self.backup_tokens:
            self.backup_tokens.remove(token)
            self.save()
            return True
        return False

class MFAAttempt(models.Model):
    """Registro de intentos de autenticación MFA"""
    user_id = models.UUIDField(help_text="UUID del usuario de Supabase")
    email = models.EmailField(help_text="Email del usuario para referencia")
    success = models.BooleanField(default=False)
    method = models.CharField(max_length=10, choices=[
        ('totp', 'TOTP'),
        ('backup', 'Backup Token'),
        ('setup', 'Setup')
    ])
    failure_reason = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(default='0.0.0.0')
    user_agent = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'mfa_attempts'
        ordering = ['-created_at']
        verbose_name = 'Intento MFA'
        verbose_name_plural = 'Intentos MFA'

class MFASession(models.Model):
    """Sesiones temporales para proceso MFA"""
    session_token = models.UUIDField(default=uuid.uuid4, unique=True)
    user_id = models.UUIDField(help_text="UUID del usuario de Supabase")
    email = models.EmailField(help_text="Email del usuario para referencia")
    step = models.CharField(max_length=20, choices=[
        ('pending_mfa', 'Pendiente MFA'),
        ('mfa_verified', 'MFA Verificado'),
        ('completed', 'Completado')
    ], default='pending_mfa')
    expires_at = models.DateTimeField()
    ip_address = models.GenericIPAddressField(default='0.0.0.0')
    user_agent = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'mfa_sessions'
        ordering = ['-created_at']
        verbose_name = 'Sesión MFA'
        verbose_name_plural = 'Sesiones MFA'
    
    def is_expired(self):
        return timezone.now() > self.expires_at