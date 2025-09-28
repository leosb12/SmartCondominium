# backendapi/pases_temporales/repo.py
from typing import Any, Dict, List
from core.supabase_client import supabase_admin
from .errors import UpstreamError, NotFoundError

TABLE_PASSES = "sc_security_temporary_passes"
VIEW_PASSES = "sc_security_v_passes"

def list_passes(filters: Dict[str, Any]) -> List[Dict[str, Any]]:
    try:
        q = supabase_admin.table(VIEW_PASSES).select("*")
        if filters.get("status"):
            q = q.eq("status", filters["status"])
        if filters.get("visitor_id"):
            q = q.eq("visitor_id", filters["visitor_id"])
        if filters.get("from"):
            q = q.gte("created_at", filters["from"])
        if filters.get("to"):
            q = q.lte("created_at", filters["to"])
        res = q.order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise UpstreamError(f"Error listando pases: {e}")

def revoke_pass(pass_id: str, by_user: str) -> Dict[str, Any]:
    try:
        res = (
            supabase_admin
            .table(TABLE_PASSES)
            .update({"status": "revocado", "revoked_by": by_user})
            .eq("id", pass_id)
            .execute()
        )
        rows = res.data or []
        if not rows:
            raise NotFoundError("Pase no encontrado")
        return rows[0]
    except NotFoundError:
        raise
    except Exception as e:
        raise UpstreamError(f"Error al revocar: {e}")
