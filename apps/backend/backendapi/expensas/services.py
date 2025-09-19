from typing import Any, Dict, List, Optional, Union
from datetime import date, datetime
from django.utils import timezone
from core.supabase_client import supabase_admin as sb

TIPO_PAGO_EXPENSA = 1
ESTADO_PAGO_REG = 1  # ajusta a tu catálogo


def _exists_view(view_name: str) -> bool:
    try:
        _ = sb.table(view_name).select("id").limit(1).execute()
        return True
    except Exception:
        return False


def list_expensas(propiedad_id: Optional[int] = None) -> List[Dict[str, Any]]:
    q = (
        sb.table("v_expensas_estado").select("*")
        if _exists_view("v_expensas_estado")
        else sb.table("expensas").select("*")
    )
    if propiedad_id:
        q = q.eq("propiedad_id", int(propiedad_id))
    return q.order("fecha", desc=True).execute().data or []


def get_expensa(expensa_id: int) -> Optional[Dict[str, Any]]:
    q = (
        sb.table("v_expensas_estado").select("*").eq("id", expensa_id).single()
        if _exists_view("v_expensas_estado")
        else sb.table("expensas").select("*").eq("id", expensa_id).single()
    )
    return q.execute().data


def _iso(value: Union[str, date, datetime]) -> str:
    """Devuelve una cadena ISO. Acepta 'YYYY-MM-DD' ya formateado o date/datetime."""
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value).strip()


def create_expensa(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inserta una expensa y devuelve el registro (usando get_expensa para enriquecer estado).
    Nota: en supabase-py v2 no se puede encadenar .select() ni .single() después de insert().
    """
    to_insert = {
        "propiedad_id": int(payload["propiedad_id"]),
        "fecha": _iso(payload["fecha"]),
        "total": str(payload["total"]),
        "created_at": timezone.now().isoformat(),
        "tarifa_id": int(payload["tarifa_id"]),
        "fecha_vencimiento": _iso(payload["fecha_vencimiento"]),
    }

    res = sb.table("expensas").insert(to_insert).execute()
    if res.data and len(res.data) > 0:
        inserted = res.data[0]
        return get_expensa(int(inserted["id"])) or inserted

    raise RuntimeError("No se pudo crear la expensa (sin datos de retorno).")


def abonar_expensa(
    expensa_id: int, monto: float, user_uuid: Optional[str]
) -> Dict[str, Any]:
    """
    Llama a la RPC sp_registrar_abono_expensa, probando ambas variantes de nombres
    de parámetros (con y sin guion bajo) y devolviendo un error legible si falla.
    """
    if not expensa_id or not (monto and float(monto) > 0):
        raise ValueError("Expensa y monto son obligatorios.")

    # Si no llega un UUID, usamos uno anónimo para evitar NOT NULL en la función SQL
    uid = (user_uuid or "00000000-0000-0000-0000-000000000000").strip()

    # Intento 1: firma con guion bajo
    args_underscore = {
        "_expensa_id": int(expensa_id),
        "_monto": str(monto),
        "_id_usuario": uid,
        "_estado_pago_id": ESTADO_PAGO_REG,
        "_tipo_pago_id": TIPO_PAGO_EXPENSA,
    }
    resp = sb.rpc("sp_registrar_abono_expensa", args_underscore).execute()

    # Si no hay 'data', probamos la firma sin guion bajo
    if not getattr(resp, "data", None):
        args_plain = {
            "expensa_id": int(expensa_id),
            "monto": str(monto),
            "id_usuario": uid,
            "estado_pago_id": ESTADO_PAGO_REG,
            "tipo_pago_id": TIPO_PAGO_EXPENSA,
        }
        resp2 = sb.rpc("sp_registrar_abono_expensa", args_plain).execute()
        if not getattr(resp2, "data", None):
            err_msg = getattr(resp2, "error", None) or getattr(resp, "error", None)
            raise RuntimeError(f"No se pudo registrar el abono. {err_msg or ''}".strip())
        resp = resp2

    nuevo_estado = get_expensa(expensa_id)
    return {"resultado": resp.data, "expensa": nuevo_estado}


def listar_pagos_expensa(expensa_id: int) -> List[Dict[str, Any]]:
    # cargo_expensa (cargo_id) -> cargos -> pagos
    ce_rows = (
        sb.table("cargo_expensa")
        .select("cargo_id")
        .eq("expensa_id", int(expensa_id))
        .execute()
        .data
        or []
    )
    cargo_ids = [r["cargo_id"] for r in ce_rows]
    if not cargo_ids:
        return []

    cargos = (
        sb.table("cargos")
        .select("*")
        .in_("id", cargo_ids)
        .order("ts", desc=True)
        .execute()
        .data
        or []
    )
    pago_ids = list({c["pago_id"] for c in cargos if c.get("pago_id")})
    pagos_map: Dict[Any, Dict[str, Any]] = {}
    if pago_ids:
        pagos = (
            sb.table("pagos")
            .select("*")
            .in_("id", pago_ids)
            .execute()
            .data
            or []
        )
        pagos_map = {p["id"]: p for p in pagos}

    return [{"cargo": c, "pago": pagos_map.get(c.get("pago_id"))} for c in cargos]
