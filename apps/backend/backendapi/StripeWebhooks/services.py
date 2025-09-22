# backendapi/StripeWebhooks/services.py
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
from django.db import connection, transaction

D = lambda x: Decimal(str(x or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

# -----------------------------
# Logs cortos
# -----------------------------
def _log(msg: str):
    print(f"[WEBHOOK][SRV] {msg}")

# -----------------------------
# Detección de columna de estado en 'pagos'
# -----------------------------
_PAGOS_STATUS_CANDIDATES = ["estado_pago", "estado", "estado_id", "estado_pago_id"]
_PAGOS_STATUS_COL_CACHE: Optional[str] = None

def _get_pagos_status_col() -> Optional[str]:
    """
    Devuelve el nombre de la columna de estado en 'pagos' si existe,
    buscando entre candidatos conocidos. Cachea el resultado.
    """
    global _PAGOS_STATUS_COL_CACHE
    if _PAGOS_STATUS_COL_CACHE is not None:
        return _PAGOS_STATUS_COL_CACHE

    query = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'pagos'
          AND column_name = ANY(%s)
    """
    with connection.cursor() as cur:
        cur.execute(query, ( _PAGOS_STATUS_CANDIDATES, ))
        row = cur.fetchone()
        _PAGOS_STATUS_COL_CACHE = row[0] if row else None

    if _PAGOS_STATUS_COL_CACHE:
        _log(f"Columna de estado detectada en 'pagos': '{_PAGOS_STATUS_COL_CACHE}'")
    else:
        _log("ADVERTENCIA: 'pagos' no tiene columna de estado (ej. estado_pago/estado). Insertaremos sin estado.")

    return _PAGOS_STATUS_COL_CACHE

# -----------------------------
# Consultas auxiliares
# -----------------------------
def _doc_total(tipo: str, doc_id: int) -> Optional[Decimal]:
    if tipo == "expensa":
        sql = "SELECT total FROM expensas WHERE id=%s"
    elif tipo == "reserva":
        sql = "SELECT total FROM reserva WHERE id=%s"
    elif tipo == "multa":
        sql = "SELECT total FROM multas WHERE id=%s"
    else:
        return None
    with connection.cursor() as cur:
        cur.execute(sql, [doc_id])
        row = cur.fetchone()
        return D(row[0]) if row else None

def _find_existing_pago_id(tipo: str, doc_id: int) -> Optional[int]:
    if tipo == "expensa":
        sql = """
        SELECT c.pago_id
        FROM cargos c
        JOIN cargo_expensa ce ON ce.cargo_id = c.id
        WHERE ce.expensa_id = %s
        ORDER BY c.id ASC LIMIT 1
        """
    elif tipo == "reserva":
        sql = """
        SELECT c.pago_id
        FROM cargos c
        JOIN cargo_reserva cr ON cr.cargo_id = c.id
        WHERE cr.reserva_id = %s
        ORDER BY c.id ASC LIMIT 1
        """
    else:
        sql = """
        SELECT c.pago_id
        FROM cargos c
        JOIN cargo_multa cm ON cm.cargo_id = c.id
        WHERE cm.multa_id = %s
        ORDER BY c.id ASC LIMIT 1
        """
    with connection.cursor() as cur:
        cur.execute(sql, [doc_id])
        row = cur.fetchone()
        return int(row[0]) if row else None

def _sum_cargos(tipo: str, doc_id: int) -> Decimal:
    if tipo == "expensa":
        sql = """
        SELECT COALESCE(SUM(c.monto),0)
        FROM cargos c JOIN cargo_expensa ce ON ce.cargo_id=c.id
        WHERE ce.expensa_id=%s
        """
    elif tipo == "reserva":
        sql = """
        SELECT COALESCE(SUM(c.monto),0)
        FROM cargos c JOIN cargo_reserva cr ON cr.cargo_id=c.id
        WHERE cr.reserva_id=%s
        """
    else:
        sql = """
        SELECT COALESCE(SUM(c.monto),0)
        FROM cargos c JOIN cargo_multa cm ON cm.cargo_id=c.id
        WHERE cm.multa_id=%s
        """
    with connection.cursor() as cur:
        cur.execute(sql, [doc_id])
        return D(cur.fetchone()[0] or 0)

def _insert_pago(total_doc: Decimal, tipo_pago_id: int) -> int:
    status_col = _get_pagos_status_col()
    with connection.cursor() as cur:
        if status_col:
            _log(f"INSERT pagos total={total_doc} tipo_pago_id={tipo_pago_id} {status_col}=1")
            cur.execute(
                f"""
                INSERT INTO pagos (fecha, monto_total, tipo_pago_id, {status_col})
                VALUES (NOW(), %s, %s, 1)
                RETURNING id
                """,
                [str(total_doc), tipo_pago_id],
            )
        else:
            _log(f"INSERT pagos total={total_doc} tipo_pago_id={tipo_pago_id} (sin columna estado)")
            cur.execute(
                """
                INSERT INTO pagos (fecha, monto_total, tipo_pago_id)
                VALUES (NOW(), %s, %s)
                RETURNING id
                """,
                [str(total_doc), tipo_pago_id],
            )
        return cur.fetchone()[0]

def _insert_cargo(pago_id: int, monto: Decimal, user_id: str) -> int:
    with connection.cursor() as cur:
        _log(f"INSERT cargos pago_id={pago_id} monto={monto} user={user_id}")
        cur.execute(
            """
            INSERT INTO cargos (pago_id, monto, ts, id_usuario)
            VALUES (%s, %s, NOW(), %s)
            RETURNING id
            """,
            [pago_id, str(monto), user_id],
        )
        return cur.fetchone()[0]

def _link_cargo_a_documento(tipo: str, cargo_id: int, doc_id: int) -> None:
    if tipo == "expensa":
        sql = "INSERT INTO cargo_expensa (cargo_id, expensa_id) VALUES (%s, %s) ON CONFLICT DO NOTHING"
    elif tipo == "reserva":
        sql = "INSERT INTO cargo_reserva (cargo_id, reserva_id) VALUES (%s, %s) ON CONFLICT DO NOTHING"
    else:
        sql = "INSERT INTO cargo_multa (cargo_id, multa_id) VALUES (%s, %s) ON CONFLICT DO NOTHING"
    with connection.cursor() as cur:
        cur.execute(sql, [cargo_id, doc_id])

def _update_pago_estado_si_corresponde(pago_id: int, tipo: str, doc_id: int, total_doc: Decimal) -> None:
    status_col = _get_pagos_status_col()
    pagado = _sum_cargos(tipo, doc_id)
    if status_col and pagado >= total_doc:
        with connection.cursor() as cur:
            _log(f"UPDATE pagos#{pago_id} -> {status_col}=2 (pagado)")
            cur.execute(f"UPDATE pagos SET {status_col} = 2 WHERE id = %s", [pago_id])
    else:
        _log(f"Pago #{pago_id} aún pendiente. pagado={pagado} / total={total_doc} (columna estado={status_col})")

# -----------------------------
# Handler principal
# -----------------------------
def handle_payment_intent_succeeded(event: Dict[str, Any]) -> Dict[str, Any]:
    obj = event.get("data", {}).get("object", {}) or {}
    pi_id = obj.get("id")
    amount_minor = obj.get("amount")
    currency = obj.get("currency")
    meta = obj.get("metadata") or {}

    _log(f"PI {pi_id} OK amount={amount_minor} {currency} meta={meta}")

    tipo = (meta.get("tabla") or "").strip()
    doc_id = meta.get("doc_id")
    user_id = meta.get("usuario_id")
    tipo_pago_id = meta.get("tipo_pago_id")
    total_doc_meta = meta.get("monto_total_doc")

    if not (tipo and doc_id and user_id and tipo_pago_id):
        raise ValueError("Metadata incompleta: tabla, doc_id, usuario_id, tipo_pago_id son requeridos")

    try:
        doc_id = int(doc_id)
        tipo_pago_id = int(tipo_pago_id)
    except Exception:
        raise ValueError("Metadata numérica inválida (doc_id/tipo_pago_id)")

    if amount_minor is None:
        raise ValueError("amount ausente en el PaymentIntent")
    monto_cobrado = D(Decimal(int(amount_minor)) / Decimal(100))

    total_doc = None
    if total_doc_meta:
        try:
            total_doc = D(total_doc_meta)
        except Exception:
            total_doc = None
    if total_doc is None:
        total_doc = _doc_total(tipo, doc_id)
    if total_doc is None:
        raise ValueError(f"No se encontró el total del documento {tipo}#{doc_id}")

    with transaction.atomic():
        pago_id = _find_existing_pago_id(tipo, doc_id)
        if pago_id is None:
            pago_id = _insert_pago(total_doc, tipo_pago_id)

        cargo_id = _insert_cargo(pago_id, monto_cobrado, user_id)
        _link_cargo_a_documento(tipo, cargo_id, doc_id)
        _update_pago_estado_si_corresponde(pago_id, tipo, doc_id, total_doc)

    return {
        "ok": True,
        "payment_intent": pi_id,
        "pago_id": pago_id,
        "monto": str(monto_cobrado),
        "doc_total": str(total_doc),
        "tipo": tipo,
        "doc_id": doc_id,
    }
