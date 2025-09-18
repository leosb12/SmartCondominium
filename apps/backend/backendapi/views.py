# backendapi/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Exists, OuterRef
import json
import re
import time

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from core.supabase_client import supabase, supabase_admin  # anon + service role

from .models import TipoMulta, Multa, Propiedad, CargoMulta
from .serializers import (
    TipoMultaSerializer,
    MultaSerializer,
    PropiedadSerializer,
    CargoMultaSerializer,
)


# -----------------------------
# Helpers JSON
# -----------------------------
def ok(data, code=200):
    return JsonResponse(data, status=code, safe=False)


def bad(msg, code=400):
    return JsonResponse({"success": False, "error": msg}, status=code)


# -----------------------------
# Auth endpoints (Supabase)
# -----------------------------
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

        # Intento de login en Supabase
        res = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })

        # Manejo explícito de error
        if hasattr(res, "error") and res.error:
            return bad(f"Error en Supabase: {res.error.message}", 401)

        # Manejo si no hay sesión
        session = getattr(res, "session", None)
        if not session:
            return bad("Credenciales inválidas", 401)

        user = getattr(session, "user", None)
        if not user:
            return bad("No se pudo obtener usuario de la sesión", 401)

        return JsonResponse({
            "success": True,
            "user": {
                "id": getattr(user, "id", None),
                "email": getattr(user, "email", None),
            },
            "access_token": getattr(session, "access_token", None),
            "refresh_token": getattr(session, "refresh_token", None),
        }, status=200)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return bad(f"Excepción en login: {str(e)}", 500)


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

        # 2) Esperar a que el TRIGGER cree la fila en public.profiles
        attempts = 0
        max_attempts = 10
        while attempts < max_attempts:
            sel = supabase_admin.table("profiles").select("id").eq("id", user_id).execute()
            if sel.data:
                break
            attempts += 1
            time.sleep(0.15)  # 150ms

        # Safety net: upsert por si acaso
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

        redirect_url = "https://smart-condominium-web.vercel.app/reset-password"
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


@csrf_exempt
def me(request):
    if request.method != "GET":
        return bad("Método no permitido", 405)

    # Tomar el Bearer token del header
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return bad("Falta token (Authorization: Bearer <token>)", 401)

    access_token = auth.split(" ", 1)[1].strip()
    try:
        # Validar token y obtener usuario desde Supabase
        res = supabase.auth.get_user(access_token)
        u = getattr(res, "user", None)
        if not u:
            return bad("Token inválido o expirado", 401)

        # Intentar completar nombre desde tabla profiles (service role)
        full_name = ""
        try:
            sel = (
                supabase_admin.table("profiles")
                .select("first_name,last_name")
                .eq("id", u.id)
                .single()
                .execute()
            )
            if sel.data:
                fn = (sel.data.get("first_name") or "").strip()
                ln = (sel.data.get("last_name") or "").strip()
                full_name = f"{fn} {ln}".strip()
        except Exception:
            pass

        if not full_name:
            md = getattr(u, "user_metadata", {}) or {}
            full_name = md.get("full_name") or md.get("name") or ""

        return ok({
            "email": getattr(u, "email", ""),
            "full_name": full_name or getattr(u, "email", ""),
        })
    except Exception as e:
        return bad(f"Excepción en /me: {str(e)}", 500)


# -----------------------------
# ViewSets de dominio
# -----------------------------
class TipoMultaViewSet(viewsets.ModelViewSet):
    """
    /api/tipo-multa/  [GET, POST]
    /api/tipo-multa/{id}/  [GET, PUT, PATCH, DELETE]
    """
    queryset = TipoMulta.objects.all().order_by("nombre")
    serializer_class = TipoMultaSerializer
    permission_classes = [permissions.AllowAny]  # cambia a IsAuthenticated si usas JWT


class PropiedadViewSet(viewsets.ReadOnlyModelViewSet):
    """
    /api/propiedades/  [GET]
    /api/propiedades/{id}/  [GET]
    """
    queryset = Propiedad.objects.all().order_by("id")
    serializer_class = PropiedadSerializer
    permission_classes = [permissions.AllowAny]


class MultaViewSet(viewsets.ModelViewSet):
    """
    /api/multas/  [GET, POST]
    /api/multas/{id}/  [GET, PUT, PATCH, DELETE]
    - Soporta crear con propiedad_id y tipo_multa_id.
    - Devuelve propiedad y tipo_multa anidados en lecturas.
    """
    queryset = (
        Multa.objects.select_related("propiedad", "tipo_multa")
        .all()
        .order_by("-id")
    )
    serializer_class = MultaSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=["get"], url_path="impagas")
    def impagas(self, request):
        """
        GET /api/multas/impagas/  -> Multas que NO tienen relación en CargoMulta (impagas)
        """
        # Si el FK en CargoMulta se llama "multa" (objeto), usa multa=OuterRef("pk")
        # Si se llama "multa_id" (entero), usa multa_id=OuterRef("pk")
        subq = CargoMulta.objects.filter(multa_id=OuterRef("pk"))
        qs = Multa.objects.annotate(tiene_cargo=Exists(subq)).filter(tiene_cargo=False)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="pagadas")
    def pagadas(self, request):
        """
        GET /api/multas/pagadas/  -> Multas que SÍ tienen relación en CargoMulta (pagadas)
        """
        subq = CargoMulta.objects.filter(multa_id=OuterRef("pk"))
        qs = Multa.objects.annotate(tiene_cargo=Exists(subq)).filter(tiene_cargo=True)
        return Response(self.get_serializer(qs, many=True).data)


class CargoMultaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    /api/cargo-multa/  [GET]
    /api/cargo-multa/{pk}/  [GET]  (si defines PK compuesto, usa lookup_field custom)
    """
    queryset = CargoMulta.objects.all()
    serializer_class = CargoMultaSerializer
    permission_classes = [permissions.AllowAny]
