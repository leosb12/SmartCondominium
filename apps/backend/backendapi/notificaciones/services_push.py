import os
import json
import firebase_admin
from firebase_admin import messaging, credentials

_CHANNEL_ID = "high_importance_channel"  # <-- mismo ID que crearás en Flutter

def _ensure_init():
    if not firebase_admin._apps:
        raw = os.environ.get("FIREBASE_CREDENTIALS_JSON")
        info = json.loads(raw) if raw else {}
        cred = credentials.Certificate(info)
        firebase_admin.initialize_app(cred)

def send_token(token: str, title: str, body: str, data: dict | None = None):
    _ensure_init()
    data = {str(k): str(v) for k, v in (data or {}).items()}
    # Útil para navegación al tocar
    data.setdefault("click_action", "FLUTTER_NOTIFICATION_CLICK")

    msg = messaging.Message(
        token=token,
        notification=messaging.Notification(
            title=title or "Notificación",
            body=body or "",
        ),
        data=data,
        android=messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                sound='default',
                channel_id=_CHANNEL_ID,    # <-- usa tu canal
                priority='max',
                default_sound=True,
            ),
        ),
        apns=messaging.APNSConfig(
            headers={'apns-priority': '10'},
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound='default',
                    content_available=False
                )
            ),
        ),
    )
    return messaging.send(msg)
