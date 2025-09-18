"""
Vistas para el sistema MFA TOTP usando Django
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from core.supabase_client import supabase  # Solo para validar tokens
from .mfa_services import MFAService, MFASessionService

def get_client_info(request):
    """Extrae información del cliente"""
    ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '0.0.0.0'))
    if ',' in ip:
        ip = ip.split(',')[0].strip()
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    return ip, user_agent

def get_user_from_token(request):
    """Obtiene usuario de Supabase desde el token - solo para validación"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, "Falta token (Authorization: Bearer <token>)"
    
    access_token = auth.split(" ", 1)[1].strip()
    try:
        res = supabase.auth.get_user(access_token)
        user = getattr(res, "user", None)
        if not user:
            return None, "Token inválido o expirado"
        return user, None
    except Exception as e:
        return None, f"Error validando token: {str(e)}"

def ok(data, code=200):
    return JsonResponse(data, status=code, safe=False)

def bad(msg, code=400):
    return JsonResponse({"success": False, "error": msg}, status=code)

@csrf_exempt
def setup_mfa(request):
    """Configurar MFA para un usuario"""
    if request.method != "POST":
        return bad("Método no permitido", 405)
    
    user, error = get_user_from_token(request)
    if error:
        return bad(error, 401)
    
    try:
        setup_data = MFAService.setup_mfa_for_user(user.id, user.email)
        
        return ok({
            "success": True,
            "message": "MFA configurado. Escanea el código QR con tu app autenticadora.",
            "data": {
                "secret": setup_data['secret'],
                "qr_code": setup_data['qr_code'],
                "provisioning_uri": setup_data['provisioning_uri'],
                "instructions": {
                    "step_1": "Descarga una app autenticadora (Google Authenticator, Authy, etc.)",
                    "step_2": "Escanea el código QR o ingresa el secreto manualmente",
                    "step_3": "Ingresa el código de 6 dígitos para activar MFA"
                }
            }
        })
    except Exception as e:
        return bad(f"Error configurando MFA: {str(e)}", 500)

@csrf_exempt
def activate_mfa(request):
    """Activar MFA con código TOTP"""
    if request.method != "POST":
        return bad("Método no permitido", 405)
    
    user, error = get_user_from_token(request)
    if error:
        return bad(error, 401)
    
    try:
        data = json.loads(request.body)
        totp_code = data.get("totp_code", "").strip()
        
        if not totp_code or len(totp_code) != 6:
            return bad("Código TOTP de 6 dígitos requerido", 400)
        
        success, message, backup_tokens = MFAService.activate_mfa_for_user(user.id, user.email, totp_code)
        
        if success:
            return ok({
                "success": True,
                "message": message,
                "backup_tokens": backup_tokens,
                "warning": {
                    "importante": "Guarda estos tokens de respaldo en un lugar seguro",
                    "uso": "Cada token solo se puede usar una vez",
                    "acceso": "Estos tokens te permitirán acceder si pierdes tu teléfono"
                }
            })
        else:
            return bad(message, 400)
            
    except Exception as e:
        return bad(f"Error activando MFA: {str(e)}", 500)

@csrf_exempt
def verify_mfa(request):
    """Verificar código MFA (TOTP o backup token)"""
    if request.method != "POST":
        return bad("Método no permitido", 405)
    
    user, error = get_user_from_token(request)
    if error:
        return bad(error, 401)
    
    try:
        data = json.loads(request.body)
        code = data.get("code", "").strip()
        method = data.get("method", "totp")
        
        if not code:
            return bad("Código requerido", 400)
        
        success, message = MFAService.verify_mfa_code(user.id, user.email, code, method)
        
        if success:
            return ok({
                "success": True,
                "message": message
            })
        else:
            return bad(message, 400)
            
    except Exception as e:
        return bad(f"Error verificando MFA: {str(e)}", 500)

@csrf_exempt
def disable_mfa(request):
    """Desactivar MFA para un usuario"""
    if request.method != "POST":
        return bad("Método no permitido", 405)
    
    user, error = get_user_from_token(request)
    if error:
        return bad(error, 401)
    
    try:
        data = json.loads(request.body)
        confirmation = data.get("confirmation", "").strip()
        
        if confirmation.upper() != "DISABLE MFA":
            return bad("Debe escribir 'DISABLE MFA' para confirmar", 400)
        
        success = MFAService.disable_mfa_for_user(user.id, user.email)
        
        if success:
            return ok({
                "success": True,
                "message": "MFA desactivado correctamente"
            })
        else:
            return bad("No se pudo desactivar MFA", 400)
            
    except Exception as e:
        return bad(f"Error desactivando MFA: {str(e)}", 500)

@csrf_exempt
def mfa_status(request):
    """Obtener estado MFA del usuario"""
    if request.method != "GET":
        return bad("Método no permitido", 405)
    
    user, error = get_user_from_token(request)
    if error:
        return bad(error, 401)
    
    try:
        status = MFAService.get_mfa_status(user.id, user.email)
        
        return ok({
            "success": True,
            "data": status
        })
        
    except Exception as e:
        return bad(f"Error obteniendo estado MFA: {str(e)}", 500)

@csrf_exempt
def regenerate_backup_tokens(request):
    """Regenerar tokens de respaldo"""
    if request.method != "POST":
        return bad("Método no permitido", 405)
    
    user, error = get_user_from_token(request)
    if error:
        return bad(error, 401)
    
    try:
        data = json.loads(request.body)
        confirmation = data.get("confirmation", "").strip()
        
        if confirmation.upper() != "REGENERATE TOKENS":
            return bad("Debe escribir 'REGENERATE TOKENS' para confirmar", 400)
        
        backup_tokens = MFAService.regenerate_backup_tokens(user.id, user.email)
        
        if backup_tokens:
            return ok({
                "success": True,
                "message": "Tokens de respaldo regenerados",
                "backup_tokens": backup_tokens,
                "warning": {
                    "importante": "Los tokens anteriores ya no son válidos",
                    "guardar": "Guarda estos nuevos tokens en un lugar seguro"
                }
            })
        else:
            return bad("MFA no está activado", 400)
            
    except Exception as e:
        return bad(f"Error regenerando tokens: {str(e)}", 500)

@csrf_exempt
def mfa_attempts(request):
    """Obtener intentos MFA del usuario"""
    if request.method != "GET":
        return bad("Método no permitido", 405)
    
    user, error = get_user_from_token(request)
    if error:
        return bad(error, 401)
    
    try:
        attempts = MFAService.get_user_mfa_attempts(user.id, user.email, limit=20)
        
        return ok({
            "success": True,
            "data": attempts
        })
        
    except Exception as e:
        return bad(f"Error obteniendo intentos MFA: {str(e)}", 500)