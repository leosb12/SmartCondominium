from django.db import migrations, models
import uuid

class Migration(migrations.Migration):
    dependencies = [
        ('backendapi', '0001_initial'),  # Ajusta según tu última migración
    ]

    operations = [
        migrations.CreateModel(
            name='UserMFAProfile',
            fields=[
                ('user_id', models.UUIDField(primary_key=True, help_text='UUID del usuario de Supabase')),
                ('email', models.EmailField(help_text='Email del usuario para referencia')),
                ('totp_secret', models.CharField(max_length=32, blank=True, null=True)),
                ('mfa_enabled', models.BooleanField(default=False)),
                ('backup_tokens', models.JSONField(default=list, blank=True)),
                ('last_totp_used', models.CharField(max_length=6, blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'user_mfa_profiles',
                'verbose_name': 'Perfil MFA',
                'verbose_name_plural': 'Perfiles MFA',
            },
        ),
        migrations.CreateModel(
            name='MFAAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.UUIDField(help_text='UUID del usuario de Supabase')),
                ('email', models.EmailField(help_text='Email del usuario para referencia')),
                ('success', models.BooleanField(default=False)),
                ('method', models.CharField(max_length=10, choices=[('totp', 'TOTP'), ('backup', 'Backup Token'), ('setup', 'Setup')])),
                ('failure_reason', models.CharField(max_length=255, blank=True)),
                ('ip_address', models.GenericIPAddressField(default='0.0.0.0')),
                ('user_agent', models.CharField(max_length=500, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'mfa_attempts',
                'ordering': ['-created_at'],
                'verbose_name': 'Intento MFA',
                'verbose_name_plural': 'Intentos MFA',
            },
        ),
        migrations.CreateModel(
            name='MFASession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_token', models.UUIDField(default=uuid.uuid4, unique=True)),
                ('user_id', models.UUIDField(help_text='UUID del usuario de Supabase')),
                ('email', models.EmailField(help_text='Email del usuario para referencia')),
                ('step', models.CharField(max_length=20, choices=[('pending_mfa', 'Pendiente MFA'), ('mfa_verified', 'MFA Verificado'), ('completed', 'Completado')], default='pending_mfa')),
                ('expires_at', models.DateTimeField()),
                ('ip_address', models.GenericIPAddressField(default='0.0.0.0')),
                ('user_agent', models.CharField(max_length=500, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'mfa_sessions',
                'ordering': ['-created_at'],
                'verbose_name': 'Sesión MFA',
                'verbose_name_plural': 'Sesiones MFA',
            },
        ),
    ]
