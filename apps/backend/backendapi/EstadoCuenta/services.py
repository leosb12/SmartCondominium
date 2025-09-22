from typing import Dict, Any, List, Optional
from decimal import Decimal, ROUND_HALF_UP
from django.db import connection
from django.utils import timezone

D = lambda x: (Decimal(x or 0).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

def _fetchall_dict(cur):
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]

def _get_propiedades_activas(usuario_id: str, propiedad_id: Optional[int]=None):
    with connection.cursor() as cur:
        if propiedad_id:
            cur.execute("""
                SELECT p.id, p.nro_casa
                FROM usuario_habitante uh
                JOIN propiedad p ON p.id = uh.propiedad_id
                WHERE uh.usuario_id = %s AND uh.estado_id = 1 AND p.id = %s
            """, [usuario_id, propiedad_id])
        else:
            cur.execute("""
                SELECT p.id, p.nro_casa
                FROM usuario_habitante uh
                JOIN propiedad p ON p.id = uh.propiedad_id
                WHERE uh.usuario_id = %s AND uh.estado_id = 1
            """, [usuario_id])
        return _fetchall_dict(cur)

def _get_prop_nros(prop_ids: List[int]) -> Dict[int,str]:
    if not prop_ids:
        return {}
    with connection.cursor() as cur:
        cur.execute("SELECT id, nro_casa FROM propiedad WHERE id = ANY(%s)", [prop_ids])
        return {row[0]: row[1] for row in cur.fetchall()}

def _list_expensas(prop_ids, desde, hasta):
    if not prop_ids:
        return []
    with connection.cursor() as cur:
        cur.execute(
            f"""
            SELECT
              'expensa' AS tipo,
              e.id,
              e.propiedad_id,
              e.fecha::date AS periodo_fecha,
              e.fecha_vencimiento,
              e.total,
              COALESCE((
                SELECT SUM(c.monto)
                FROM cargos c
                JOIN cargo_expensa ce ON ce.cargo_id = c.id
                WHERE ce.expensa_id = e.id
              ),0)::numeric(14,2) AS pagado
            FROM expensas e
            WHERE e.propiedad_id = ANY(%s)
              { 'AND e.fecha >= %s' if desde else '' }
              { 'AND e.fecha <= %s' if hasta else '' }
            ORDER BY e.fecha_vencimiento NULLS LAST, e.fecha DESC
            """,
            [prop_ids] + ([desde] if desde else []) + ([hasta] if hasta else []),
        )
        rows = _fetchall_dict(cur)
    casas = _get_prop_nros(prop_ids)
    for r in rows:
        r["nro_casa"] = casas.get(r["propiedad_id"])
    return rows

def _list_reservas(prop_ids, desde, hasta):
    if not prop_ids:
        return []
    with connection.cursor() as cur:
        cur.execute(
            f"""
            SELECT
              'reserva' AS tipo,
              r.id,
              r.propiedad_id,
              r.fecha::date AS periodo_fecha,
              r.fecha_vencimiento,
              r.total,
              COALESCE((
                SELECT SUM(c.monto)
                FROM cargos c
                JOIN cargo_reserva cr ON cr.cargo_id = c.id
                WHERE cr.reserva_id = r.id
              ),0)::numeric(14,2) AS pagado
            FROM reserva r
            WHERE r.propiedad_id = ANY(%s)
              { 'AND r.fecha >= %s' if desde else '' }
              { 'AND r.fecha <= %s' if hasta else '' }
            ORDER BY r.fecha_vencimiento NULLS LAST, r.fecha DESC
            """,
            [prop_ids] + ([desde] if desde else []) + ([hasta] if hasta else []),
        )
        rows = _fetchall_dict(cur)
    casas = _get_prop_nros(prop_ids)
    for r in rows:
        r["nro_casa"] = casas.get(r["propiedad_id"])
    return rows

