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

from backendapi.roles.auth_helpers import require_auth

from .models import TipoMulta, Multa, Propiedad, CargoMulta
from .serializers import (
    TipoMultaSerializer,
    MultaSerializer,
    PropiedadSerializer,
    CargoMultaSerializer,
)
from .mfa_services import MFAService


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
        mfa_code = (data.get("mfa_code") or "").strip()
        mfa_method = data.get("mfa_method", "totp")

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

        # Verificar si el usuario tiene MFA habilitado
        mfa_enabled = MFAService.is_mfa_enabled(user.id)
        
        if mfa_enabled:
            # Si tiene MFA pero no envió código
            if not mfa_code:
                return JsonResponse({
                    "success": False,
                    "mfa_required": True,
                    "message": "Código MFA requerido",
                    "user_id": user.id  # Para referencia en el frontend
                }, status=200)
            
            # Verificar código MFA
            mfa_success, mfa_message = MFAService.verify_mfa_code(
                user.id, user.email, mfa_code, mfa_method
            )
            
            if not mfa_success:
                return bad(f"MFA: {mfa_message}", 401)

        # Login exitoso (con o sin MFA)
        return JsonResponse({
            "success": True,
            "user": {
                "id": getattr(user, "id", None),
                "email": getattr(user, "email", None),
                "mfa_enabled": mfa_enabled
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
            "id": str(getattr(u, "id", "")),  # <- añadido
            "email": getattr(u, "email", ""),
            "full_name": full_name or getattr(u, "email", ""),
        })
    except Exception as e:
        return bad(f"Excepción en /me: {str(e)}", 500)


@csrf_exempt
@require_auth
def mis_registros(request):
    """
    GET /api/mis-registros/
    Devuelve los vehículos (auto) y mascotas (mascota) asociados a las propiedades
    del usuario logueado (usuario_habitante.estado=1).

    Respuesta:
      {
        "success": true,
        "data": {
          "autos": [{"placa": "...", "modelo": "...", "marca": "...", "propiedad_id": 1}],
          "mascotas": [{"id": 1, "nombre": "...", "tipo": {"id": 1, "nombre": "Perro"}, "propiedad_id": 1}]
        }
      }
    """
    if request.method != "GET":
        return bad("Método no permitido", 405)

    user_id = getattr(request, "user_id", None)
    if not user_id:
        return bad("Token de autenticación requerido o inválido", 401)

    try:
        # 1) Propiedades del usuario
        try:
            # En algunos esquemas el campo es estado_id (no estado)
            uh_res = (
                supabase_admin.table("usuario_habitante")
                .select("propiedad_id")
                .eq("usuario_id", user_id)
                .eq("estado_id", 1)
                .execute()
            )
        except Exception:
            uh_res = (
                supabase_admin.table("usuario_habitante")
                .select("propiedad_id")
                .eq("usuario_id", user_id)
                .eq("estado", 1)
                .execute()
            )
        propiedad_ids = [
            r.get("propiedad_id")
            for r in (getattr(uh_res, "data", None) or [])
            if r.get("propiedad_id") is not None
        ]

        if not propiedad_ids:
            return ok({"success": True, "data": {"autos": [], "mascotas": []}})

        # 2) Autos
        # Preferimos leer desde Django ORM (mismo origen que /api/autos/), y dejamos Supabase como fallback.
        autos = []
        try:
            from backendapi.registrarAuto.models import Auto as AutoModel

            qs = AutoModel.objects.select_related("propiedad").filter(propiedad_id__in=propiedad_ids)
            autos = [
                {
                    "placa": a.placa,
                    "modelo": a.modelo,
                    "marca": a.marca,
                    "propiedad_id": a.propiedad_id,
                }
                for a in qs
            ]
        except Exception:
            try:
                autos_res = (
                    supabase_admin.table("auto")
                    .select("placa,modelo,marca,propiedad_id")
                    .in_("propiedad_id", propiedad_ids)
                    .execute()
                )
                autos_raw = getattr(autos_res, "data", None) or []
            except Exception:
                autos_res = (
                    supabase_admin.table("auto")
                    .select("*")
                    .in_("propiedad_id", propiedad_ids)
                    .execute()
                )
                autos_raw = getattr(autos_res, "data", None) or []

            autos = [
                {
                    "placa": a.get("placa") or a.get("license_plate") or a.get("patente"),
                    "modelo": a.get("modelo") or a.get("model"),
                    "marca": a.get("marca") or a.get("brand"),
                    "propiedad_id": a.get("propiedad_id"),
                }
                for a in autos_raw
            ]

        # 3) Mascotas (best-effort; si no existe tipo_mascota_id, devolvemos sin 'tipo')
        mascotas_raw = []
        try:
            mascotas_res = (
                supabase_admin.table("mascota")
                .select("id,nombre,propiedad_id,tipo_mascota_id")
                .in_("propiedad_id", propiedad_ids)
                .execute()
            )
            mascotas_raw = getattr(mascotas_res, "data", None) or []
        except Exception:
            mascotas_res = (
                supabase_admin.table("mascota")
                .select("*")
                .in_("propiedad_id", propiedad_ids)
                .execute()
            )
            mascotas_raw = getattr(mascotas_res, "data", None) or []

        tipo_ids = sorted({m.get("tipo_mascota_id") for m in mascotas_raw if m.get("tipo_mascota_id")})
        tipos_by_id = {}
        if tipo_ids:
            try:
                tipos_res = (
                    supabase_admin.table("tipo_mascota")
                    .select("id,nombre")
                    .in_("id", tipo_ids)
                    .execute()
                )
                for t in (getattr(tipos_res, "data", None) or []):
                    if t.get("id") is not None:
                        tipos_by_id[t.get("id")] = {"id": t.get("id"), "nombre": t.get("nombre")}
            except Exception:
                tipos_by_id = {}

        mascotas = []
        for m in mascotas_raw:
            tipo_id = m.get("tipo_mascota_id")
            mascotas.append({
                "id": m.get("id"),
                "nombre": m.get("nombre") or m.get("name"),
                "tipo": tipos_by_id.get(tipo_id),
                "propiedad_id": m.get("propiedad_id"),
            })

        return ok({"success": True, "data": {"autos": autos, "mascotas": mascotas}})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return bad(f"Excepción en /mis-registros: {str(e)}", 500)

@csrf_exempt
def users(request):
    """
    GET /api/users/
    Lista de usuarios con:
      - id: UUID (de Supabase) — debe coincidir con emisor_id/receptor_id en la tabla mensaje
      - full_name: a partir de public.profiles (first_name + last_name)
      - email: desde Supabase Auth (admin)

    Requiere Authorization: Bearer <access_token>
    """
    if request.method != "GET":
        return bad("Método no permitido", 405)

    # 1) Validar sesión con el access_token (igual que en /me)
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return bad("Falta token (Authorization: Bearer <token>)", 401)

    access_token = auth.split(" ", 1)[1].strip()
    try:
        res = supabase.auth.get_user(access_token)
        u = getattr(res, "user", None)
        if not u:
            return bad("Token inválido o expirado", 401)
    except Exception as e:
        return bad(f"Excepción validando token: {str(e)}", 500)

    try:
        # 2) Traer perfiles (public.profiles)
        prof_res = (
            supabase_admin.table("profiles")
            .select("id,first_name,last_name")
            .execute()
        )
        profiles = prof_res.data or []

        # 3) Construir índice de emails desde Auth Admin (si disponible)
        emails_by_id = {}

        try:
            # Supabase Admin API (service role)
            # Nota: La forma exacta del response puede variar por versión del SDK de supabase-py.
            # Manejamos varios posibles formatos de retorno.
            admin_list = supabase_admin.auth.admin.list_users()

            users_payload = None
            # Posibles formas
            if hasattr(admin_list, "data"):
                users_payload = getattr(admin_list, "data")
                # data puede traer {"users": [...]}
                if isinstance(users_payload, dict) and "users" in users_payload:
                    users_payload = users_payload["users"]
            elif isinstance(admin_list, dict):
                users_payload = admin_list.get("users") or admin_list.get("data") or []

            if users_payload is None:
                users_payload = []

            for item in users_payload:
                # item puede ser objeto o dict
                uid = getattr(item, "id", None) or (isinstance(item, dict) and item.get("id"))
                email = getattr(item, "email", None) or (isinstance(item, dict) and item.get("email"))
                if uid:
                    emails_by_id[str(uid)] = email or ""
        except Exception:
            # Si falla Auth Admin, devolvemos sin email (el frontend seguirá mostrando nombres)
            emails_by_id = {}

        # 4) Armar respuesta
        out = []
        for p in profiles:
            uid = str(p.get("id"))
            first = (p.get("first_name") or "").strip()
            last = (p.get("last_name") or "").strip()
            full = f"{first} {last}".strip()

            email = emails_by_id.get(uid, "")
            out.append({
                "id": uid,
                "full_name": full or email or uid,
                "email": email,
            })

        return ok(out)

    except Exception as e:
        return bad(f"Excepción en /users: {str(e)}", 500)


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


