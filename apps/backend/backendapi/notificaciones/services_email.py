import os
import resend

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
RESEND_FROM = os.environ.get("RESEND_FROM", "onboarding@resend.dev")

def send_email(to_emails, subject, html):
    """
    Envía email usando Resend en lugar de SendGrid.
    to_emails: str o lista[str]
    """
    if not RESEND_API_KEY:
        raise RuntimeError("Falta RESEND_API_KEY")
    if not RESEND_FROM:
        raise RuntimeError("Falta RESEND_FROM")

    if isinstance(to_emails, str):
        to_emails = [to_emails]

    resend.api_key = RESEND_API_KEY
    
    try:
        response = resend.Emails.send({
            "from": RESEND_FROM,
            "to": to_emails,
            "subject": subject,
            "html": html,
        })
        # Resend devuelve status 200 si es exitoso
        return 200
    except Exception as e:
        print(f"Error enviando email con Resend: {e}")
        raise
