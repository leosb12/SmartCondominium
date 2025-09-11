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