# backendapi/analytics/services_api.py
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from datetime import date
from .services_morosidad_areas import morosidad_service, areas_uso_service
from .services_seguridad import seguridad_service

def _fallback_seguridad_kpis(seg: Dict[str, Any]) -> Dict[str, Any]:
    # Si ya hay KPIs, respétalos
    k = seg.get("kpis")
    if isinstance(k, dict) and (
        k.get("horas_calientes_autos") or k.get("horas_calientes_personas")
    ):
        return k

    autos = seg.get("autos_por_hora", []) or []
    pers  = seg.get("personas_por_hora", []) or []
    anoms = seg.get("anomalias", []) or []

    # Top por conteo simple si no hubo z-score “anomalia”
    top_autos = sorted(autos, key=lambda x: (x.get("denegados") or 0), reverse=True)[:5]
    top_pers  = sorted(pers,  key=lambda x: (x.get("rechazos") or 0),  reverse=True)[:5]
    pend = sum(1 for it in anoms if it.get("procesado") is False)

    return {
        "horas_calientes_autos": top_autos,
        "horas_calientes_personas": top_pers,
        "anomalias_pendientes": pend,
    }

def dashboard_service(
    torre_id: Optional[int],
    desde: Optional[date],
    hasta: Optional[date],
    user_id: Optional[str],
) -> Dict[str, Any]:
    mor = morosidad_service(
        torre_id=torre_id, propiedad_id=None,
        desde=desde, hasta=hasta, min_riesgo=None,
        ordering="-score", limit=5, offset=0,
        user_id=user_id, _only_kpis=True,
    )

    areas = areas_uso_service(
        area_social_id=None, semanas=8, limit=200, offset=0,
        user_id=user_id, _only_kpis=True,
    )

    seg = seguridad_service(
        dias=21, solo_pendientes=False, limit=200, offset=0,
        user_id=user_id, _only_kpis=True,
    )
    # Asegurar KPIs visibles en Seguridad
    seg_kpis = _fallback_seguridad_kpis(seg)

    return {
        "morosidad": mor.get("kpis", {}) or {},
        "areas": areas.get("kpis", {}) or {},
        "seguridad": seg_kpis,
        "filtros": {
            "torre_id": torre_id,
            "desde": desde.isoformat() if desde else None,
            "hasta": hasta.isoformat() if hasta else None,
            "tz": "America/La_Paz",
        },
    }

# -------- Exportaciones CSV/PDF (re-usa los services) --------
import csv
from io import StringIO
from datetime import date as _date
from django.utils.dateparse import parse_date as _parse_date

def export_service(tipo: str, query_params, user_id: Optional[str]) -> Tuple[bytes, str, str]:
    tipo = (tipo or "").lower()

    def _get(q, k, d=None):
        try:
            return q.get(k, d) if hasattr(q, "get") else (q[k] if k in q else d)
        except Exception:
            return d

    def _maybe_int(v):
        try:
            return None if v in (None, "") else int(v)
        except Exception:
            return None

    def _maybe_bool(v):
        if v is None: return False
        return str(v).lower() in ("1","true","t","yes","y")

    def _maybe_date(v):
        if not v: return None
        return _parse_date(v)

    def _to_csv_bytes(rows: List[Dict[str, Any]], header: Optional[List[str]]) -> bytes:
        sio = StringIO()
        w = csv.writer(sio)
        if header:
            w.writerow(header)
        if rows:
            if header is None:
                keys = []
                for r in rows:
                    for k in r.keys():
                        if k not in keys: keys.append(k)
                header = keys
                w.writerow(header)
            for r in rows:
                w.writerow([r.get(k) for k in header])
        return sio.getvalue().encode("utf-8")

    if tipo == "csv_morosidad":
        data = morosidad_service(
            torre_id=None,
            propiedad_id=_maybe_int(_get(query_params, "propiedad_id")),
            desde=_maybe_date(_get(query_params, "desde")),
            hasta=_maybe_date(_get(query_params, "hasta")),
            min_riesgo=(_get(query_params, "min_riesgo") or "").lower() or None,
            ordering=_get(query_params, "ordering") or "-score",
            limit=min(_maybe_int(_get(query_params, "limit")) or 10000, 10000),
            offset=_maybe_int(_get(query_params, "offset")) or 0,
            user_id=user_id,
        )
        csv_bytes = _to_csv_bytes(data.get("items", []), header=[
            "propiedad_id","nro_casa","saldo_expensas","saldo_reservas",
            "saldo_multas","saldo_total","atraso_max_90d","pagos_a_tiempo_6m_pct",
            "multas_recientes_90d_count","multas_recientes_90d_monto",
            "multas_recientes_90d_sin_cubrir_count","score","riesgo","motivo",
        ])
        return csv_bytes, "text/csv; charset=utf-8", "morosidad.csv"

    if tipo == "csv_areas":
        data = areas_uso_service(
            area_social_id=_maybe_int(_get(query_params, "area_social_id")),
            semanas=min(_maybe_int(_get(query_params, "semanas")) or 8, 12),
            limit=min(_maybe_int(_get(query_params, "limit")) or 10000, 10000),
            offset=_maybe_int(_get(query_params, "offset")) or 0,
            user_id=user_id,
        )
        csv_bytes = _to_csv_bytes(data.get("items", []), header=[
            "area_social_id","nombre_area","dow","hora",
            "demanda_esperada","reservas_totales_periodo","ingreso_estimado_periodo",
        ])
        return csv_bytes, "text/csv; charset=utf-8", "areas_uso.csv"

    if tipo == "csv_seguridad":
        data = seguridad_service(
            dias=min(_maybe_int(_get(query_params, "dias")) or 21, 60),
            solo_pendientes=_maybe_bool(_get(query_params, "solo_pendientes")),
            limit=min(_maybe_int(_get(query_params, "limit")) or 10000, 10000),
            offset=_maybe_int(_get(query_params, "offset")) or 0,
            user_id=user_id,
        )
        flat: List[Dict[str, Any]] = []
        for it in data.get("autos_por_hora", []):
            flat.append({"seccion": "autos_por_hora", **it})
        for it in data.get("personas_por_hora", []):
            flat.append({"seccion": "personas_por_hora", **it})
        for it in data.get("anomalias", []):
            flat.append({"seccion": "anomalias", **it})
        csv_bytes = _to_csv_bytes(flat, header=None)
        return csv_bytes, "text/csv; charset=utf-8", "seguridad.csv"

    raise ValueError("Tipo de exportación no soportado.")
