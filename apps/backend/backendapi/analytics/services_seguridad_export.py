# backendapi/analytics/services_seguridad_export.py
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from datetime import date, datetime
from decimal import Decimal
import logging, csv
from io import StringIO
from django.db import connection

# Importo los servicios ya separados para reusar en dashboard/export
from .services_morosidad_areas import (
    morosidad_service,
    areas_uso_service,
)

logger = logging.getLogger(__name__)

# ---------- Helpers mínimos ----------
def _to_float(x: Any) -> Optional[float]:
    if x is None: return None
    if isinstance(x, Decimal):
        try: return float(x)
        except Exception: return None
    if isinstance(x, (int, float)): return float(x)
    try: return float(x)
    except Exception: return None

def _rowify(cursor) -> List[Dict[str, Any]]:
    if not getattr(cursor, "description", None): return []
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
        logger.exception("SQL error (seguridad/export): %s", e)
        return []

def _clamp_int(n: Any, minimum: int = 0, default: int = 0) -> int:
    try:
        n = int(n)
    except Exception:
        return default
    return n if n >= minimum else minimum


# ---------- Seguridad ----------
def seguridad_service(
    dias: int,
    solo_pendientes: bool,
    limit: int,
    offset: int,
    user_id: Optional[str],
    _only_kpis: bool = False,
) -> Dict[str, Any]:

    dias = _clamp_int(dias, 1, 21)
    limit = _clamp_int(limit, 0, 200)
    offset = _clamp_int(offset, 0, 0)

    sql_autos = """
    WITH series AS (
      SELECT date_trunc('hour', raa.fecha_hora) AS hora,
             COUNT(*) FILTER (WHERE raa.resultado = 'AUTORIZADO') AS autorizados,
             COUNT(*) FILTER (WHERE raa.resultado <> 'AUTORIZADO') AS denegados
      FROM registro_acceso_auto raa
      WHERE raa.fecha_hora >= now() - (%s || ' days')::interval
      GROUP BY date_trunc('hour', raa.fecha_hora)
    ),
    base AS (
      SELECT s.hora, EXTRACT(HOUR FROM s.hora)::int AS hod, s.autorizados, s.denegados
      FROM series s
    ),
    stats AS (
      SELECT b.hod, AVG(b.denegados) AS avg_den, NULLIF(STDDEV_POP(b.denegados), 0) AS std_den
      FROM base b GROUP BY b.hod
    )
    SELECT b.hora, b.autorizados, b.denegados,
           COALESCE((b.denegados - s.avg_den) / NULLIF(s.std_den, 0), 0)::float AS zscore,
           CASE WHEN s.std_den IS NULL OR b.denegados < s.avg_den + 2*s.std_den THEN 'normal' ELSE 'anomalia' END AS estado
    FROM base b LEFT JOIN stats s ON s.hod = b.hod
    ORDER BY b.hora DESC
    LIMIT %s OFFSET %s
    """
    autos_rows = _exec(sql_autos, [dias, limit, offset])
    autos_por_hora = [{
        "hora": (r.get("hora").isoformat() if isinstance(r.get("hora"), datetime) else r.get("hora")),
        "autorizados": _clamp_int(r.get("autorizados"), 0, 0),
        "denegados": _clamp_int(r.get("denegados"), 0, 0),
        "zscore": _to_float(r.get("zscore")) or 0.0,
        "estado": (r.get("estado") or "normal"),
    } for r in autos_rows]

    sql_personas = """
    WITH series AS (
      SELECT date_trunc('hour', ri.ts) AS hora,
             COUNT(*) FILTER (WHERE ri.resultado_id = 1) AS permisos,
             COUNT(*) FILTER (WHERE ri.resultado_id = 2) AS rechazos,
             COUNT(*) FILTER (WHERE ri.resultado_id = 2 AND ri.invitado = TRUE)  AS rechazos_invitados,
             COUNT(*) FILTER (WHERE ri.resultado_id = 2 AND ri.invitado = FALSE) AS rechazos_no_invitados
      FROM registro_ingreso ri
      WHERE ri.ts >= now() - (%s || ' days')::interval
      GROUP BY date_trunc('hour', ri.ts)
    ),
    base AS (
      SELECT s.hora, EXTRACT(HOUR FROM s.hora)::int AS hod,
             s.permisos, s.rechazos, s.rechazos_invitados, s.rechazos_no_invitados
      FROM series s
    ),
    stats AS (
      SELECT b.hod, AVG(b.rechazos) AS avg_rej, NULLIF(STDDEV_POP(b.rechazos), 0) AS std_rej
      FROM base b GROUP BY b.hod
    )
    SELECT b.hora, b.permisos, b.rechazos, b.rechazos_invitados, b.rechazos_no_invitados,
           COALESCE((b.rechazos - s.avg_rej) / NULLIF(s.std_rej, 0), 0)::float AS zscore,
           CASE WHEN s.std_rej IS NULL OR b.rechazos < s.avg_rej + 2*s.std_rej THEN 'normal' ELSE 'anomalia' END AS estado
    FROM base b LEFT JOIN stats s ON s.hod = b.hod
    ORDER BY b.hora DESC
    LIMIT %s OFFSET %s
    """
    per_rows = _exec(sql_personas, [dias, limit, offset])
    personas_por_hora = [{
        "hora": (r.get("hora").isoformat() if isinstance(r.get("hora"), datetime) else r.get("hora")),
        "permisos": _clamp_int(r.get("permisos"), 0, 0),
        "rechazos": _clamp_int(r.get("rechazos"), 0, 0),
        "rechazos_invitados": _clamp_int(r.get("rechazos_invitados"), 0, 0),
        "rechazos_no_invitados": _clamp_int(r.get("rechazos_no_invitados"), 0, 0),
        "zscore": _to_float(r.get("zscore")) or 0.0,
        "estado": (r.get("estado") or "normal"),
    } for r in per_rows]

    where = ["a.fecha >= now() - (%s || ' days')::interval"]
    p = [dias]
    if solo_pendientes: where.append("a.procesado = FALSE")
    sql_anom = f"""
    SELECT a.id, a.tipo_anomalia, a.descripcion, a.fecha, a.ubicacion, a.procesado
    FROM anomalia a
    WHERE {' AND '.join(where)}
    ORDER BY a.fecha DESC
    LIMIT %s OFFSET %s
    """
    p.extend([limit, offset])
    anom_rows = _exec(sql_anom, p)
    anomalias = [{
        "id": r.get("id"),
        "tipo_anomalia": r.get("tipo_anomalia"),
        "descripcion": r.get("descripcion"),
        "fecha": (r.get("fecha").isoformat() if isinstance(r.get("fecha"), datetime) else r.get("fecha")),
        "ubicacion": r.get("ubicacion"),
        "procesado": r.get("procesado"),
    } for r in anom_rows]

    kpis = None
    if _only_kpis:
        kpis = {
            "horas_calientes_autos": [it for it in autos_por_hora if it.get("estado") == "anomalia"][:5],
            "horas_calientes_personas": [it for it in personas_por_hora if it.get("estado") == "anomalia"][:5],
            "anomalias_pendientes": sum(1 for it in anomalias if it.get("procesado") is False),
        }

    return {
        "autos_por_hora": autos_por_hora,
        "personas_por_hora": personas_por_hora,
        "anomalias": anomalias,
        "filtros": {"dias": dias, "solo_pendientes": bool(solo_pendientes)},
        **({"kpis": kpis} if _only_kpis else {}),
    }


