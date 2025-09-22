# backendapi/Pagos/services.py
from typing import Dict, Any, Optional
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from django.db import connection
import os
from core.stripe_client import stripe  # SECRET KEY de test ya inicializada

# Helpers -------------------------------------------------------------

D = lambda x: (Decimal(str(x or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
CURRENCY = os.getenv("STRIPE_TEST_CURRENCY", "usd")

# Mapeo de tipo -> id en tu tabla tipo_pago
TIPO_TO_ID = {"expensa": 1, "reserva": 2, "multa": 3}

def _fetchone(cur):
    return cur.fetchone()

def _usuario_activo_en_propiedad(usuario_id: str, propiedad_id: int) -> bool:
    """
    Verifica que el usuario esté activo (estado_id = 1) en esa propiedad.
    """
    with connection.cursor() as cur:
        cur.execute("""
            SELECT 1
            FROM usuario_habitante
            WHERE usuario_id = %s
              AND propiedad_id = %s
              AND estado_id = 1
            LIMIT 1
        """, [usuario_id, propiedad_id])
        return cur.fetchone() is not None

def _get_documento(tipo: str, doc_id: int) -> Optional[Dict[str, Any]]:
    """
    Trae {id, propiedad_id, total} del documento según tipo.
    """
    if tipo == "expensa":
        sql = "SELECT id, propiedad_id, total FROM expensas WHERE id = %s"
    elif tipo == "reserva":
        sql = "SELECT id, propiedad_id, total FROM reserva WHERE id = %s"
    elif tipo == "multa":
        sql = "SELECT id, propiedad_id, total FROM multas WHERE id = %s"
    else:
        raise ValueError("Tipo inválido. Usa: expensa | reserva | multa")

    with connection.cursor() as cur:
        cur.execute(sql, [doc_id])
        row = _fetchone(cur)
        if not row:
            return None
        cols = [c[0] for c in cur.description]
        return dict(zip(cols, row))

def _sum_cargos_por_documento(tipo: str, doc_id: int) -> Decimal:
    """
    Suma lo pagado (cargos) asociado al documento, usando la tabla puente correcta.
    OJO: nombres reales según tu esquema:
      - expensa  -> cargo_expensa      (sin 's')
      - reserva  -> cargo_reserva
      - multa    -> cargo_multa
    """
    if tipo == "expensa":
        sql = """
          SELECT COALESCE(SUM(c.monto), 0)
          FROM cargos c
          JOIN cargo_expensa ce ON ce.cargo_id = c.id
          WHERE ce.expensa_id = %s
        """
    elif tipo == "reserva":
        sql = """
          SELECT COALESCE(SUM(c.monto), 0)
          FROM cargos c
          JOIN cargo_reserva cr ON cr.cargo_id = c.id
          WHERE cr.reserva_id = %s
        """
    else:  # multa
        sql = """
          SELECT COALESCE(SUM(c.monto), 0)
          FROM cargos c
          JOIN cargo_multa cm ON cm.cargo_id = c.id
          WHERE cm.multa_id = %s
        """

    with connection.cursor() as cur:
        cur.execute(sql, [doc_id])
        return D(cur.fetchone()[0])

# Servicio principal --------------------------------------------------

def crear_payment_intent_para_documento(
    *,
    usuario_id: str,
    tipo: str,
    doc_id: int,
    monto_parcial: Optional[Decimal]
) -> Dict[str, Any]:
    """
    Crea un PaymentIntent de Stripe en TEST, confirmándolo automáticamente con una
    tarjeta de prueba (pm_card_visa). Así evitamos redirects y 3DS y el webhook
    recibe inmediatamente 'payment_intent.succeeded'.

    Reglas:
      - Verifica propiedad/usuario activo.
      - Usa el saldo del documento, o un monto parcial válido (<= saldo).
      - amount se envía en centavos (entero).
      - currency tomado de STRIPE_TEST_CURRENCY (default 'usd').
    """
    # 1) Documento
    doc = _get_documento(tipo, doc_id)
    if not doc:
        raise ValueError(f"{tipo} id={doc_id} no existe")

    # 2) Permisos: usuario activo en esa propiedad
    if not _usuario_activo_en_propiedad(usuario_id, doc["propiedad_id"]):
        raise PermissionError("Usuario no activo en la propiedad del documento")

    # 3) Calcular saldo
    total = D(doc["total"])
    pagado = _sum_cargos_por_documento(tipo, doc_id)
    saldo = total - pagado
    if saldo <= 0:
        raise ValueError("El documento ya está pagado")

    # 4) Determinar monto a cobrar (parcial opcional; tope = saldo)
    monto_a_cobrar = saldo
    if monto_parcial is not None:
        try:
            mp = D(monto_parcial)
        except (InvalidOperation, TypeError, ValueError):
            raise ValueError("monto_parcial inválido")
        if mp <= 0:
            raise ValueError("monto_parcial debe ser > 0")
        if mp < saldo:
            monto_a_cobrar = mp

    # 5) Centavos (minor units). Stripe requiere int.
    amount_minor = int((monto_a_cobrar * 100).to_integral_value(rounding=ROUND_HALF_UP))
    # Stripe suele aceptar mínimo 50 cents para card en USD; prevenimos errores tontos.
    if amount_minor < 50:
        raise ValueError("Monto mínimo inválido (>= 0.50 USD)")

    # 6) Metadata útil para el webhook
    metadata = {
        "tabla": tipo,                            # 'expensa'|'reserva'|'multa'
        "doc_id": str(doc_id),
        "usuario_id": str(usuario_id),
        "tipo_pago_id": str(TIPO_TO_ID[tipo]),    # 1|2|3
        "monto_total_doc": str(total),            # referencia
        "monto_cobrado": str(monto_a_cobrar),
    }

    # 7) Crear y CONFIRMAR automáticamente el PI usando tarjeta de prueba
    #    - payment_method_types=["card"] asegura que no haya otros métodos con redirect.
    #    - payment_method="pm_card_visa" evita requerir datos, SCA, etc. en TEST.
    pi = stripe.PaymentIntent.create(
        amount=amount_minor,
        currency=CURRENCY,
        payment_method_types=["card"],
        payment_method="pm_card_visa",  # TEST
        confirm=True,                   # auto-confirma (sin interacción)
        metadata=metadata,
    )

    # 8) Devolvemos info útil al frontend (para mostrar feedback inmediato)
    return {
        "status": pi["status"],                  # 'succeeded' esperado en TEST
        "payment_intent_id": pi["id"],
        "client_secret": pi.get("client_secret"),
        "amount": amount_minor,
        "currency": CURRENCY,
        "saldo_restante_estimado": str((saldo - D(amount_minor / 100)).max(Decimal("0.00"))),
    }
