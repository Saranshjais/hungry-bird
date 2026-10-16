"""Premium passes: plans, status and Razorpay (UPI) purchase."""
import json
import time

from flask import Blueprint, current_app, jsonify, request

from app import db, limiter
from app import payments
from app.helpers import PAYMENT_METHODS, api_error, get_settings, token_required, user_or_ip_key
from app.models import Payment, SubscriptionEvent, SubscriptionPlan, utc_iso

premium_api = Blueprint("premium_api", __name__)


def _active_plans():
    return (
        SubscriptionPlan.query.filter_by(is_active=True)
        .order_by(SubscriptionPlan.sort_order.asc(), SubscriptionPlan.price_paise.asc())
        .all()
    )


@premium_api.route("/api/premium/plans", methods=["GET"])
def list_plans():
    return jsonify([p.to_public_dict() for p in _active_plans()])


@premium_api.route("/api/premium/status", methods=["GET"])
@token_required
def premium_status(current_user):
    events = (
        SubscriptionEvent.query.filter_by(user_id=current_user.id)
        .order_by(SubscriptionEvent.created_at.desc(), SubscriptionEvent.id.desc())
        .limit(50)
        .all()
    )
    return jsonify({
        "is_premium": current_user.is_premium,
        "premium_until": utc_iso(current_user.premium_until),
        "history": [e.to_dict() for e in events],
    })


# -------------------- RAZORPAY --------------------

@premium_api.route("/api/payments/order", methods=["POST"])
@limiter.limit("20 per hour", key_func=user_or_ip_key)
@token_required
def create_payment_order(current_user):
    settings = get_settings()
    if not settings.get("premium_enabled"):
        return api_error("Premium is not available yet.", "PREMIUM_DISABLED", 409)
    if not payments.payments_available():
        return api_error("Payments are not available right now.", "PAYMENTS_NOT_CONFIGURED", 503)
    if not current_user.email_verified:
        return api_error("Please verify your email before buying Premium.", "EMAIL_NOT_VERIFIED", 403)

    data = request.get_json(silent=True) or {}
    try:
        plan_id = int(data.get("plan_id"))
    except (TypeError, ValueError):
        plan_id = None
    plan = db.session.get(SubscriptionPlan, plan_id) if plan_id else None
    if not plan or not plan.is_active:
        return api_error("Plan not found", "NOT_FOUND", 404)

    # The amount always comes from the stored plan, never from the client.
    receipt = f"hb_{current_user.id}_{int(time.time())}"
    try:
        order = payments.create_order(plan.price_paise, receipt, {"user_id": str(current_user.id), "plan_id": str(plan.id)})
    except payments.PaymentProviderError:
        return api_error("We couldn't start the payment. Please try again.", "PAYMENT_PROVIDER_ERROR", 502)

    db.session.add(Payment(
        user_id=current_user.id, plan_id=plan.id, email=current_user.email, plan_name=plan.name,
        days=plan.duration_days, amount_paise=plan.price_paise, currency="INR", status="created",
        provider="razorpay", provider_order_id=order["id"],
    ))
    db.session.commit()

    enabled = set(settings.get("payment_methods") or ["upi"])
    return jsonify({
        "order_id": order["id"],
        "amount_paise": plan.price_paise,
        "currency": "INR",
        "key_id": current_app.config["RAZORPAY_KEY_ID"],
        "name": "HungryBird",
        "description": f"{plan.name} — {plan.duration_days} days of Premium",
        "prefill": {"name": current_user.name or "", "email": current_user.email or "", "contact": current_user.phone or ""},
        "method": {m: m in enabled for m in PAYMENT_METHODS},
        "plan": plan.to_public_dict(),
    })


@premium_api.route("/api/payments/verify", methods=["POST"])
@limiter.limit("30 per hour", key_func=user_or_ip_key)
@token_required
def verify_payment(current_user):
    data = request.get_json(silent=True) or {}
    order_id = str(data.get("razorpay_order_id") or "")[:64]
    payment_id = str(data.get("razorpay_payment_id") or "")[:64]
    signature = str(data.get("razorpay_signature") or "")[:256]

    payment = Payment.query.filter_by(provider_order_id=order_id, user_id=current_user.id).first() if order_id else None
    if not payment or not payments.checkout_signature_valid(order_id, payment_id, signature):
        return api_error("We couldn't confirm this payment.", "PAYMENT_VERIFICATION_FAILED", 400)

    if payment.status != "paid":
        entity = payments.fetch_payment(payment_id) or {}
        if entity.get("status") == "failed":
            return api_error("This payment failed. You have not been charged.", "PAYMENT_VERIFICATION_FAILED", 400)
        payments.mark_paid(payment, provider_payment_id=payment_id, method=entity.get("method"))

    db.session.refresh(current_user)
    return jsonify({"ok": True, "user": current_user.to_public_dict()})


@premium_api.route("/api/payments/webhook", methods=["POST"])
def razorpay_webhook():
    """Razorpay webhook: activates the pass even if the app was closed before /verify."""
    if not current_app.config.get("RAZORPAY_WEBHOOK_SECRET"):
        return api_error("Payments are not available right now.", "PAYMENTS_NOT_CONFIGURED", 503)
    raw = request.get_data(cache=True)
    if not payments.webhook_signature_valid(raw, request.headers.get("X-Razorpay-Signature")):
        return api_error("Invalid signature", "PAYMENT_VERIFICATION_FAILED", 400)

    try:
        event = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        return api_error("Invalid payload", "VALIDATION", 400)

    kind = event.get("event")
    payload = event.get("payload") or {}
    pay = ((payload.get("payment") or {}).get("entity")) or {}
    order = ((payload.get("order") or {}).get("entity")) or {}
    order_id = pay.get("order_id") or order.get("id")
    if kind not in ("payment.captured", "order.paid", "payment.failed") or not order_id:
        return jsonify({"ok": True, "ignored": True})

    payment = Payment.query.filter_by(provider_order_id=str(order_id)).first()
    if not payment:
        return jsonify({"ok": True, "ignored": True})  # not one of ours; don't make Razorpay retry
    if payment.status == "paid":
        return jsonify({"ok": True, "duplicate": True})

    if kind == "payment.failed":
        payment.status = "failed"
        db.session.commit()
        return jsonify({"ok": True})

    amount = pay.get("amount") if pay else order.get("amount_paid")
    try:
        amount = int(amount)
    except (TypeError, ValueError):
        amount = None
    if amount != payment.amount_paise:
        current_app.logger.error("Razorpay amount mismatch on payment %s", payment.id)
        payment.status = "amount_mismatch"
        db.session.commit()
        return jsonify({"ok": True})

    activated = payments.mark_paid(payment, provider_payment_id=pay.get("id"), method=pay.get("method"))
    return jsonify({"ok": True, "duplicate": not activated})
