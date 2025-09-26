from typing import Optional, Dict, Any
from .repository import obtener_por_id

def fetch_visitor_data(visitor_id: str) -> Optional[Dict[str, Any]]:
    return obtener_por_id(visitor_id)