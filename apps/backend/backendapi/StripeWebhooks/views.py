# backendapi/StripeWebhooks/views.py
import os, json
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import stripe
from .services import handle_payment_intent_succeeded

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@csrf_exempt
def stripe_webhook_view(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    print("[WEBHOOK] hit /webhooks/stripe")

    try:
        if STRIPE_WEBHOOK_SECRET:
            evt_obj = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=sig_header,
                secret=STRIPE_WEBHOOK_SECRET,
            )
            event = evt_obj.to_dict()  # <- importante
        else:
            event = json.loads(payload.decode("utf-8") or "{}")
    except Exception as e:
        print("[WEBHOOK] signature/parse error:", e)
        return HttpResponse(status=400)

    etype = event.get("type")
    print(f"[WEBHOOK] type={etype}")

    if etype == "payment_intent.succeeded":
        try:
            res = handle_payment_intent_succeeded(event)
            print("[WEBHOOK] handled OK:", res)
            return HttpResponse(status=200)
        except Exception as e:
            import traceback; traceback.print_exc()
            return JsonResponse({"ok": False, "error": str(e)}, status=500)

    return HttpResponse(status=200)
