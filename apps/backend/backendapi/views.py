# backendapi/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import re
import time
from core.supabase_client import supabase, supabase_admin  # anon + service role

def ok(data, code=200):
    return JsonResponse(data, status=code, safe=False)

def bad(msg, code=400):
    return JsonResponse({"success": False, "error": msg}, status=code)

@csrf_exempt
def login(request):
    if request.method != "POST":
        return bad("Método no permitido", 405)
    try:
        data = json.loads(request.body)
        email = (data.get("email") or "").strip()
        password = (data.get("password") or "").strip()

        if not email or not password:
            return bad("Email y contraseña son obligatorios", 400)

        # Autenticación con Supabase (anon)
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        if not res or not res.session:
            return bad("Credenciales inválidas", 401)

        session = res.session
        return ok({
            "success": True,
            "user": session.user.email,
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
        })
    except Exception as e:
        return bad(str(e), 500)


@csrf_exempt
def register(request):
    """
    Crea usuario en Supabase Auth (con metadatos) y
    ACTUALIZA su fila en public.profiles (el trigger la crea vacía).
    """
    if request.method != "POST":
        return bad("Método no permitido", 405)
    try:
        data = json.loads(request.body)

        email    = (data.get("email") or "").strip()
        pwd      = (data.get("password") or "").strip()
        nombre   = (data.get("nombre") or "").strip()
        apellido = (data.get("apellido") or "").strip()
        telefono = (data.get("telefono") or "").strip()
        fecnac   = (data.get("fecha_nacimiento") or "").strip()  # "YYYY-MM-DD"

        if not email or not pwd:
            return bad("Email y contraseña son obligatorios", 400)

        # Validación simple de email
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            return bad("Formato de email inválido", 400)

        # 1) Crear usuario en Auth con metadatos (anon client)
        res = supabase.auth.sign_up({
            "email": email,
            "password": pwd,
            "options": {
                "data": {
                    "first_name": nombre,
                    "last_name":  apellido,
                    "full_name":  f"{nombre} {apellido}".strip(),
                    "phone":      telefono,
                    "birthdate":  fecnac,
                }
            }
        })
        if not res or not res.user:
            return bad("No se pudo registrar el usuario", 400)

        user_id = res.user.id

        # 2) Esperar a que el TRIGGER cree la fila en public.profiles (muy rápido, pero por si acaso)
        #    Usamos supabase_admin para saltar RLS desde el backend.
        attempts = 0
        max_attempts = 10
        while attempts < max_attempts:
            sel = supabase_admin.table("profiles").select("id").eq("id", user_id).execute()
            if sel.data:
                break
            attempts += 1
            time.sleep(0.15)  # 150ms
        # Si aún no existe, igual hacemos upsert para estar 100% cubiertos
        # (en teoría el trigger ya la creó; esto es un safety net).
        supabase_admin.table("profiles").upsert({
            "id": user_id,
            "first_name": nombre,
            "last_name": apellido,
            "phone": telefono,
            "birthdate": fecnac or None,
        }).execute()

        return ok({
            "success": True,
            "message": "Usuario registrado correctamente. Revisa tu correo si la verificación está activa.",
            "user_id": user_id,
            "email": email,
        }, 201)

    except Exception as e:
        return bad(str(e), 500)


@csrf_exempt
def forgot_password(request):
    if request.method != "POST":
        return bad("Método no permitido", 405)
    try:
        data = json.loads(request.body)
        email = (data.get("email") or "").strip()
        if not email:
            return bad("El email es requerido", 400)

        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            return bad("Formato de email inválido", 400)

        redirect_url = "http://localhost:5173/reset-password"  # cámbialo en prod
        supabase.auth.reset_password_for_email(email, {"redirect_to": redirect_url})

        return ok({
            "success": True,
            "message": "Si el correo existe, se envió un enlace de recuperación."
        })
    except Exception as e:
        return bad(str(e), 500)


@csrf_exempt
def reset_password(request):
    if request.method != "POST":
        return bad("Método no permitido", 405)
    try:
        data = json.loads(request.body)
        access_token  = data.get("access_token")
        refresh_token = data.get("refresh_token")
        token         = data.get("token")
        new_password  = (data.get("new_password") or "").strip()

        if not new_password:
            return bad("new_password es requerido", 400)
        if len(new_password) < 6:
            return bad("La contraseña debe tener al menos 6 caracteres", 400)

        if token:
            res = supabase.auth.verify_otp({
                "token_hash": token,
                "type": "recovery"
            })
        else:
            if not (access_token and refresh_token):
                return bad("Faltan tokens para establecer la sesión de recuperación", 400)
            res = supabase.auth.set_session(access_token, refresh_token)

        if not res or not res.user:
            return bad("Token de recuperación inválido o expirado", 401)

        upd = supabase.auth.update_user({"password": new_password})
        if not upd or not upd.user:
            return bad("No se pudo actualizar la contraseña", 400)

        return ok({"success": True, "message": "Contraseña actualizada exitosamente"})
    except Exception as e:
        return bad(str(e), 500)
