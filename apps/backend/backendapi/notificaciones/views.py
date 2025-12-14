import os
import json
from datetime import datetime, timedelta, timezone

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from core.supabase_client import supabase_admin, supabase  # service role

from .services_email import send_email
from .services_push import send_token


# ---------- helpers de respuesta ----------
def ok(data, code=200): return JsonResponse(data, status=code, safe=False)
def bad(msg, code=400):  return JsonResponse({"ok": False, "error": msg}, status=code)

# ---------- seguridad opcional ----------
INTERNAL_TOKEN = os.environ.get("INTERNAL_NOTIF_TOKEN")  # si lo configuras
def enforce_internal(request):
    if not INTERNAL_TOKEN:
        return True
    return request.headers.get("X-Internal-Token") == INTERNAL_TOKEN

# ---------- utils de datos ----------
def get_user_email(user_id: str) -> str | None:
    """
    Lee email desde Supabase Auth Admin (service role).
    """
    try:
        res = supabase_admin.auth.admin.get_user_by_id(user_id)
        # SDKs varían: intenta dict/obj
        if isinstance(res, dict):
            return (res.get("user") or {}).get("email")
        user = getattr(res, "user", None)
        if user:
            return getattr(user, "email", None)
    except Exception:
        pass
    return None

def get_user_tokens(user_id: str) -> list[str]:
    """
    Devuelve tokens FCM del usuario (tabla public.usuario_push_token).
    En tu modelo es 1 token por usuario; igual devolvemos lista por si amplías.
    """
    try:
        q = supabase_admin.table("usuario_push_token").select("token").eq("usuario_id", user_id).execute()
        rows = q.data or []
        tokens = [r.get("token") for r in rows if r.get("token")]
        # si tu tabla es 1:1, podría venir uno solo
        return tokens
    except Exception:
        return []

def mark_claim_en_proceso(notif_id: int) -> bool:
    """
    UPDATE condicional: toma la fila si sigue 'pendiente'.
    """
    try:
        upd = (
            supabase_admin.table("notificacion_envio")
            .update({"estado": "en_proceso"})
            .eq("id", notif_id)
            .eq("estado", "pendiente")
            .execute()
        )
        return bool(upd.data)  # si se actualizó, la reclamamos nosotros
    except Exception:
        return False

def mark_done(notif_id: int, ok_: bool, error_text: str | None = None):
    try:
        estado = "enviado" if ok_ else "fallido"
        payload = {"estado": estado}
        if error_text:
            payload["error_text"] = error_text[:1000]
        supabase_admin.table("notificacion_envio").update(payload).eq("id", notif_id).execute()
    except Exception:
        pass

def fetch_pending(limit: int = 100) -> list[dict]:
    """
    SELECT * FROM notificacion_envio WHERE estado='pendiente' ORDER BY id LIMIT N
    """
    try:
        q = (
            supabase_admin.table("notificacion_envio")
            .select("*")
            .eq("estado", "pendiente")
            .order("id", desc=False)
            .limit(limit)
            .execute()
        )
        return q.data or []
    except Exception:
        return []

def event_texts(tipo_evento: str, referencia_id: int) -> tuple[str, str]:
    """
    Devuelve (title/subject, body/html simple) para el evento.
    Puedes enriquecer consultando expensas/reserva/multas por referencia_id si quieres.
    """
    mapping = {
        "expensa_generada":      ("Nueva expensa generada", f"<p>Tienes una nueva expensa (ID {referencia_id}).</p>"),
        "multa_aplicada":        ("Multa aplicada",         f"<p>Se registró una multa (ID {referencia_id}).</p>"),
        "reserva_confirmada":    ("Reserva confirmada",     f"<p>Tu reserva fue confirmada (ID {referencia_id}).</p>"),
        "pago_parcial_registrado": ("Pago parcial registrado", f"<p>Se registró un abono (cargo #{referencia_id}).</p>"),
        "pago_completado":       ("Pago completado",        f"<p>El pago #{referencia_id} fue completado.</p>"),
        "expensa_por_vencer":    ("Expensa por vencer",     f"<p>Tu expensa (ID {referencia_id}) vencerá pronto.</p>"),
        "expensa_vencida":       ("Expensa vencida",        f"<p>Tu expensa (ID {referencia_id}) ya venció.</p>"),
        "reserva_por_vencer":    ("Reserva por vencer",     f"<p>Tu reserva (ID {referencia_id}) vencerá pronto.</p>"),
        "reserva_vencida":       ("Reserva vencida",        f"<p>Tu reserva (ID {referencia_id}) ya venció.</p>"),
    }
    return mapping.get(tipo_evento, ("Notificación", f"<p>Tienes un evento: {tipo_evento} #{referencia_id}</p>"))