def _list_multas(prop_ids, desde, hasta):
    if not prop_ids:
        return []
    with connection.cursor() as cur:
        cur.execute(
            f"""
            SELECT
              'multa' AS tipo,
              m.id,
              m.propiedad_id,
              m.fecha::date AS periodo_fecha,
              NULL::timestamptz AS fecha_vencimiento,   -- multas SIN vencimiento
              m.total,
              COALESCE((
                SELECT SUM(c.monto)
                FROM cargos c
                JOIN cargo_multa cm ON cm.cargo_id = c.id
                WHERE cm.multa_id = m.id
              ),0)::numeric(14,2) AS pagado
            FROM multas m
            WHERE m.propiedad_id = ANY(%s)
              { 'AND m.fecha >= %s' if desde else '' }
              { 'AND m.fecha <= %s' if hasta else '' }
            ORDER BY m.fecha DESC
            """,
            [prop_ids] + ([desde] if desde else []) + ([hasta] if hasta else []),
        )
        rows = _fetchall_dict(cur)
    casas = _get_prop_nros(prop_ids)
    for r in rows:
        r["nro_casa"] = casas.get(r["propiedad_id"])
    return rows

def _get_ultimo_pago_ts(usuario_id: str):
    with connection.cursor() as cur:
        cur.execute("SELECT MAX(ts) FROM cargos WHERE id_usuario = %s", [usuario_id])
        row = cur.fetchone()
        return row[0] if row and row[0] else None

def get_estado_de_cuenta(usuario_id: str, filtros: Dict[str,Any]) -> Dict[str,Any]:
    prop_id = filtros.get("propiedad_id")
    tipo = filtros.get("tipo")
    estado_filter = filtros.get("estado")
    desde = filtros.get("desde")
    hasta = filtros.get("hasta")
    page = filtros.get("page", 1)
    page_size = filtros.get("page_size", 50)
    orden = filtros.get("orden", "vencimiento")

    props = _get_propiedades_activas(usuario_id, prop_id)
    prop_ids = [p["id"] for p in props]
    now = timezone.now()

    items: List[Dict[str,Any]] = []
    if not tipo or tipo == "expensa":
        items += _list_expensas(prop_ids, desde, hasta)
    if not tipo or tipo == "reserva":
        items += _list_reservas(prop_ids, desde, hasta)
    if not tipo or tipo == "multa":
        items += _list_multas(prop_ids, desde, hasta)

    # saldo y estado
    for it in items:
        total = D(it["total"])
        pagado = D(it["pagado"])
        saldo = total - pagado
        it["total"] = total
        it["pagado"] = pagado
        it["saldo"] = saldo if saldo > 0 else D("0.00")

        if saldo <= 0:
            it["estado"] = "pagada"
        else:
            if it["tipo"] in ("expensa","reserva") and it["fecha_vencimiento"]:
                it["estado"] = "vencida" if it["fecha_vencimiento"] < now else "pendiente"
            else:
                it["estado"] = "pendiente"  # multas no tienen vencimiento

    if estado_filter:
        items = [x for x in items if x["estado"] == estado_filter]

    # orden
    if orden == "monto":
        items.sort(key=lambda x: (x["saldo"], x["total"]), reverse=True)
    elif orden == "periodo":
        items.sort(key=lambda x: (x["periodo_fecha"], x.get("fecha_vencimiento") or now), reverse=True)
    elif orden == "estado":
        rank = {"vencida":0,"pendiente":1,"pagada":2}
        items.sort(key=lambda x: rank.get(x["estado"], 3))
    else:  # vencimiento
        def key_venc(x):
            pri = 0 if x["estado"]=="vencida" else (1 if x["estado"]=="pendiente" else 2)
            fv = x.get("fecha_vencimiento") or timezone.datetime.max.replace(tzinfo=now.tzinfo)
            return (pri, fv)
        items.sort(key=key_venc)

    # paginación
    total_items = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    items_page = items[start:end]

    # resumen
    vencido = D("0"); por_vencer = D("0"); sin_venc = D("0")
    for x in items:
        if x["tipo"] in ("expensa","reserva"):
            if x["estado"] == "vencida":
                vencido += D(x["saldo"])
            elif x["estado"] == "pendiente":
                por_vencer += D(x["saldo"])
        else:
            if x["estado"] != "pagada":
                sin_venc += D(x["saldo"])

    total = vencido + por_vencer + sin_venc
    ultimo_pago = _get_ultimo_pago_ts(usuario_id)

    return {
        "resumen": {
            "vencido": vencido,
            "por_vencer": por_vencer,
            "sin_vencimiento": sin_venc,
            "total": total,
            "ultimo_pago": ultimo_pago,
        },
        "items": items_page,
        "page": page,
        "page_size": page_size,
        "total_items": total_items,
    }
