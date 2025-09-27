# backendapi/analytics/validators.py
from __future__ import annotations

from typing import Any, Dict, Mapping, Optional, Tuple
from datetime import date
from django.utils.dateparse import parse_date


# ==============================
# Excepción de validación
# ==============================
class ValidationError(Exception):
    """Error de validación de parámetros."""


# ==============================
# Constantes y choices
# ==============================
ALLOWED_RIESGO = ("bajo", "medio", "alto")
ALLOWED_ORDERING_MOROSIDAD = ("score", "-score", "saldo_total", "-saldo_total")

DEFAULT_LIMIT = 50
DEFAULT_LIMIT_AREAS = 100
DEFAULT_LIMIT_SEG = 100

MAX_LIMIT_LIST = 100
MAX_LIMIT_AREAS = 200
MAX_LIMIT_SEG = 200
MAX_LIMIT_EXPORT = 10_000

DEFAULT_SEMANAS = 8
MAX_SEMANAS = 12

DEFAULT_DIAS = 21
MAX_DIAS = 60


# ==============================
# Helpers de parseo/normalización
# ==============================
def _to_int(v: Any, *, allow_none: bool = True) -> Optional[int]:
    if v is None or v == "":
        if allow_none:
            return None
        raise ValidationError("Valor entero requerido")
    try:
        return int(v)
    except (TypeError, ValueError):
        raise ValidationError("Valor entero inválido")

def _to_bool(v: Any, *, default: bool = False) -> bool:
    if v is None:
        return default
    return str(v).lower() in ("1", "true", "t", "yes", "y")

def _to_date(v: Any, *, allow_none: bool = True) -> Optional[date]:
    if v is None or v == "":
        if allow_none:
            return None
        raise ValidationError("Fecha requerida (YYYY-MM-DD)")
    d = parse_date(str(v))
    if not d:
        raise ValidationError("Fecha inválida (use YYYY-MM-DD)")
    return d

def _clamp(n: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, n))

def _validate_range(desde: Optional[date], hasta: Optional[date]) -> Tuple[Optional[date], Optional[date]]:
    if desde and hasta and desde > hasta:
        raise ValidationError("El rango de fechas es inválido: 'desde' no puede ser mayor que 'hasta'")
    return desde, hasta

def _validate_ordering(ordering: Optional[str], allowed: Tuple[str, ...]) -> str:
    if not ordering:
        # valor por defecto para morosidad lo decide la view/llamador
        return ""
    if ordering not in allowed:
        raise ValidationError(f"ordering inválido. Use: { '|'.join(allowed) }")
    return ordering

