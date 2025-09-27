# backendapi/analytics/utils_db.py
"""
Utilidades de acceso a BD para el módulo Analytics (CU-35).

- Aplica SIEMPRE:
  * Zona horaria: America/La_Paz
  * statement_timeout: 3000 ms (configurable)

- Provee helpers seguros y simples:
  * db_cursor()         -> context manager con TZ/timeout locales
  * exec_dict(sql, p)   -> lista[dict]
  * fetch_one(sql, p)   -> dict | None
  * fetch_scalar(sql,p) -> any | None
  * exec_values(sql, p) -> lista[tuplas] (por si hace falta rendimiento)
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from django.db import connection

from .constants import TIMEZONE, STATEMENT_TIMEOUT_MS


# -----------------------------
# Helpers internos
# -----------------------------
def _dictfetchall(cur) -> List[Dict[str, Any]]:
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


@contextmanager
def db_cursor(tz: str = TIMEZONE, timeout_ms: int = STATEMENT_TIMEOUT_MS):
    """
    Context manager de cursor que fija TZ y statement_timeout SOLO durante la transacción actual.
    Uso:
        with db_cursor() as cur:
            cur.execute("SELECT 1")
            rows = _dictfetchall(cur)
    """
    with connection.cursor() as cur:
        # Aísla el contexto a esta transacción/request
        cur.execute("SET LOCAL TIME ZONE %s", [tz])
        cur.execute("SET LOCAL statement_timeout = %s", [f"{timeout_ms}ms"])
        yield cur


# -----------------------------
# API pública
# -----------------------------
def exec_dict(sql: str, params: Sequence[Any] | None = None,
              *, tz: Optional[str] = None, timeout_ms: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Ejecuta SQL parametrizado y retorna filas como lista de dicts.
    """
    with db_cursor(tz or TIMEZONE, timeout_ms or STATEMENT_TIMEOUT_MS) as cur:
        cur.execute(sql, params or [])
        if cur.description is None:
            return []
        return _dictfetchall(cur)


def fetch_one(sql: str, params: Sequence[Any] | None = None,
              *, tz: Optional[str] = None, timeout_ms: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Ejecuta SQL y retorna la PRIMERA fila como dict (o None).
    """
    with db_cursor(tz or TIMEZONE, timeout_ms or STATEMENT_TIMEOUT_MS) as cur:
        cur.execute(sql, params or [])
        if cur.description is None:
            return None
        cols = [c[0] for c in cur.description]
        row = cur.fetchone()
        return dict(zip(cols, row)) if row else None


def fetch_scalar(sql: str, params: Sequence[Any] | None = None,
                 *, tz: Optional[str] = None, timeout_ms: Optional[int] = None) -> Any:
    """
    Ejecuta SQL y retorna la PRIMERA columna de la PRIMERA fila (o None).
    """
    with db_cursor(tz or TIMEZONE, timeout_ms or STATEMENT_TIMEOUT_MS) as cur:
        cur.execute(sql, params or [])
        if cur.description is None:
            return None
        row = cur.fetchone()
        return row[0] if row else None


def exec_values(sql: str, params: Sequence[Any] | None = None,
                *, tz: Optional[str] = None, timeout_ms: Optional[int] = None) -> List[Tuple[Any, ...]]:
    """
    Ejecuta SQL y retorna filas como lista de tuplas (más rápido que dicts cuando no necesitas nombres de columnas).
    """
    with db_cursor(tz or TIMEZONE, timeout_ms or STATEMENT_TIMEOUT_MS) as cur:
        cur.execute(sql, params or [])
        if cur.description is None:
            return []
        return list(cur.fetchall())
