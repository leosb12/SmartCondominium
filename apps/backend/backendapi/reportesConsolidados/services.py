from typing import List, Dict, Any, Optional
from django.db import connection

# Consulta:
# - Mapea resultado_id -> 'Permitido'/'Rechazado'
# - Obtiene nombre legible:
#   1) CONCAT_WS(' ', p.first_name, p.last_name) de public.profiles
#   2) u.raw_user_meta_data -> 'name' | 'full_name' | 'first_name' | 'last_name'
#   3) parte local del email
BASE_QUERY = """
    SELECT
        ri.id,
        ri.usuario_id::text AS usuario_id,
        ri.invitado,
        ri.ts,
        CASE ri.resultado_id
            WHEN 1 THEN 'Permitido'
            WHEN 2 THEN 'Rechazado'
            ELSE 'Desconocido'
        END AS resultado,
        COALESCE(
            NULLIF(CONCAT_WS(' ', p.first_name, p.last_name), ''),
            (u.raw_user_meta_data ->> 'name'),
            (u.raw_user_meta_data ->> 'full_name'),
            (u.raw_user_meta_data ->> 'first_name'),
            (u.raw_user_meta_data ->> 'last_name'),
            split_part(u.email, '@', 1)
        ) AS nombre_invitado
    FROM public.registro_ingreso ri
    LEFT JOIN public.profiles p
        ON p.id = ri.usuario_id
    LEFT JOIN auth.users u
        ON u.id = ri.usuario_id
"""

def fetch_registros_ingreso(
    invitado: Optional[bool] = None,
    resultado: Optional[str] = None,  # 'Permitido' | 'Rechazado'
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
) -> List[Dict[str, Any]]:
    where = []
    params: List[Any] = []

    if invitado is not None:
        where.append("ri.invitado = %s")
        params.append(invitado)

    if resultado:
        r = resultado.strip().lower()
        if r in ("permitido", "1"):
            where.append("ri.resultado_id = %s")
            params.append(1)
        elif r in ("rechazado", "2"):
            where.append("ri.resultado_id = %s")
            params.append(2)

    if fecha_desde:
        where.append("ri.ts >= %s")
        params.append(fecha_desde)

    if fecha_hasta:
        where.append("ri.ts <= %s")
        params.append(fecha_hasta)

    query = BASE_QUERY
    if where:
        query += " WHERE " + " AND ".join(where)
    query += " ORDER BY ri.ts DESC"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        cols = [c[0] for c in cursor.description]
        rows = [dict(zip(cols, row)) for row in cursor.fetchall()]

    return rows