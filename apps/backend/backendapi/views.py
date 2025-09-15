from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from core.supabase_client import supabase

@csrf_exempt
def login(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")
            password = data.get("password")

            # Autenticación con Supabase
            res = supabase.auth.sign_in_with_password({"email": email, "password": password})

            if res.user:
                return JsonResponse({
                    "success": True,
                    "user": res.user.email,
                    "access_token": res.session.access_token,
                    "refresh_token": res.session.refresh_token
                }, status=200)
            else:
                return JsonResponse({"success": False, "error": "Credenciales inválidas"}, status=401)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    return JsonResponse({"error": "Método no permitido"}, status=405)


@csrf_exempt
def register(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")
            password = data.get("password")
            nombre = data.get("nombre")
            apellido = data.get("apellido")
            telefono = data.get("telefono")
            fecha_nacimiento = data.get("fecha_nacimiento")  # formato "YYYY-MM-DD"

            if not email or not password:
                return JsonResponse(
                    {"success": False, "error": "Email y password son requeridos"},
                    status=400,
                )

            # Registro en Supabase con user_metadata
            res = supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "nombre": nombre,
                        "apellido": apellido,
                        "telefono": telefono,
                        "fecha_nacimiento": fecha_nacimiento,
                    }
                }
            })

            if res.user:
                return JsonResponse(
                    {
                        "success": True,
                        "message": "Usuario registrado correctamente. Revise su correo para confirmar.",
                        "user": res.user.email,
                        "id": res.user.id,
                        "metadata": res.user.user_metadata,  # para verificar que se guardó
                    },
                    status=201,
                )
            else:
                return JsonResponse(
                    {"success": False, "error": "No se pudo registrar el usuario"},
                    status=400,
                )

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

    return JsonResponse({"error": "Método no permitido"}, status=405)


@csrf_exempt
def forgot_password(request):
    """
    Endpoint para solicitar el restablecimiento de contraseña.
    Envía un correo de recuperación al email proporcionado si existe en Supabase.
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")

            if not email:
                return JsonResponse(
                    {"success": False, "error": "El email es requerido"},
                    status=400,
                )

            # Validar formato de email básico
            import re
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, email):
                return JsonResponse(
                    {"success": False, "error": "Formato de email inválido"},
                    status=400,
                )

            # URL de redirección para el frontend - PRODUCCIÓN
            redirect_url = "https://smart-condominium-web.vercel.app/reset-password"
            
            # Solicitar reset de contraseña a Supabase
            # Nota: Supabase puede usar diferentes formatos para los tokens
            res = supabase.auth.reset_password_email(
                email,
                {
                    "redirect_to": redirect_url
                }
            )

            # Supabase siempre devuelve éxito por seguridad, 
            # independientemente de si el email existe o no
            return JsonResponse(
                {
                    "success": True,
                    "message": "Si el correo existe en nuestro sistema, se ha enviado un enlace de recuperación."
                },
                status=200,
            )

        except Exception as e:
            return JsonResponse(
                {"success": False, "error": "Error interno del servidor"}, 
                status=500
            )

    return JsonResponse({"error": "Método no permitido"}, status=405)


@csrf_exempt
def reset_password(request):
    """
    Endpoint para confirmar el restablecimiento de contraseña.
    Utiliza el token de recuperación para cambiar la contraseña.
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            access_token = data.get("access_token")
            refresh_token = data.get("refresh_token")
            token = data.get("token")  # Token único de Supabase
            new_password = data.get("new_password")

            if not new_password:
                return JsonResponse(
                    {"success": False, "error": "new_password es requerido"},
                    status=400,
                )

            # Verificar que tengamos tokens (ya sea formato JWT o token único)
            if not ((access_token and refresh_token) or token):
                return JsonResponse(
                    {
                        "success": False, 
                        "error": "Se requiere: (access_token y refresh_token) O token único"
                    },
                    status=400,
                )

            # Validar que la contraseña tenga al menos 6 caracteres
            if len(new_password) < 6:
                return JsonResponse(
                    {
                        "success": False, 
                        "error": "La contraseña debe tener al menos 6 caracteres"
                    },
                    status=400,
                )

            # Manejar diferentes tipos de tokens
            if token:
                # Usar token único de Supabase (formato del email)
                res = supabase.auth.verify_otp({
                    "token_hash": token,
                    "type": "recovery"
                })
            else:
                # Usar tokens JWT (access_token + refresh_token)
                res = supabase.auth.set_session(access_token, refresh_token)
            
            if not res.user:
                return JsonResponse(
                    {"success": False, "error": "Token de recuperación inválido o expirado"},
                    status=401,
                )

            # Actualizar la contraseña
            update_res = supabase.auth.update_user({"password": new_password})
            
            if update_res.user:
                return JsonResponse(
                    {
                        "success": True,
                        "message": "Contraseña actualizada exitosamente"
                    },
                    status=200,
                )
            else:
                return JsonResponse(
                    {"success": False, "error": "No se pudo actualizar la contraseña"},
                    status=400,
                )

        except Exception as e:
            # Para debugging - mostrar error específico
            print(f"Error en reset_password: {str(e)}")
            print(f"Tipo de error: {type(e)}")
            return JsonResponse(
                {"success": False, "error": f"Error interno del servidor: {str(e)}"}, 
                status=500
            )

    return JsonResponse({"error": "Método no permitido"}, status=405)