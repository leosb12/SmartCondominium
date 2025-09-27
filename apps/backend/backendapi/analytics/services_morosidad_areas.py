# backendapi/analytics/services_morosidad_areas.py
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from datetime import date, datetime
from decimal import Decimal
import logging
from django.db import connection

logger = logging.getLogger(__name__)

# ---------- Helpers locales ----------
def _to_float(x: Any) -> Optional[float]:
    if x is None:
        return None
    if isinstance(x, Decimal):
        try:
            return float(x)
        except Exception:
            return None
    if isinstance(x, (int, float)):
        return float(x)
    try:
        return float(x)
    except Exception:
        return None

def _rowify(cursor) -> List[Dict[str, Any]]:
    if not getattr(cursor, "description", None):
        return []
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]

def _exec(sql: str, params: Optional[List[Any] | Tuple[Any, ...]] = None) -> List[Dict[str, Any]]:
    params = [] if params is None else list(params)
    try:
        with connection.cursor() as cur:
            try:
                cur.execute("SET LOCAL TIME ZONE 'America/La_Paz'")
                cur.execute("SET LOCAL statement_timeout = '3000ms'")
            except Exception:
                pass
            cur.execute(sql, params)
            return _rowify(cur)
    except Exception as e:
        logger.exception("SQL error (morosidad/areas): %s", e)
        return []

def _clamp_int(n: Any, minimum: int = 0, default: int = 0) -> int:
    try:
        n = int(n)
    except Exception:
        return default
    return n if n >= minimum else minimum


