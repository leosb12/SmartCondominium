# backendapi/Pagos/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from backendapi.roles.auth_helpers import require_auth
from .serializers import (
    OrdenPagoRequestSerializer,
    OrdenPagoResponseSerializer,
)
from .services import crear_payment_intent_para_documento
from core.stripe_client import stripe


class CrearOrdenPagoView(APIView):
    @require_auth
    def post(self, request):
        s = OrdenPagoRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            data = crear_payment_intent_para_documento(
                usuario_id=request.user_id,
                tipo=s.validated_data["tipo"],
                doc_id=s.validated_data["id"],
                monto_parcial=s.validated_data.get("monto_parcial"),
            )
            out = OrdenPagoResponseSerializer(data)
            return Response(out.data, status=status.HTTP_201_CREATED)
        except (ValueError, PermissionError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response(
                {"detail": "Error interno al crear el pago"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ComprobantesView(APIView):
    """
    GET /api/pagos/comprobantes?tipo=expensa|reserva|multa&id=123
    Devuelve los últimos PaymentIntents exitosos (con receipt_url) para ese documento.
    """
    @require_auth
    def get(self, request):
        tipo = (request.query_params.get("tipo") or "").strip()
        doc_id = (request.query_params.get("id") or "").strip()

        if tipo not in ("expensa", "reserva", "multa") or not doc_id:
            return Response(
                {"detail": "Parámetros inválidos (tipo,id)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        q = (
            f"metadata['tabla']:'{tipo}' "
            f"AND metadata['doc_id']:'{doc_id}' "
            f"AND status:'succeeded'"
        )

        try:
            pis = stripe.PaymentIntent.search(
                query=q,
                limit=20,
                expand=["data.latest_charge"],
            )
        except Exception as e:
            return Response({"detail": f"stripe_error: {str(e)}"}, status=502)

        out = []
        for pi in getattr(pis, "data", []) or []:
            charge = pi.get("latest_charge")
            receipt_url = None
            amount_cents = None
            created_ts = None

            if isinstance(charge, dict):
                receipt_url = charge.get("receipt_url")
                amount_cents = charge.get("amount")
                created_ts = charge.get("created")
            elif charge:
                try:
                    ch = stripe.Charge.retrieve(charge)
                    receipt_url = ch.get("receipt_url")
                    amount_cents = ch.get("amount")
                    created_ts = ch.get("created")
                except Exception:
                    pass

            if amount_cents is None:
                amount_cents = pi.get("amount")

            out.append(
                {
                    "payment_intent_id": pi.get("id"),
                    "amount": (amount_cents or 0) / 100.0,
                    "currency": pi.get("currency"),
                    "created": created_ts or pi.get("created"),
                    "receipt_url": receipt_url,
                }
            )

        out.sort(key=lambda x: x.get("created") or 0, reverse=True)
        return Response({"results": out}, status=200)