def list_habitantes_activos(propiedad_id: int) -> list[str]:
    """
    Devuelve lista de usuario_id (uuid) activos (estado_id = 1) de la propiedad.
    """
    try:
        q = (
            supabase_admin.table("usuario_habitante")
            .select("usuario_id")
            .eq("propiedad_id", propiedad_id)
            .eq("estado_id", 1)
            .execute()
        )
        rows = q.data or []
        return [r.get("usuario_id") for r in rows if r.get("usuario_id")]
    except Exception:
        return []

# ---------- endpoints de prueba ----------
@csrf_exempt
def send_test_email(request):
    if request.method != "POST":
        return bad("Method not allowed", 405)
    try:
        body = json.loads(request.body.decode("utf-8"))
        to = body["to"]
        subject = body.get("subject", "Prueba")
        html = body.get("html", "<p>Hola 👋</p>")
        status = send_email(to, subject, html)
        return ok({"ok": True, "status": status})
    except Exception as e:
        return bad(str(e), 500)

@csrf_exempt
def send_test_push(request):
    if request.method != "POST":
        return bad("Method not allowed", 405)
    try:
        body = json.loads(request.body.decode("utf-8"))
        token = body["token"]
        title = body.get("title", "Hola")
        msg = body.get("body", "Push de prueba")
        data = body.get("data") or {}
        message_id = send_token(token, title, msg, data)
        return ok({"ok": True, "message_id": message_id})
    except Exception as e:
        return bad(str(e), 500)

# ---------- worker: procesa la cola ----------
@csrf_exempt
def process_pending(request):
    if request.method != "POST":
        return bad("Method not allowed", 405)
    if not enforce_internal(request):
        return bad("Unauthorized", 401)

    try:
        limit = int(request.GET.get("limit", "100"))
    except Exception:
        limit = 100

    pending = fetch_pending(limit=limit)
    processed = []
    for n in pending:
        notif_id = n.get("id")
        if not notif_id:
            continue

        # tomar la fila (evita carrera)
        if not mark_claim_en_proceso(notif_id):
            continue

        canal = n.get("canal")
        usuario_id = n.get("usuario_id")
        tipo_evento = n.get("tipo_evento") or "evento"
        referencia_id = n.get("referencia_id")

        title, html = event_texts(tipo_evento, referencia_id or 0)
        try:
            if canal == "email":
                email = get_user_email(usuario_id)
                if not email:
                    raise RuntimeError("Usuario sin email")
                status = send_email(email, f"[SmartCondo] {title}", html)
                ok_flag = (status == 200)  # Resend devuelve 200
            elif canal == "push":
                tokens = get_user_tokens(usuario_id)
                if not tokens:
                    raise RuntimeError("Usuario sin token FCM")
                # por simpleza: enviar al primero
                send_token(tokens[0], title, strip_html(html))
                ok_flag = True
            else:
                raise RuntimeError(f"Canal desconocido: {canal}")

            mark_done(notif_id, ok_flag, None if ok_flag else "Error canal")
            processed.append({"id": notif_id, "ok": ok_flag})
        except Exception as e:
            mark_done(notif_id, False, str(e))
            processed.append({"id": notif_id, "ok": False, "error": str(e)})

    return ok({"count": len(processed), "items": processed})

def strip_html(s: str) -> str:
    # versión mínima; suficiente para título/body de push
    import re
    return re.sub("<[^<]+?>", "", s or "").strip()

# ---------- recordatorios de vencimiento ----------
@csrf_exempt
def run_reminders(request):
    """
    Encola recordatorios:
      - por vencer en N días (default 3)
      - vencidas hoy o antes
    Solo si NO están completamente pagadas.
    Luego process_pending (desde cron o manual).
    """
    if request.method != "POST":
        return bad("Method not allowed", 405)
    if not enforce_internal(request):
        return bad("Unauthorized", 401)

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        body = {}
    days_before = int(body.get("days_before", 3))

    now = datetime.now(timezone.utc).date()
    target_soon = now + timedelta(days=days_before)

    encoladas = 0
    # --- EXPENSAS ---
    encoladas += enqueue_reminders_for_table(
        tabla="expensas", pk="id", prop_col="propiedad_id",
        total_col="total", fecha_vto_col="fecha_vencimiento",
        por_vencer_tipo="expensa_por_vencer",
        vencida_tipo="expensa_vencida",
        target_soon=target_soon, today=now,
        link_table="cargo_expensa", link_fk="expensa_id"
    )
    # --- RESERVA ---
    encoladas += enqueue_reminders_for_table(
        tabla="reserva", pk="id", prop_col="propiedad_id",
        total_col="total", fecha_vto_col="fecha_vencimiento",
        por_vencer_tipo="reserva_por_vencer",
        vencida_tipo="reserva_vencida",
        target_soon=target_soon, today=now,
        link_table="cargo_reserva", link_fk="reserva_id"
    )

    return ok({"ok": True, "encoladas": encoladas})

