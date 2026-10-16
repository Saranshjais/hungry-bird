"""6-digit email codes for email verification and password reset.

Codes are valid for 10 minutes, allow 5 wrong attempts, are single use and stored only as
HMAC-SHA256(SECRET_KEY, "purpose:email:code"). Sends are limited to one per 60 s per
email/purpose and 5 per email per hour.
"""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from flask import current_app

from app import db, emailer
from app.models import AuthCode

PURPOSE_VERIFY_EMAIL = "verify_email"
PURPOSE_RESET_PASSWORD = "reset_password"

CODE_TTL = timedelta(minutes=10)
MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60
MAX_SENDS_PER_HOUR = 5


class CodeError(Exception):
    """Carries a contract error code (INVALID_CODE, CODE_EXPIRED, TOO_MANY_ATTEMPTS, RATE_LIMITED)."""

    def __init__(self, code, message, status, **extra):
        super().__init__(message)
        self.code, self.message, self.status, self.extra = code, message, status, extra


def hash_code(purpose, email, code):
    key = current_app.config["SECRET_KEY"].encode("utf-8")
    return hmac.new(key, f"{purpose}:{email}:{code}".encode("utf-8"), hashlib.sha256).hexdigest()


def can_deliver():
    """Codes can be delivered by SMTP, or (local development only) printed to the console."""
    return emailer.email_available() or not current_app.config.get("IS_PRODUCTION")


def _deliver(email, code):
    if emailer.email_available():
        emailer.send_code_email(email, code)
    elif not current_app.config.get("IS_PRODUCTION"):
        current_app.logger.warning("SMTP is not configured; HungryBird code for %s is %s", email, code)
    else:
        raise emailer.EmailNotConfigured()


def send_code(email, purpose, user=None, ip=None):
    """Create and email a new code. Raises CodeError, EmailNotConfigured or EmailSendError."""
    email = email.lower().strip()
    now = datetime.utcnow()
    if not can_deliver():
        raise emailer.EmailNotConfigured()

    window_start = now - timedelta(hours=1)
    recent = (
        AuthCode.query.filter(AuthCode.email == email, AuthCode.created_at >= window_start)
        .order_by(AuthCode.created_at.desc(), AuthCode.id.desc())
        .all()
    )
    same_purpose = [c for c in recent if c.purpose == purpose]
    if same_purpose:
        waited = (now - same_purpose[0].created_at).total_seconds()
        if waited < RESEND_COOLDOWN_SECONDS:
            wait = int(RESEND_COOLDOWN_SECONDS - waited) + 1
            raise CodeError("RATE_LIMITED", f"Please wait {wait} seconds before asking for another code.",
                            429, resend_after=wait)
    if len(recent) >= MAX_SENDS_PER_HOUR:
        wait = int((recent[-1].created_at + timedelta(hours=1) - now).total_seconds()) + 1
        raise CodeError("RATE_LIMITED", "Too many codes requested. Please try again later.",
                        429, resend_after=max(wait, RESEND_COOLDOWN_SECONDS))

    # Only the newest code is valid.
    AuthCode.query.filter(
        AuthCode.email == email, AuthCode.purpose == purpose, AuthCode.consumed_at.is_(None)
    ).update({"consumed_at": now}, synchronize_session=False)

    code = f"{secrets.randbelow(10 ** 6):06d}"
    row = AuthCode(
        email=email, user_id=user.id if user else None, purpose=purpose,
        code_hash=hash_code(purpose, email, code), attempts=0,
        expires_at=now + CODE_TTL, created_at=now, ip=(ip or "")[:100] or None,
    )
    db.session.add(row)
    db.session.commit()
    try:
        _deliver(email, code)
    except Exception:
        db.session.delete(row)
        db.session.commit()
        raise
    return RESEND_COOLDOWN_SECONDS


def consume_code(email, purpose, code):
    """Check a code and mark it used. Raises CodeError. The caller commits its own changes."""
    email = (email or "").lower().strip()
    code = "".join(ch for ch in str(code or "") if ch.isdigit())
    now = datetime.utcnow()
    row = (
        AuthCode.query.filter(AuthCode.email == email, AuthCode.purpose == purpose, AuthCode.consumed_at.is_(None))
        .order_by(AuthCode.created_at.desc(), AuthCode.id.desc())
        .first()
    )
    if not row:
        raise CodeError("INVALID_CODE", "That code is not valid. Please request a new one.", 400)
    if (row.attempts or 0) >= MAX_ATTEMPTS:
        raise CodeError("TOO_MANY_ATTEMPTS", "Too many wrong attempts. Please request a new code.", 429)
    if row.expires_at <= now:
        raise CodeError("CODE_EXPIRED", "That code has expired. Please request a new one.", 400)
    if len(code) != 6 or not hmac.compare_digest(row.code_hash, hash_code(purpose, email, code)):
        row.attempts = (row.attempts or 0) + 1
        db.session.commit()
        if row.attempts >= MAX_ATTEMPTS:
            raise CodeError("TOO_MANY_ATTEMPTS", "Too many wrong attempts. Please request a new code.", 429)
        raise CodeError("INVALID_CODE", "That code is not right. Please check it and try again.", 400,
                        attempts_left=MAX_ATTEMPTS - row.attempts)

    # Single use, even if two requests race with the same code.
    claimed = AuthCode.query.filter(AuthCode.id == row.id, AuthCode.consumed_at.is_(None)).update(
        {"consumed_at": now}, synchronize_session=False
    )
    if claimed != 1:
        raise CodeError("INVALID_CODE", "That code has already been used.", 400)
    return row
