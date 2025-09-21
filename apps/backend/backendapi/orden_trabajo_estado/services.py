from typing import Optional, Tuple, Union, Any, List
from core.supabase_client import supabase, supabase_admin


def _to_data(resp: Union[dict, Any]) -> Optional[Any]:
    if hasattr(resp, "data"):
        return getattr(resp, "data")
    if isinstance(resp, dict):
        return resp.get("data")
    return None


def estado_existe(estado_id: int) -> bool:
    try:
        resp = supabase.table("estado_trabajo").select("id").eq("id", estado_id).limit(1).execute()
        data = _to_data(resp)
        return bool(data)
    except Exception:
        return False


def listar_estados_trabajo() -> Tuple[Optional[List[dict]], Optional[str]]:
    try:
        resp = supabase.table("estado_trabajo").select("id, nombre").order("id", desc=False).execute()
        data = _to_data(resp)
        return (data if data is not None else []), None
    except Exception as e:
        return None, f"Supabase error: {e}"


def obtener_orden(orden_id: int) -> Tuple[Optional[dict], Optional[str]]:
    try:
        resp = supabase.table("orden_trabajo").select("*").eq("id", orden_id).single().execute()
        data = _to_data(resp)
        if not data:
            return None, "No se encontró la orden_trabajo especificada."
        return data, None
    except Exception as e:
        return None, f"Supabase error: {e}"


def listar_ordenes_trabajo(q: Optional[str] = None) -> Tuple[Optional[List[dict]], Optional[str]]:
    try:
        builder = supabase.table("orden_trabajo").select("*").order("id", desc=False)
        if q:
            q_str = q.strip()
            conds = [f"descripcion.ilike.%{q_str}%", f"tipo.ilike.%{q_str}%"]
            if q_str.isdigit():
                conds.append(f"id.eq.{int(q_str)}")
            builder = builder.or_(",".join(conds))
        resp = builder.execute()
        return _to_data(resp) or [], None
    except Exception as e:
        return None, f"Supabase error: {e}"


def actualizar_estado_orden(
    orden_id: int,
    estado_id: int,
    user_id: Optional[str] = None,
    comentario: Optional[str] = None,
) -> Tuple[Optional[dict], Optional[str]]:
    # No incluimos updated_at porque la tabla no lo tiene (según tu screenshot)
    payload = {"estado_trabajo_id": estado_id}
    # Si quieres guardar comentario/usuario, agrega columnas en la DB y descomenta:
    # if comentario is not None:
    #     payload["comentario_estado"] = comentario
    # if user_id is not None:
    #     payload["actualizado_por_id"] = user_id

    try:
        upd_resp = supabase_admin.table("orden_trabajo").update(payload).eq("id", orden_id).execute()
        upd_data = _to_data(upd_resp)
        if isinstance(upd_data, list) and len(upd_data) > 0:
            return upd_data[0], None
        if isinstance(upd_data, dict) and upd_data:
            return upd_data, None

        sel_resp = supabase_admin.table("orden_trabajo").select("*").eq("id", orden_id).single().execute()
        sel_data = _to_data(sel_resp)
        if not sel_data:
            return None, "No se encontró la orden_trabajo especificada."
        return sel_data, None
    except Exception as e:
        return None, f"Supabase error: {e}"