# ---------- Dashboard (re-usa los servicios) ----------
def dashboard_service(
    torre_id: Optional[int],
    desde: Optional[date],
    hasta: Optional[date],
    user_id: Optional[str],
) -> Dict[str, Any]:
    mor = morosidad_service(
        torre_id=torre_id, propiedad_id=None,
        desde=desde, hasta=hasta, min_riesgo=None,
        ordering="-score", limit=5, offset=0, user_id=user_id, _only_kpis=True
    )
    areas = areas_uso_service(
        area_social_id=None, semanas=8,
        limit=200, offset=0, user_id=user_id, _only_kpis=True
    )
    seg = seguridad_service(
        dias=21, solo_pendientes=False, limit=200, offset=0, user_id=user_id, _only_kpis=True
    )
    return {
        "morosidad": mor.get("kpis", {}) or {},
        "areas": areas.get("kpis", {}) or {},
        "seguridad": seg.get("kpis", {}) or {},
        "filtros": {
            "torre_id": torre_id,
            "desde": getattr(desde, "isoformat", lambda: None)() if desde else None,
            "hasta": getattr(hasta, "isoformat", lambda: None)() if hasta else None,
            "tz": "America/La_Paz",
        },
    }


# ---------- Exportación (CSV) ----------
def _cell(v: Any) -> Any:
    if isinstance(v, (datetime, date)):
        try: return v.isoformat()
        except Exception: return str(v)
    if isinstance(v, bool): return "TRUE" if v else "FALSE"
    return v

def _to_csv_bytes(rows: List[Dict[str, Any]], header: Optional[List[str]]) -> bytes:
    sio = StringIO()
    w = csv.writer(sio)
    if not rows:
        if header: w.writerow(header)
        return sio.getvalue().encode("utf-8")
    if header is None:
        seen: List[str] = []
        for r in rows:
            for k in (r.keys() if isinstance(r, dict) else []):
                if k not in seen: seen.append(k)
        header = seen
    w.writerow(header)
    for r in rows:
        if not isinstance(r, dict):
            w.writerow([_cell(r)])
        else:
            w.writerow([_cell(r.get(k)) for k in header])
    return sio.getvalue().encode("utf-8")

