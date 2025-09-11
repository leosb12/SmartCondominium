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
