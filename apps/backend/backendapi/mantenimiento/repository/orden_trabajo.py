# backendapi/mantenimiento/repository/orden_trabajo.py
from core.supabase_client import supabase

TABLE = "orden_trabajo"

def insertar(data: dict) -> dict:
    res = supabase.table(TABLE).insert(data).execute()
    if not res.data:
        raise RuntimeError("No se pudo insertar la orden de trabajo")
    return res.data[0]

def actualizar_asignacion(orden_id: int, usuario_id: str) -> dict:
    res = supabase.table(TABLE).update({"ordenado_a_id": usuario_id}).eq("id", orden_id).execute()
    if not res.data:
        raise ValueError("Orden de trabajo no encontrada")
    return res.data[0]

def obtener_por_id(orden_id: int) -> dict | None:
    res = supabase.table(TABLE).select("*").eq("id", orden_id).single().execute()
    return res.data

def listar_por_asignado(usuario_id: str) -> list[dict]:
    res = supabase.table(TABLE).select("*").eq("ordenado_a_id", usuario_id).order("fecha_programada").execute()
    return res.data or []

def listar_pendientes() -> list[dict]:
    # Órdenes con estado_trabajo_id = 1 (pendiente) y sin asignar (ordenado_a_id = null)
    res = supabase.table(TABLE).select("*").eq("estado_trabajo_id", 1).is_("ordenado_a_id", "null").order("fecha_programada").execute()
    return res.data or []