"""Outgoing email over SMTP (standard library only).

Configured with SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM and
SMTP_SECURITY (starttls | ssl | none).
"""
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, parseaddr

from flask import current_app

SMTP_TIMEOUT_SECONDS = 10


class EmailNotConfigured(Exception):
    pass


class EmailSendError(Exception):
    pass


def email_available(config=None):
    cfg = config or current_app.config
    return bool(cfg.get("SMTP_HOST") and cfg.get("SMTP_FROM"))


def mask_email(email):
    name, _, domain = (email or "").partition("@")
    return f"{name[:2]}***@{domain}" if domain else "***"


def send_email(to, subject, text, html=None):
    """Send one message. Raises EmailNotConfigured or EmailSendError."""
    cfg = current_app.config
    if not email_available(cfg):
        raise EmailNotConfigured()

    sender_name, sender_addr = parseaddr(cfg["SMTP_FROM"])
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((sender_name or "HungryBird", sender_addr or cfg["SMTP_FROM"]))
    msg["To"] = to
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    security = (cfg.get("SMTP_SECURITY") or "starttls").lower()
    port = cfg.get("SMTP_PORT") or {"ssl": 465, "none": 25}.get(security, 587)
    try:
        if security == "ssl":
            server = smtplib.SMTP_SSL(cfg["SMTP_HOST"], port, timeout=SMTP_TIMEOUT_SECONDS,
                                      context=ssl.create_default_context())
        else:
            server = smtplib.SMTP(cfg["SMTP_HOST"], port, timeout=SMTP_TIMEOUT_SECONDS)
        with server:
            if security == "starttls":
                server.starttls(context=ssl.create_default_context())
            if cfg.get("SMTP_USERNAME"):
                server.login(cfg["SMTP_USERNAME"], cfg.get("SMTP_PASSWORD") or "")
            server.send_message(msg)
    except (smtplib.SMTPException, OSError) as exc:
        current_app.logger.error("Email to %s failed (%s)", mask_email(to), exc.__class__.__name__)
        raise EmailSendError() from exc


def send_code_email(to, code):
    text = (
        f"Your HungryBird code is {code}. It expires in 10 minutes. "
        "If you didn't ask for this, ignore this email."
    )
    html = (
        "<div style=\"font-family:Arial,sans-serif;font-size:15px;color:#222\">"
        f"<p>Your HungryBird code is</p><p style=\"font-size:28px;font-weight:bold;letter-spacing:4px\">{code}</p>"
        "<p>It expires in 10 minutes. If you didn't ask for this, ignore this email.</p></div>"
    )
    send_email(to, f"Your HungryBird code: {code}", text, html)
