from supabase import create_client
from apps.plate_identity.config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def is_plate_authorized(plate):
    # Busca la placa exacta en la tabla auto
    response = supabase.table("auto").select("*").eq("placa", plate).execute()
    # Si encuentra al menos un resultado, está autorizada
    return len(response.data) > 0