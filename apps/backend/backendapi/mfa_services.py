"""
Servicios MFA - Manejo de autenticación de dos factores con Django
"""

import pyotp
import qrcode
import base64
from io import BytesIO
from django.utils import timezone
import secrets
import string
from typing import Optional, Tuple, Dict, Any
from datetime import timedelta
from .models import UserMFAProfile, MFAAttempt, MFASession

class MFAService:
    """
    Servicio principal para manejo de MFA TOTP usando Django
    """
    
    @staticmethod
    def generate_totp_secret() -> str:
        """Genera un secreto TOTP aleatorio"""
        return pyotp.random_base32()
    
    @staticmethod
    def generate_provisioning_uri(email: str, secret: str, issuer: str = "SmartCondominium") -> str:
        """Genera URI de provisioning para apps autenticadoras"""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(
            name=email,
            issuer_name=issuer
        )
    
    @staticmethod
    def generate_qr_code(provisioning_uri: str) -> str:
        """Genera código QR en base64 para el URI de provisioning"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, 'PNG')
        
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"
    
    @staticmethod
    def verify_totp_code(secret: str, code: str, window: int = 1) -> bool:
        """Verifica un código TOTP"""
        if not secret or not code:
            return False
            
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=window)
    
    @staticmethod
    def generate_backup_tokens(count: int = 10) -> list:
        """Genera tokens de respaldo"""
        chars = string.ascii_uppercase + string.digits
        tokens = []
        for _ in range(count):
            token = ''.join(secrets.choice(chars) for _ in range(8))
            tokens.append(token)
        return tokens
    
    @staticmethod
    def setup_mfa_for_user(user_id: str, email: str) -> Dict[str, Any]:
        """
        Configura MFA para un usuario usando Django
        """
        # Generar nuevo secreto
        secret = MFAService.generate_totp_secret()
        provisioning_uri = MFAService.generate_provisioning_uri(email, secret)
        qr_code = MFAService.generate_qr_code(provisioning_uri)
        
        # Crear o actualizar perfil MFA en Django
        try:
            profile, created = UserMFAProfile.objects.update_or_create(
                user_id=user_id,
                defaults={
                    'email': email,
                    'totp_secret': secret,
                    'mfa_enabled': False,
                    'backup_tokens': [],
                }
            )
        except Exception as e:
            raise Exception(f"Error guardando configuración MFA: {str(e)}")
        
        return {
            'secret': secret,
            'provisioning_uri': provisioning_uri,
            'qr_code': qr_code
        }
    
    @staticmethod
    def activate_mfa_for_user(user_id: str, email: str, totp_code: str) -> Tuple[bool, str, list]:
        """
        Activa MFA para un usuario después de verificar el código TOTP
        """
        try:
            # Obtener perfil MFA
            try:
                profile = UserMFAProfile.objects.get(user_id=user_id)
            except UserMFAProfile.DoesNotExist:
                return False, "MFA no configurado para este usuario", []
            
            if not profile.totp_secret:
                return False, "Secreto TOTP no encontrado", []
            
            # Verificar código TOTP
            if not MFAService.verify_totp_code(profile.totp_secret, totp_code):
                MFAService.log_mfa_attempt(user_id, email, False, 'setup', 'Código TOTP inválido')
                return False, "Código TOTP inválido", []
            
            # Generar tokens de respaldo
            backup_tokens = MFAService.generate_backup_tokens()
            
            # Activar MFA
            profile.mfa_enabled = True
            profile.backup_tokens = backup_tokens
            profile.save()
            
            MFAService.log_mfa_attempt(user_id, email, True, 'setup')
            
            return True, "MFA activado exitosamente", backup_tokens
            
        except Exception as e:
            return False, f"Error activando MFA: {str(e)}", []
    
    @staticmethod
    def disable_mfa_for_user(user_id: str, email: str) -> bool:
        """Desactiva MFA para un usuario"""
        try:
            profile = UserMFAProfile.objects.get(user_id=user_id)
            profile.mfa_enabled = False
            profile.totp_secret = None
            profile.backup_tokens = []
            profile.last_totp_used = None
            profile.save()
            return True
        except UserMFAProfile.DoesNotExist:
            return False
        except Exception:
            return False
    
    @staticmethod
    def verify_mfa_code(user_id: str, email: str, code: str, method: str = 'totp') -> Tuple[bool, str]:
        """
        Verifica un código MFA (TOTP o backup token)
        """
        try:
            try:
                profile = UserMFAProfile.objects.get(user_id=user_id)
            except UserMFAProfile.DoesNotExist:
                return False, "Usuario no encontrado"
            
            if not profile.mfa_enabled:
                return False, "MFA no está habilitado para este usuario"
            
            if method == 'totp':
                return MFAService._verify_totp_for_user(user_id, email, profile, code)
            elif method == 'backup':
                return MFAService._verify_backup_token(user_id, email, profile, code)
            else:
                return False, "Método de verificación inválido"
                
        except Exception as e:
            return False, f"Error verificando código MFA: {str(e)}"
    
    @staticmethod
    def _verify_totp_for_user(user_id: str, email: str, profile: UserMFAProfile, code: str) -> Tuple[bool, str]:
        """Verifica código TOTP para un usuario"""
        if not profile.totp_secret:
            MFAService.log_mfa_attempt(user_id, email, False, 'totp', 'Sin secreto TOTP configurado')
            return False, "TOTP no configurado"
        
        # Evitar reutilización del mismo código
        if profile.last_totp_used == code:
            MFAService.log_mfa_attempt(user_id, email, False, 'totp', 'Código ya utilizado')
            return False, "Código ya utilizado"
        
        # Verificar código TOTP
        if MFAService.verify_totp_code(profile.totp_secret, code):
            # Actualizar último código usado
            profile.last_totp_used = code
            profile.save()
            
            MFAService.log_mfa_attempt(user_id, email, True, 'totp')
            return True, "Código TOTP verificado exitosamente"
        else:
            MFAService.log_mfa_attempt(user_id, email, False, 'totp', 'Código TOTP inválido')
            return False, "Código TOTP inválido"
    
    @staticmethod
    def _verify_backup_token(user_id: str, email: str, profile: UserMFAProfile, token: str) -> Tuple[bool, str]:
        """Verifica token de respaldo"""
        token_upper = token.upper()
        
        if profile.use_backup_token(token_upper):
            MFAService.log_mfa_attempt(user_id, email, True, 'backup')
            return True, "Token de respaldo verificado exitosamente"
        else:
            MFAService.log_mfa_attempt(user_id, email, False, 'backup', 'Token de respaldo inválido')
            return False, "Token de respaldo inválido"
    
    @staticmethod
    def regenerate_backup_tokens(user_id: str, email: str) -> Optional[list]:
        """Regenera tokens de respaldo para un usuario"""
        try:
            profile = UserMFAProfile.objects.get(user_id=user_id)
            
            if not profile.mfa_enabled:
                return None
            
            backup_tokens = profile.generate_backup_tokens()
            return backup_tokens
        except UserMFAProfile.DoesNotExist:
            return None
        except Exception:
            return None
    
    @staticmethod
    def get_mfa_status(user_id: str, email: str) -> Dict[str, Any]:
        """Obtiene el estado MFA de un usuario"""
        try:
            profile = UserMFAProfile.objects.get(user_id=user_id)
            
            return {
                'mfa_enabled': profile.mfa_enabled,
                'backup_tokens_count': len(profile.backup_tokens),
                'last_setup': profile.updated_at.isoformat() if profile.updated_at else None,
                'has_totp_secret': bool(profile.totp_secret)
            }
        except UserMFAProfile.DoesNotExist:
            return {
                'mfa_enabled': False,
                'backup_tokens_count': 0,
                'last_setup': None,
                'has_totp_secret': False
            }
    
    @staticmethod
    def log_mfa_attempt(user_id: str, email: str, success: bool, method: str = 'totp', 
                       failure_reason: str = '', ip_address: str = '', user_agent: str = ''):
        """Registra un intento de autenticación MFA en Django"""
        try:
            MFAAttempt.objects.create(
                user_id=user_id,
                email=email,
                success=success,
                method=method,
                failure_reason=failure_reason,
                ip_address=ip_address or '0.0.0.0',
                user_agent=user_agent[:500] if user_agent else ''
            )
        except Exception:
            pass  # No fallar si no se puede registrar el log
    
    @staticmethod
    def get_user_mfa_attempts(user_id: str, email: str, limit: int = 10) -> list:
        """Obtiene los últimos intentos MFA de un usuario"""
        try:
            attempts = MFAAttempt.objects.filter(
                user_id=user_id
            ).order_by('-created_at')[:limit]
            
            return [
                {
                    'success': attempt.success,
                    'method': attempt.method,
                    'failure_reason': attempt.failure_reason,
                    'ip_address': attempt.ip_address,
                    'created_at': attempt.created_at.isoformat()
                }
                for attempt in attempts
            ]
        except Exception:
            return []
    
    @staticmethod
    def is_mfa_enabled(user_id: str) -> bool:
        """Verifica si un usuario tiene MFA habilitado"""
        try:
            profile = UserMFAProfile.objects.get(user_id=user_id)
            return profile.mfa_enabled
        except UserMFAProfile.DoesNotExist:
            return False
        except Exception:
            return False


class MFASessionService:
    """
    Servicio para manejo de sesiones MFA temporales usando Django
    """
    
    @staticmethod
    def create_mfa_session(user_id: str, email: str, step: str = 'pending_mfa', 
                          ip_address: str = '', user_agent: str = '') -> MFASession:
        """Crea una sesión MFA temporal"""
        # Limpiar sesiones expiradas del usuario
        MFASessionService.cleanup_expired_sessions(user_id)
        
        expires_at = timezone.now() + timedelta(minutes=10)  # 10 minutos
        
        session = MFASession.objects.create(
            user_id=user_id,
            email=email,
            step=step,
            expires_at=expires_at,
            ip_address=ip_address or '0.0.0.0',
            user_agent=user_agent[:500] if user_agent else ''
        )
        
        return session
    
    @staticmethod
    def get_session(token: str) -> Optional[MFASession]:
        """Obtiene una sesión por token"""
        try:
            session = MFASession.objects.get(session_token=token)
            if session.is_expired():
                session.delete()
                return None
            return session
        except MFASession.DoesNotExist:
            return None
    
    @staticmethod
    def update_session_step(token: str, step: str) -> bool:
        """Actualiza el paso de una sesión"""
        session = MFASessionService.get_session(token)
        if session:
            session.step = step
            session.save()
            return True
        return False
    
    @staticmethod
    def cleanup_expired_sessions(user_id: str = None):
        """Limpia sesiones expiradas"""
        query = MFASession.objects.filter(expires_at__lt=timezone.now())
        if user_id:
            query = query.filter(user_id=user_id)
        query.delete()
    
    @staticmethod
    def delete_session(token: str) -> bool:
        """Elimina una sesión"""
        try:
            MFASession.objects.get(session_token=token).delete()
            return True
        except MFASession.DoesNotExist:
            return False