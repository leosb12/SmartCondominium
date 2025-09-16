# core/supabase_client.py
import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")

# Cliente normal (anon key)
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Cliente admin (service role key, nunca exponer al frontend)
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
