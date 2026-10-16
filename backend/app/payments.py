"""Razorpay (Orders API + Standard Checkout) over plain REST, and Premium pass bookkeeping.

Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
Amounts always come from the plan stored here, never from the client.
"""
import hashlib
import hmac
from datetime import datetime, timedelta

import requests
from flask import current_app

from app import db
from app.models import Payment, SubscriptionEvent, User

RAZORPAY_API = "https://api.razorpay.com/v1"
HTTP_TIMEOUT_SECONDS = 10


class PaymentProviderError(Exception):
    pass


def payments_available(config=None):
    cfg = config or current_app.config
    return bool(cfg.get("RAZORPAY_KEY_ID") and cfg.get("RAZORPAY_KEY_SECRET"))


def _auth():
    cfg = current_app.config
    return cfg["RAZORPAY_KEY_ID"], cfg["RAZORPAY_KEY_SECRET"]


def create_order(amount_paise, receipt, notes):
    try:
        resp = requests.post(
            f"{RAZORPAY_API}/orders",
            auth=_auth(),
            json={"amount": int(amount_paise), "currency": "INR", "receipt": receipt[:40], "notes": notes},
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise PaymentProviderError("Razorpay is not reachable") from exc
    if resp.status_code >= 400:
        current_app.logger.error("Razorpay order failed with HTTP %s", resp.status_code)
        raise PaymentProviderError("Razorpay rejected the order")
    data = resp.json()
    if not data.get("id") or int(data.get("amount") or 0) != int(amount_paise):
        raise PaymentProviderError("Unexpected Razorpay order response")
    return data


def fetch_payment(payment_id):
    """Best effort: the payment entity (method, status, amount) or None."""
    try:
        resp = requests.get(f"{RAZORPAY_API}/payments/{payment_id}", auth=_auth(), timeout=HTTP_TIMEOUT_SECONDS)
        if resp.status_code >= 400:
            return None
        return resp.json()
    except (requests.RequestException, ValueError):
        return None


def _hmac_hex(secret, message):
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def checkout_signature_valid(order_id, payment_id, signature):
    secret = current_app.config.get("RAZORPAY_KEY_SECRET") or ""
    if not (secret and order_id and payment_id and signature):
        return False
    expected = _hmac_hex(secret, f"{order_id}|{payment_id}".encode("utf-8"))
    return hmac.compare_digest(expected, str(signature))


def webhook_signature_valid(raw_body, signature):
    secret = current_app.config.get("RAZORPAY_WEBHOOK_SECRET") or ""
    if not (secret and signature):
        return False
    return hmac.compare_digest(_hmac_hex(secret, raw_body or b""), str(signature))


# -------------------- PREMIUM BOOKKEEPING --------------------

def extend_premium(user, days, kind, payment=None, staff=None, note=None):
    """premium_until = max(now, premium_until) + days, logged as a subscription event."""
    now = datetime.utcnow()
    previous = user.premium_until
    start = previous if previous and previous > now else now
    user.premium_until = start + timedelta(days=int(days))
    event = SubscriptionEvent(
        user_id=user.id, kind=kind, days=int(days), previous_until=previous, ends_at=user.premium_until,
        payment_id=payment.id if payment else None,
        staff_id=staff.id if staff else None, staff_name=staff.name if staff else None,
        note=(note or None) and note[:500],
    )
    db.session.add(event)
    return event


def revoke_premium(user, staff=None, note=None):
    now = datetime.utcnow()
    previous = user.premium_until
    user.premium_until = now
    event = SubscriptionEvent(
        user_id=user.id, kind="revoke", days=None, previous_until=previous, ends_at=now,
        staff_id=staff.id if staff else None, staff_name=staff.name if staff else None,
        note=(note or None) and note[:500],
    )
    db.session.add(event)
    return event


def mark_paid(payment, provider_payment_id=None, method=None):
    """Activate a paid order exactly once (verify call and webhook may race). Returns True if this call did it."""
    values = {"status": "paid", "paid_at": datetime.utcnow()}
    if provider_payment_id:
        values["provider_payment_id"] = str(provider_payment_id)[:64]
    if method:
        values["method"] = str(method)[:30]
    claimed = Payment.query.filter(Payment.id == payment.id, Payment.status != "paid").update(
        values, synchronize_session=False
    )
    if claimed != 1:
        db.session.rollback()
        return False
    if payment.user_id:
        user = (
            db.session.query(User).filter(User.id == payment.user_id)
            .with_for_update().populate_existing().first()
        )
        if user:
            extend_premium(user, payment.days, "purchase", payment=payment)
    db.session.commit()
    db.session.refresh(payment)
    return True
