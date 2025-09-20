# backendapi/mantenimiento/repository/hora.py
from core.supabase_client import supabase
def existe_hora(hora_id: int) -> bool:
    res = supabase.table("hora").select("id").eq("id", hora_id).execute()
    return bool(res.data)