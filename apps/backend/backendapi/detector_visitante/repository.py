from typing import Optional, Dict, Any
from core.supabase_client import supabase

TABLE = "visitors"

SELECCION = (
    "id, full_name, doc_type, doc_number, phone, status, created_at"
)

def obtener_por_id(visitor_id: str) -> Optional[Dict[str, Any]]:
    resp = (
        supabase.table(TABLE)
        .select(SELECCION)
        .eq("id", visitor_id)
        .single()
        .execute()
    )
    return resp.data