def _validate_min_riesgo(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    v = v.lower().strip()
    if v not in ALLOWED_RIESGO:
        raise ValidationError("min_riesgo debe ser uno de: bajo|medio|alto")
    return v


# ==============================
# Validadores por endpoint
# ==============================
def validate_dashboard_query(params: Mapping[str, Any]) -> Dict[str, Any]:
    """Valida/normaliza query de /analytics/dashboard"""
    torre_id = _to_int(params.get("torre_id")) if params.get("torre_id") not in (None, "") else None
    desde = _to_date(params.get("desde"))
    hasta = _to_date(params.get("hasta"))
    _validate_range(desde, hasta)
    return {
        "torre_id": torre_id,
        "desde": desde,
        "hasta": hasta,
    }


def validate_morosidad_query(params: Mapping[str, Any]) -> Dict[str, Any]:
    """
    Valida/normaliza query de /analytics/morosidad
    Campos: torre_id?, propiedad_id?, desde?, hasta?, min_riesgo?, ordering?, limit?, offset?
    """
    torre_id = _to_int(params.get("torre_id")) if params.get("torre_id") not in (None, "") else None
    propiedad_id = _to_int(params.get("propiedad_id")) if params.get("propiedad_id") not in (None, "") else None
    desde = _to_date(params.get("desde"))
    hasta = _to_date(params.get("hasta"))
    _validate_range(desde, hasta)

    min_riesgo = _validate_min_riesgo(params.get("min_riesgo"))
    ordering = _validate_ordering(params.get("ordering"), ALLOWED_ORDERING_MOROSIDAD) or "-score"

    limit = _to_int(params.get("limit"), allow_none=True) or DEFAULT_LIMIT
    offset = _to_int(params.get("offset"), allow_none=True) or 0
    limit = _clamp(limit, 1, MAX_LIMIT_LIST)
    offset = max(0, offset)

    return {
        "torre_id": torre_id,
        "propiedad_id": propiedad_id,
        "desde": desde,
        "hasta": hasta,
        "min_riesgo": min_riesgo,
        "ordering": ordering,
        "limit": limit,
        "offset": offset,
    }


def validate_areas_query(params: Mapping[str, Any]) -> Dict[str, Any]:
    """
    Valida/normaliza query de /analytics/areas-uso
    Campos: area_social_id?, semanas?, limit?, offset?
    """
    area_social_id = _to_int(params.get("area_social_id")) if params.get("area_social_id") not in (None, "") else None
    semanas = _to_int(params.get("semanas"), allow_none=True) or DEFAULT_SEMANAS
    semanas = _clamp(semanas, 1, MAX_SEMANAS)

    limit = _to_int(params.get("limit"), allow_none=True) or DEFAULT_LIMIT_AREAS
    offset = _to_int(params.get("offset"), allow_none=True) or 0
    limit = _clamp(limit, 1, MAX_LIMIT_AREAS)
    offset = max(0, offset)

    return {
        "area_social_id": area_social_id,
        "semanas": semanas,
        "limit": limit,
        "offset": offset,
    }


def validate_seguridad_query(params: Mapping[str, Any]) -> Dict[str, Any]:
    """
    Valida/normaliza query de /analytics/seguridad
    Campos: dias?, solo_pendientes?, limit?, offset?
    """
    dias = _to_int(params.get("dias"), allow_none=True) or DEFAULT_DIAS
    dias = _clamp(dias, 1, MAX_DIAS)

    solo_pendientes = _to_bool(params.get("solo_pendientes"), default=False)

    limit = _to_int(params.get("limit"), allow_none=True) or DEFAULT_LIMIT_SEG
    offset = _to_int(params.get("offset"), allow_none=True) or 0
    limit = _clamp(limit, 1, MAX_LIMIT_SEG)
    offset = max(0, offset)

    return {
        "dias": dias,
        "solo_pendientes": solo_pendientes,
        "limit": limit,
        "offset": offset,
    }


def validate_export_query(params: Mapping[str, Any]) -> Dict[str, Any]:
    """
    Valida/normaliza query de /analytics/export
    Campos: tipo=(pdf|csv_morosidad|csv_areas|csv_seguridad) + filtros opcionales.
    """
    tipo = (params.get("tipo") or "").lower().strip()
    if tipo not in ("pdf", "csv_morosidad", "csv_areas", "csv_seguridad"):
        raise ValidationError("tipo inválido. Use: pdf|csv_morosidad|csv_areas|csv_seguridad")

    # Morosidad
    propiedad_id = _to_int(params.get("propiedad_id")) if params.get("propiedad_id") not in (None, "") else None
    desde = _to_date(params.get("desde"))
    hasta = _to_date(params.get("hasta"))
    _validate_range(desde, hasta)
    min_riesgo = _validate_min_riesgo(params.get("min_riesgo"))
    ordering = params.get("ordering")
    if ordering:
        ordering = _validate_ordering(ordering, ALLOWED_ORDERING_MOROSIDAD)

    # Áreas
    semanas = None
    if params.get("semanas") not in (None, ""):
        semanas = _clamp(_to_int(params.get("semanas"), allow_none=False), 1, MAX_SEMANAS)

    area_social_id = _to_int(params.get("area_social_id")) if params.get("area_social_id") not in (None, "") else None

    # Seguridad
    dias = None
    if params.get("dias") not in (None, ""):
        dias = _clamp(_to_int(params.get("dias"), allow_none=False), 1, MAX_DIAS)

    solo_pendientes = _to_bool(params.get("solo_pendientes"), default=False)

    # Paginación (export permite más)
    limit = _to_int(params.get("limit"), allow_none=True)
    if limit is not None:
        limit = _clamp(limit, 1, MAX_LIMIT_EXPORT)
    offset = _to_int(params.get("offset"), allow_none=True)
    if offset is not None:
        offset = max(0, offset)

    return {
        "tipo": tipo,
        "propiedad_id": propiedad_id,
        "desde": desde,
        "hasta": hasta,
        "min_riesgo": min_riesgo,
        "ordering": ordering,
        "semanas": semanas,
        "area_social_id": area_social_id,
        "dias": dias,
        "solo_pendientes": solo_pendientes,
        "limit": limit,
        "offset": offset,
    }