def enqueue_reminders_for_table(
    tabla: str, pk: str, prop_col: str, total_col: str, fecha_vto_col: str,
    por_vencer_tipo: str, vencida_tipo: str,
    target_soon, today,
    link_table: str, link_fk: str
) -> int:
    """
    Busca items por vencer (target_soon) y vencidos (<= today) con saldo > 0 y encola notifs via RPC fn_crear_notifs_por_propiedad.
    Nótese: consultas simples; si hay muchos registros, optimizar con vistas/SQL lado server.
    """
    total_encoladas = 0

    # 1) Por vencer
    total_encoladas += _enqueue_for_condition(
        tabla, pk, prop_col, total_col, fecha_vto_col, link_table, link_fk,
        cond_op="eq", cond_date=target_soon, tipo_evento=por_vencer_tipo
    )
    # 2) Vencidas (<= today)
    total_encoladas += _enqueue_for_condition(
        tabla, pk, prop_col, total_col, fecha_vto_col, link_table, link_fk,
        cond_op="lte", cond_date=today, tipo_evento=vencida_tipo
    )
    return total_encoladas

def _enqueue_for_condition(
    tabla, pk, prop_col, total_col, fecha_vto_col, link_table, link_fk,
    cond_op: str, cond_date, tipo_evento: str
) -> int:
    """
    cond_op: 'eq' para por_vencer; 'lte' para vencidas.
    """
    # traer candidatos por fecha
    sel = (
        supabase_admin.table(tabla)
        .select(f"{pk},{prop_col},{total_col},{fecha_vto_col}")
    )
    if cond_op == "eq":
        sel = sel.eq(fecha_vto_col, cond_date.isoformat())
    else:
        sel = sel.lte(fecha_vto_col, cond_date.isoformat())

    rows = (sel.execute().data) or []
    encoladas = 0
    for r in rows:
        item_id = r.get(pk)
        propiedad_id = r.get(prop_col)
        total = float(r.get(total_col) or 0)

        if item_id is None or propiedad_id is None:
            continue

        # saldo: total - sum(cargos.monto) por los cargos asociados a este item
        pagado = _sum_cargos_for_item(link_table, link_fk, item_id)
        saldo = total - pagado
        if saldo <= 0:
            continue  # ya está pago

        # encolar via RPC (tu función ya crea push + email para habitantes activos)
        try:
            supabase_admin.rpc(
                "fn_crear_notifs_por_propiedad",
                {"p_propiedad_id": propiedad_id, "p_tipo_evento": tipo_evento, "p_referencia_id": item_id}
            ).execute()
            encoladas += 1
        except Exception:
            pass
    return encoladas

def _sum_cargos_for_item(link_table: str, link_fk: str, item_id: int) -> float:
    """
    Obtiene cargo_id en tabla de enlace (cargo_expensa / cargo_reserva) y suma cargos.monto.
    """
    try:
        # 1) traer cargo_ids vinculados a item
        linked = (
            supabase_admin.table(link_table)
            .select("cargo_id")
            .eq(link_fk, item_id)
            .execute()
        ).data or []
        cargo_ids = [row.get("cargo_id") for row in linked if row.get("cargo_id")]
        if not cargo_ids:
            return 0.0

        # 2) sumar montos en cargos
        total = 0.0
        # (para no depender de 'in_' que a veces tiene límites, iteramos)
        for cid in cargo_ids:
            row = (
                supabase_admin.table("cargos")
                .select("monto")
                .eq("id", cid)
                .single()
                .execute()
            ).data
            if row and row.get("monto") is not None:
                total += float(row["monto"])
        return total
    except Exception:
        return 0.0



@csrf_exempt
def register_push_token(request):
    if request.method != "POST":
        return bad("Method not allowed", 405)

    # 1) Validar sesión con Authorization: Bearer <access_token>
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return bad("Unauthorized", 401)
    access_token = auth.split(" ", 1)[1].strip()

    try:
        res = supabase.auth.get_user(access_token)
        u = getattr(res, "user", None)
        if not u:
            return bad("Unauthorized", 401)
        user_id = str(getattr(u, "id", ""))
    except Exception:
        return bad("Unauthorized", 401)

    # 2) Leer body
    try:
        body = json.loads(request.body.decode("utf-8"))
        token = (body.get("token") or "").strip()
        plataforma = (body.get("plataforma") or "android").strip()
        if not token:
            return bad("token requerido", 400)
    except Exception:
        return bad("Invalid JSON", 400)

    # 3) Upsert (1:1 por usuario)
    try:
        supabase_admin.table("usuario_push_token").upsert({
            "usuario_id": user_id,
            "token": token,
            "plataforma": plataforma,
        }).execute()
        return ok({"ok": True})
    except Exception as e:
        return bad(str(e), 500)
