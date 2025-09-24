import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
SENDGRID_FROM = os.environ.get("SENDGRID_FROM")  # ej: SmartCondominium <tuemail@gmail.com>

def send_email(to_emails, subject, html):
    """
    to_emails: str o lista[str]
    """
    if not SENDGRID_API_KEY:
        raise RuntimeError("Falta SENDGRID_API_KEY")
    if not SENDGRID_FROM:
        raise RuntimeError("Falta SENDGRID_FROM")

    if isinstance(to_emails, str):
        to_emails = [to_emails]

    sg = SendGridAPIClient(SENDGRID_API_KEY)
    msg = Mail(from_email=SENDGRID_FROM, to_emails=to_emails, subject=subject, html_content=html)
    resp = sg.send(msg)  # 202 esperado
    return resp.status_code