def _maybe_int(v) -> Optional[int]:
    try:
        if v is None or v == "": return None
        return int(v)
    except Exception:
        return None

def _maybe_bool(v) -> bool:
    if v is None: return False
    return str(v).lower() in ("1","true","t","yes","y")

def _maybe_date(v) -> Optional[date]:
    from django.utils.dateparse import parse_date
    if not v: return None
    try: return parse_date(v)
    except Exception: return None

def _safe_get(container, key: str, default: Any = None) -> Any:
    try:
        if hasattr(container, "get"):
            return container.get(key, default)
        return container[key] if key in container else default
    except Exception:
        return default

def export_service(
    tipo: str,
    query_params,
    user_id: Optional[str],
) -> Tuple[bytes, str, str]:
    tipo = (tipo or "").lower()

    if tipo == "csv_morosidad":
        data = morosidad_service(
            torre_id=None,
            propiedad_id=_maybe_int(_safe_get(query_params, "propiedad_id")),
            desde=_maybe_date(_safe_get(query_params, "desde")),
            hasta=_maybe_date(_safe_get(query_params, "hasta")),
            min_riesgo=((_safe_get(query_params, "min_riesgo") or "").lower() or None),
            ordering=_safe_get(query_params, "ordering") or "-score",
            limit=min(_maybe_int(_safe_get(query_params, "limit")) or 10000, 10000),
            offset=_maybe_int(_safe_get(query_params, "offset")) or 0,
            user_id=user_id,
        )
        csv_bytes = _to_csv_bytes(
            data.get("items", []),
            header=[
                "propiedad_id","nro_casa","saldo_expensas","saldo_reservas","saldo_multas",
                "saldo_total","atraso_max_90d","pagos_a_tiempo_6m_pct",
                "multas_recientes_90d_count","multas_recientes_90d_monto",
                "multas_recientes_90d_sin_cubrir_count","score","riesgo","motivo",
            ],
        )
        return csv_bytes, "text/csv; charset=utf-8", "morosidad.csv"

    if tipo == "csv_areas":
        data = areas_uso_service(
            area_social_id=_maybe_int(_safe_get(query_params, "area_social_id")),
            semanas=min(_maybe_int(_safe_get(query_params, "semanas")) or 8, 12),
            limit=min(_maybe_int(_safe_get(query_params, "limit")) or 10000, 10000),
            offset=_maybe_int(_safe_get(query_params, "offset")) or 0,
            user_id=user_id,
        )
        csv_bytes = _to_csv_bytes(
            data.get("items", []),
            header=[
                "area_social_id","nombre_area","dow","hora",
                "demanda_esperada","reservas_totales_periodo","ingreso_estimado_periodo"
            ],
        )
        return csv_bytes, "text/csv; charset=utf-8", "areas_uso.csv"

    if tipo == "csv_seguridad":
        data = seguridad_service(
            dias=min(_maybe_int(_safe_get(query_params, "dias")) or 21, 60),
            solo_pendientes=_maybe_bool(_safe_get(query_params, "solo_pendientes")),
            limit=min(_maybe_int(_safe_get(query_params, "limit")) or 10000, 10000),
            offset=_maybe_int(_safe_get(query_params, "offset")) or 0,
            user_id=user_id,
        )
        flat: List[Dict[str, Any]] = []
        for it in data.get("autos_por_hora", []):     flat.append({"seccion": "autos_por_hora", **it})
        for it in data.get("personas_por_hora", []):  flat.append({"seccion": "personas_por_hora", **it})
        for it in data.get("anomalias", []):          flat.append({"seccion": "anomalias", **it})
        csv_bytes = _to_csv_bytes(flat, header=None)
        return csv_bytes, "text/csv; charset=utf-8", "seguridad.csv"

    if tipo == "pdf":
        raise ValueError("Exportación a PDF aún no implementada. Usa CSV mientras tanto.")

    raise ValueError("Tipo de exportación no soportado.")


# ---------- Diagnóstico rápido (opcional) ----------
def diagnostico_seguridad() -> Dict[str, int]:
    out: Dict[str, int] = {}
    for name, sql in {
        "anomalia": "SELECT COUNT(*) c FROM anomalia",
        "registro_acceso_auto": "SELECT COUNT(*) c FROM registro_acceso_auto",
        "registro_ingreso": "SELECT COUNT(*) c FROM registro_ingreso",
    }.items():
        rows = _exec(sql, [])
        out[name] = int(rows[0]["c"]) if rows else 0
    return out
