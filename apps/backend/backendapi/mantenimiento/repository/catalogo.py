# backendapi/mantenimiento/repository/catalogo.py
from core.supabase_client import supabase
def existe_catalogo(catalogo_id: int) -> bool:
    res = supabase.table("catalogo").select("id").eq("id", catalogo_id).execute()
    return bool(res.data)