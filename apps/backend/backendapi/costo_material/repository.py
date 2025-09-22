from typing import Optional, List, Dict, Any
from core.supabase_client import supabase

# NOMBRE REAL DE LA TABLA EN SUPABASE (según tu error: 'public.costotrabajo')
TABLE = "costotrabajo"

# Selección con relación a orden_trabajo (ajusta si tu relación tiene otro nombre)
SELECCION = (
    "id, material, preciomanoobra, preciomaterial, horas_trabajadas, "
    "id_orden_trabajo, costo_total, created_at, "
    "orden_trabajo(id, tipo, costo, hora_id, descripcion, fecha_programada, estado_trabajo_id)"
)

def listar(*, orden_id: Optional[int] = None) -> List[Dict[str, Any]]:
    q = supabase.table(TABLE).select(SELECCION).order("id", desc=False)
    if orden_id is not None:
        q = q.eq("id_orden_trabajo", int(orden_id))
    resp = q.execute()
    return resp.data or []

def obtener_por_id(pk: int) -> Optional[Dict[str, Any]]:
    resp = (
        supabase.table(TABLE)
        .select(SELECCION)
        .eq("id", int(pk))
        .single()
        .execute()
    )
    return resp.data

def crear(payload: Dict[str, Any]) -> Dict[str, Any]:
    # 1) Insertar
    ins = supabase.table(TABLE).insert(payload).execute()
    if not ins.data:
        raise RuntimeError("No se pudo crear el costo de trabajo")
    new_id = ins.data[0]["id"]

    # 2) Seleccionar con el shape esperado
    sel = (
        supabase.table(TABLE)
        .select(SELECCION)
        .eq("id", int(new_id))
        .single()
        .execute()
    )
    return sel.data or ins.data[0]

def actualizar(pk: int, cambios: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # 1) Actualizar
    upd = (
        supabase.table(TABLE)
        .update(cambios)
        .eq("id", int(pk))
        .execute()
    )
    if not upd.data:
        # Puede que la tabla no devuelva filas en update; igual hacemos select para confirmar
        pass

    # 2) Seleccionar con el shape esperado
    sel = (
        supabase.table(TABLE)
        .select(SELECCION)
        .eq("id", int(pk))
        .single()
        .execute()
    )
    return sel.data

def eliminar(pk: int) -> bool:
    res = supabase.table(TABLE).delete().eq("id", int(pk)).execute()
    return bool(res.data)