# ---------- Morosidad ----------
def morosidad_service(
    torre_id: Optional[int],
    propiedad_id: Optional[int],
    desde: Optional[date],
    hasta: Optional[date],
    min_riesgo: Optional[str],
    ordering: Optional[str],
    limit: int,
    offset: int,
    user_id: Optional[str],
    _only_kpis: bool = False,
) -> Dict[str, Any]:

    limit = _clamp_int(limit, 0, 50)
    offset = _clamp_int(offset, 0, 0)

    params_exp: List[Any] = []
    params_res: List[Any] = []
    params_mul: List[Any] = []
    fexp = fres = fmul = ""

    if desde:
        fexp += " WHERE e.fecha >= %s"; params_exp.append(desde)
        fres += " WHERE r.fecha >= %s"; params_res.append(desde)
        fmul += " WHERE m.fecha >= %s"; params_mul.append(desde)
    if hasta:
        fexp += (" AND" if "WHERE" in fexp else " WHERE") + " e.fecha <= %s"; params_exp.append(hasta)
        fres += (" AND" if "WHERE" in fres else " WHERE") + " r.fecha <= %s"; params_res.append(hasta)
        fmul += (" AND" if "WHERE" in fmul else " WHERE") + " m.fecha <= %s"; params_mul.append(hasta)

    prop_filter = ""
    tail: List[Any] = []
    if propiedad_id:
        prop_filter = "AND pr.id = %s"
        tail.append(propiedad_id)

    order_clause = "score DESC"
    if ordering == "score": order_clause = "score ASC"
    elif ordering == "-score": order_clause = "score DESC"
    elif ordering == "saldo_total": order_clause = "saldo_total ASC"
    elif ordering == "-saldo_total": order_clause = "saldo_total DESC"

    mr = (min_riesgo or "").lower()
    if mr == "alto":
        where_riesgo_sql = "WHERE c.riesgo IN ('alto')"
    elif mr == "medio":
        where_riesgo_sql = "WHERE c.riesgo IN ('medio','alto')"
    else:
        where_riesgo_sql = "WHERE c.riesgo IN ('bajo','medio','alto')"

    sql = f"""
    WITH
    exp_raw AS (
      SELECT e.id, e.propiedad_id, e.fecha, e.total, e.fecha_vencimiento
      FROM expensas e
      {fexp}
    ),
    exp_pay AS (
      SELECT ce.expensa_id AS item_id, SUM(c.monto) AS pagado, MAX(c.ts) AS ts_ultimo_pago
      FROM cargo_expensa ce JOIN cargos c ON c.id = ce.cargo_id
      GROUP BY ce.expensa_id
    ),
    exp_agg AS (
      SELECT r.propiedad_id,
             COALESCE(SUM(GREATEST(r.total - COALESCE(p.pagado,0), 0)), 0) AS saldo_expensas,
             MAX(
               CASE
                 WHEN r.fecha_vencimiento IS NULL THEN 0
                 WHEN COALESCE(p.pagado,0) >= r.total
                      THEN GREATEST(0, DATE_PART('day', COALESCE(p.ts_ultimo_pago, now()) - r.fecha_vencimiento))
                 ELSE GREATEST(0, DATE_PART('day', now() - r.fecha_vencimiento))
               END
             ) FILTER (WHERE r.fecha_vencimiento >= now() - INTERVAL '90 days') AS atraso_max_exp_90d
      FROM exp_raw r LEFT JOIN exp_pay p ON p.item_id = r.id
      GROUP BY r.propiedad_id
    ),
    res_raw AS (
      SELECT r.id, r.propiedad_id, r.fecha, r.total, r.fecha_vencimiento
      FROM reserva r
      {fres}
    ),
    res_pay AS (
      SELECT cr.reserva_id AS item_id, SUM(c.monto) AS pagado, MAX(c.ts) AS ts_ultimo_pago
      FROM cargo_reserva cr JOIN cargos c ON c.id = cr.cargo_id
      GROUP BY cr.reserva_id
    ),
    res_agg AS (
      SELECT r.propiedad_id,
             COALESCE(SUM(GREATEST(r.total - COALESCE(p.pagado,0), 0)), 0) AS saldo_reservas,
             MAX(
               CASE
                 WHEN r.fecha_vencimiento IS NULL THEN 0
                 WHEN COALESCE(p.pagado,0) >= r.total
                      THEN GREATEST(0, DATE_PART('day', COALESCE(p.ts_ultimo_pago, now()) - r.fecha_vencimiento))
                 ELSE GREATEST(0, DATE_PART('day', now() - r.fecha_vencimiento))
               END
             ) FILTER (WHERE r.fecha_vencimiento >= now() - INTERVAL '90 days') AS atraso_max_res_90d
      FROM res_raw r LEFT JOIN res_pay p ON p.item_id = r.id
      GROUP BY r.propiedad_id
    ),
    mul_raw AS (
      SELECT m.id, m.propiedad_id, m.fecha, m.total
      FROM multas m
      {fmul}
    ),
    mul_pay AS (
      SELECT cm.multa_id AS item_id, SUM(c.monto) AS pagado
      FROM cargo_multa cm JOIN cargos c ON c.id = cm.cargo_id
      GROUP BY cm.multa_id
    ),
    mul_agg AS (
      SELECT r.propiedad_id,
             COALESCE(SUM(GREATEST(r.total - COALESCE(p.pagado,0), 0)), 0) AS saldo_multas,
             COUNT(*) FILTER (WHERE r.fecha >= now() - INTERVAL '90 days') AS multas_90d_count,
             COALESCE(SUM(r.total) FILTER (WHERE r.fecha >= now() - INTERVAL '90 days'), 0) AS multas_90d_monto,
             COUNT(*) FILTER (WHERE r.fecha >= now() - INTERVAL '90 days'
                              AND GREATEST(r.total - COALESCE(p.pagado,0), 0) > 0) AS multas_90d_sin_cubrir
      FROM mul_raw r LEFT JOIN mul_pay p ON p.item_id = r.id
      GROUP BY r.propiedad_id
    ),
    items_6m AS (
      SELECT 'exp' AS t, r.id, r.propiedad_id, r.fecha_vencimiento, r.total
      FROM exp_raw r WHERE r.fecha >= now() - INTERVAL '6 months'
      UNION ALL
      SELECT 'res' AS t, r.id, r.propiedad_id, r.fecha_vencimiento, r.total
      FROM res_raw r WHERE r.fecha >= now() - INTERVAL '6 months'
    ),
    pagos_6m AS (
      SELECT 'exp' AS t, ce.expensa_id AS item_id, SUM(c.monto) AS pagado, MAX(c.ts) AS ts_ultimo_pago
      FROM cargo_expensa ce JOIN cargos c ON c.id = ce.cargo_id
      GROUP BY ce.expensa_id
      UNION ALL
      SELECT 'res' AS t, cr.reserva_id AS item_id, SUM(c.monto) AS pagado, MAX(c.ts) AS ts_ultimo_pago
      FROM cargo_reserva cr JOIN cargos c ON c.id = cr.cargo_id
      GROUP BY cr.reserva_id
    ),
    puntualidad AS (
      SELECT i.propiedad_id,
             COUNT(*)::int AS total_items,
             COUNT(*) FILTER (
               WHERE i.fecha_vencimiento IS NOT NULL
                 AND COALESCE(p.pagado,0) >= i.total
                 AND COALESCE(p.ts_ultimo_pago, now()) <= i.fecha_vencimiento
             )::int AS items_a_tiempo
      FROM items_6m i LEFT JOIN pagos_6m p
        ON p.t = i.t AND p.item_id = i.id
      GROUP BY i.propiedad_id
    ),
    base AS (
      SELECT pr.id AS propiedad_id, pr.nro_casa,
             COALESCE(ea.saldo_expensas,0) AS saldo_expensas,
             COALESCE(ra.saldo_reservas,0) AS saldo_reservas,
             COALESCE(ma.saldo_multas,0)   AS saldo_multas,
             COALESCE(ea.atraso_max_exp_90d,0) AS atraso_max_exp_90d,
             COALESCE(ra.atraso_max_res_90d,0) AS atraso_max_res_90d,
             COALESCE(pu.total_items,0) AS total_items_6m,
             COALESCE(pu.items_a_tiempo,0) AS items_a_tiempo_6m,
             COALESCE(ma.multas_90d_count,0) AS multas_90d_count,
             COALESCE(ma.multas_90d_monto,0) AS multas_90d_monto,
             COALESCE(ma.multas_90d_sin_cubrir,0) AS multas_90d_sin_cubrir
      FROM propiedad pr
      LEFT JOIN exp_agg ea ON ea.propiedad_id = pr.id
      LEFT JOIN res_agg ra ON ra.propiedad_id = pr.id
      LEFT JOIN mul_agg ma ON ma.propiedad_id = pr.id
      LEFT JOIN puntualidad pu ON pu.propiedad_id = pr.id
      WHERE 1=1
      {prop_filter}
    ),
    enriquecido AS (
      SELECT b.*,
             (b.saldo_expensas + b.saldo_reservas + b.saldo_multas) AS saldo_total,
             GREATEST(b.atraso_max_exp_90d, b.atraso_max_res_90d) AS atraso_max_90d,
             CASE
               WHEN b.total_items_6m = 0 THEN NULL
               ELSE ROUND((b.items_a_tiempo_6m::numeric / NULLIF(b.total_items_6m::numeric, 0)) * 1.0, 4)
             END AS pagos_a_tiempo_6m_pct
      FROM base b
    ),
    scored AS (
      SELECT e.*,
             (
               LEAST(1, (e.atraso_max_90d::numeric / 60.0)) * 0.45
               + (1 - COALESCE(e.pagos_a_tiempo_6m_pct, 0.5)) * 0.45
               + LEAST(1, (e.multas_90d_sin_cubrir::numeric / 3.0)) * 0.10
             )::numeric(6,4) AS score,
             CASE
               WHEN e.atraso_max_90d >= 30 THEN 'Atraso alto'
               WHEN COALESCE(e.pagos_a_tiempo_6m_pct, 1) < 0.6 THEN 'Pocos pagos a tiempo'
               WHEN e.multas_90d_sin_cubrir >= 2 THEN 'Múltiples multas recientes'
               ELSE 'Perfil estable'
             END AS motivo
      FROM enriquecido e
    ),
    clasif AS (
      SELECT s.*,
             CASE
               WHEN s.score >= 0.7 THEN 'alto'
               WHEN s.score >= 0.4 THEN 'medio'
               ELSE 'bajo'
             END AS riesgo
      FROM scored s
    )
    SELECT c.propiedad_id, c.nro_casa,
           c.saldo_expensas, c.saldo_reservas, c.saldo_multas, c.saldo_total,
           COALESCE(c.atraso_max_90d,0)::int AS atraso_max_90d,
           c.pagos_a_tiempo_6m_pct,
           c.multas_90d_count, c.multas_90d_monto, c.multas_90d_sin_cubrir,
           c.score::float AS score, c.riesgo, c.motivo,
           COUNT(*) OVER() AS _total
    FROM clasif c
    {where_riesgo_sql}
    ORDER BY {order_clause}
    LIMIT %s OFFSET %s
    """

    q_params: List[Any] = []
    q_params.extend(params_exp)
    q_params.extend(params_res)
    q_params.extend(params_mul)
    q_params.extend(tail)
    q_params.extend([limit, offset])

    rows = _exec(sql, q_params)

    items: List[Dict[str, Any]] = []
    total = 0
    s_exp = s_res = s_mul = 0.0

    for r in rows:
        item = {
            "propiedad_id": r.get("propiedad_id"),
            "nro_casa": r.get("nro_casa"),
            "saldo_expensas": _to_float(r.get("saldo_expensas")) or 0.0,
            "saldo_reservas": _to_float(r.get("saldo_reservas")) or 0.0,
            "saldo_multas": _to_float(r.get("saldo_multas")) or 0.0,
            "saldo_total": _to_float(r.get("saldo_total")) or 0.0,
            "atraso_max_90d": _clamp_int(r.get("atraso_max_90d"), 0, 0),
            "pagos_a_tiempo_6m_pct": _to_float(r.get("pagos_a_tiempo_6m_pct")),
            "multas_recientes_90d_count": _clamp_int(r.get("multas_90d_count"), 0, 0),
            "multas_recientes_90d_monto": _to_float(r.get("multas_90d_monto")) or 0.0,
            "multas_recientes_90d_sin_cubrir_count": _clamp_int(r.get("multas_90d_sin_cubrir"), 0, 0),
            "score": _to_float(r.get("score")) or 0.0,
            "riesgo": r.get("riesgo"),
            "motivo": r.get("motivo"),
        }
        items.append(item)
        total = _clamp_int(r.get("_total"), 0, total)
        s_exp += item["saldo_expensas"]; s_res += item["saldo_reservas"]; s_mul += item["saldo_multas"]

    kpis = None
    if _only_kpis:
        riesgo_counts = {"alto": 0, "medio": 0, "bajo": 0}
        for it in items:
            rz = (it.get("riesgo") or "bajo").lower()
            if rz not in riesgo_counts: rz = "bajo"
            riesgo_counts[rz] += 1
        denom = max(sum(riesgo_counts.values()), 1)
        kpis = {
            "porcentaje_alto": round(riesgo_counts["alto"]/denom, 4),
            "porcentaje_medio": round(riesgo_counts["medio"]/denom, 4),
            "porcentaje_bajo": round(riesgo_counts["bajo"]/denom, 4),
            "saldo_total_expensas": round(s_exp, 2),
            "saldo_total_reservas": round(s_res, 2),
            "saldo_total_multas": round(s_mul, 2),
            "top5_propiedades": items[:5],
        }

    return {
        "items": items,
        "total": total,
        "filtros": {
            "propiedad_id": propiedad_id,
            "desde": getattr(desde, "isoformat", lambda: None)() if desde else None,
            "hasta": getattr(hasta, "isoformat", lambda: None)() if hasta else None,
            "min_riesgo": min_riesgo,
            "ordering": ordering,
        },
        **({"kpis": kpis} if _only_kpis else {}),
    }


# ---------- Áreas de uso ----------
def areas_uso_service(
    area_social_id: Optional[int],
    semanas: int,
    limit: int,
    offset: int,
    user_id: Optional[str],
    _only_kpis: bool = False,
) -> Dict[str, Any]:

    limit = _clamp_int(limit, 0, 50)
    offset = _clamp_int(offset, 0, 0)
    semanas = _clamp_int(semanas, 1, 8)

    where_area = ""
    params: List[Any] = [semanas]
    if area_social_id:
        where_area = "AND r.area_social_id = %s"
        params.append(area_social_id)

    sql = f"""
    WITH base AS (
      SELECT
        r.area_social_id,
        date_trunc('week', r.fecha)::date AS semana,
        EXTRACT(DOW FROM r.fecha)::int AS dow,
        h.valor AS hora_time,
        EXTRACT(HOUR FROM h.valor)::int AS hora,
        COUNT(*) AS reservas,
        SUM(r.total)::numeric AS ingreso
      FROM reserva r
      JOIN hora h ON h.id = r.hora_inicio_id
      WHERE r.fecha >= CURRENT_DATE - (%s || ' weeks')::interval
      {where_area}
      GROUP BY r.area_social_id, date_trunc('week', r.fecha), EXTRACT(DOW FROM r.fecha), h.valor, EXTRACT(HOUR FROM h.valor)
    ),
    agg AS (
      SELECT
        b.area_social_id, b.dow, b.hora,
        AVG(b.reservas)::numeric(10,2) AS demanda_esperada,
        SUM(b.reservas)::int AS reservas_totales_periodo,
        SUM(b.ingreso)::numeric AS ingreso_estimado_periodo
      FROM base b
      GROUP BY b.area_social_id, b.dow, b.hora
    ),
    named AS (
      SELECT
        a.area_social_id, a.dow, a.hora,
        a.demanda_esperada, a.reservas_totales_periodo, a.ingreso_estimado_periodo,
        asoc.nombre AS nombre_area
      FROM agg a
      JOIN area_social asoc ON asoc.id = a.area_social_id
    )
    SELECT
      n.area_social_id, n.nombre_area, n.dow, n.hora,
      n.demanda_esperada::float AS demanda_esperada,
      n.reservas_totales_periodo,
      n.ingreso_estimado_periodo::float AS ingreso_estimado_periodo,
      COUNT(*) OVER() AS _total
    FROM named n
    ORDER BY n.area_social_id, n.dow, n.hora
    LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    rows = _exec(sql, params)
    items: List[Dict[str, Any]] = []
    total = 0
    for r in rows:
        items.append({
            "area_social_id": r.get("area_social_id"),
            "nombre_area": r.get("nombre_area"),
            "dow": _clamp_int(r.get("dow"), 0, 0),
            "hora": _clamp_int(r.get("hora"), 0, 0),
            "demanda_esperada": _to_float(r.get("demanda_esperada")) or 0.0,
            "reservas_totales_periodo": _clamp_int(r.get("reservas_totales_periodo"), 0, 0),
            "ingreso_estimado_periodo": _to_float(r.get("ingreso_estimado_periodo")) or 0.0,
        })
        total = _clamp_int(r.get("_total"), 0, total)

    kpis = None
    if _only_kpis:
        top5 = sorted(items, key=lambda x: x.get("demanda_esperada", 0.0), reverse=True)[:5]
        demand_by_area: Dict[int, float] = {}
        for it in items:
            aid = it.get("area_social_id")
            demand_by_area[aid] = demand_by_area.get(aid, 0.0) + (it.get("demanda_esperada") or 0.0)
        top3_areas = sorted(
            [{"area_social_id": aid,
              "nombre_area": next((i.get("nombre_area") for i in items if i.get("area_social_id") == aid), "") or "",
              "demanda_total_periodo": round(val or 0.0, 2)} for aid, val in demand_by_area.items()],
            key=lambda x: x["demanda_total_periodo"], reverse=True
        )[:3]
        kpis = {"top5_horas_pico": top5, "top3_areas_por_demanda": top3_areas}

    return {
        "items": items,
        "total": total,
        "filtros": {"area_social_id": area_social_id, "semanas": semanas},
        **({"kpis": kpis} if _only_kpis else {}),
    }


# ---------- Diagnóstico rápido (opcional para debug) ----------
def diagnostico_morosidad() -> Dict[str, int]:
    """
    Devuelve conteos básicos para verificar data disponible.
    """
    out: Dict[str, int] = {}
    for name, sql in {
        "propiedad": "SELECT COUNT(*) c FROM propiedad",
        "expensas": "SELECT COUNT(*) c FROM expensas",
        "reserva": "SELECT COUNT(*) c FROM reserva",
        "multas": "SELECT COUNT(*) c FROM multas",
        "cargos": "SELECT COUNT(*) c FROM cargos",
        "cargo_expensa": "SELECT COUNT(*) c FROM cargo_expensa",
        "cargo_reserva": "SELECT COUNT(*) c FROM cargo_reserva",
        "cargo_multa": "SELECT COUNT(*) c FROM cargo_multa",
    }.items():
        rows = _exec(sql, [])
        out[name] = int(rows[0]["c"]) if rows else 0
    return out
