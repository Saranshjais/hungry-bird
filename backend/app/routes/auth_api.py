from datetime import datetime

from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from app import db, limiter
from app import codes
from app.emailer import EmailNotConfigured, EmailSendError, mask_email
from app.models import (
    User, Vendor, Favorite, SavedVendor, VendorSubmission, Rating, ContactMessage, Report,
    Payment, SubscriptionEvent, AuthCode,
)
from app.helpers import (
    EMAIL_RE, PHONE_RE, api_error, client_ip, clean_text, is_public_vendor, issue_user_token,
    password_error, public_vendor_query, token_required, user_or_ip_key,
)
from app.serializers import serialize_vendor

auth_api = Blueprint("auth_api", __name__)

# check_password_hash() against this when the account doesn't exist, so timing doesn't reveal it.
_DUMMY_HASH = generate_password_hash("hungrybird-timing-equaliser")


def _login_key():
    data = request.get_json(silent=True) or {}
    identifier = str(data.get("email") or data.get("username") or "").strip().lower()[:150]
    return f"{client_ip()}|{identifier}"


def _code_error(err):
    return api_error(err.message, err.code, err.status, **err.extra)


def _send_verification(user):
    """Email a verification code; failures never block the calling request."""
    try:
        codes.send_code(user.email, codes.PURPOSE_VERIFY_EMAIL, user=user, ip=client_ip())
        return True
    except (codes.CodeError, EmailNotConfigured, EmailSendError):
        return False
    except Exception:
        current_app.logger.exception("Verification email for %s failed", mask_email(user.email))
        return False


@auth_api.route('/api/auth/register', methods=['POST'])
@limiter.limit("3 per hour")
def register():
    data = request.get_json(silent=True) or {}
    name = clean_text(data.get('name'), 0)
    email = clean_text(data.get('email'), 0).lower()
    password = data.get('password') if isinstance(data.get('password'), str) else ''

    if not name or not email or not password:
        return api_error("Missing required fields", "VALIDATION", 400)
    if len(name) > 100:
        return api_error("Name is too long", "VALIDATION", 400)
    if len(email) > 150 or not EMAIL_RE.match(email):
        return api_error("Please enter a valid email address", "VALIDATION", 400)
    weak = password_error(password)
    if weak:
        return api_error(weak, "WEAK_PASSWORD", 400)

    taken_message = "An account with this email already exists. Log in or reset your password."
    if User.query.filter_by(email=email).first():
        return api_error(taken_message, "EMAIL_IN_USE", 400)

    new_user = User(name=name, email=email, email_verified=False, token_version=0)
    new_user.set_password(password)
    db.session.add(new_user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return api_error(taken_message, "EMAIL_IN_USE", 400)

    verification_sent = _send_verification(new_user)

    return jsonify({
        "message": "Registered successfully",
        "token": issue_user_token(new_user),
        "user": new_user.to_public_dict(),
        "verification_sent": verification_sent,
    }), 201


@auth_api.route('/api/auth/login', methods=['POST'])
@limiter.limit("5 per minute", key_func=_login_key)
@limiter.limit("60 per hour")
def login():
    data = request.get_json(silent=True) or {}
    email = clean_text(data.get('email'), 150).lower()
    password = data.get('password') if isinstance(data.get('password'), str) else ''

    if not email or not password:
        return api_error("Missing email or password", "VALIDATION", 400)

    user = User.query.filter_by(email=email).first()

    if not user:
        check_password_hash(_DUMMY_HASH, password)
        return api_error("Invalid email or password", "INVALID_CREDENTIALS", 401)
    if not user.check_password(password):
        return api_error("Invalid email or password", "INVALID_CREDENTIALS", 401)

    if user.is_suspended:
        return api_error("Your account has been suspended. Please contact support.", "ACCOUNT_SUSPENDED", 403)

    if user.needs_rehash:
        user.set_password(password)  # upgrade the legacy 1000-iteration hash
    user.last_login_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "message": "Login successful",
        "token": issue_user_token(user),
        "user": user.to_public_dict(),
    }), 200


@auth_api.route('/api/auth/me', methods=['GET'])
@token_required
def get_me(current_user):
    return jsonify({"user": current_user.to_public_dict()}), 200


def delete_user_account(user):
    """Remove an app user; keep payments and the premium audit log (anonymised) for accounting."""
    ContactMessage.query.filter_by(user_id=user.id).update({"user_id": None})
    Report.query.filter_by(reporter_user_id=user.id).update({"reporter_user_id": None})
    Payment.query.filter_by(user_id=user.id).update({"user_id": None})
    SubscriptionEvent.query.filter_by(user_id=user.id).update({"user_id": None})
    AuthCode.query.filter(db.or_(AuthCode.user_id == user.id, AuthCode.email == user.email)).delete(
        synchronize_session=False
    )
    # Favorites and saved vendors cascade; ratings and submissions keep their content without the user.
    db.session.delete(user)
    db.session.commit()


@auth_api.route('/api/auth/account', methods=['DELETE'])
@limiter.limit("5 per minute", key_func=user_or_ip_key)
@token_required
def delete_account(current_user):
    # Deleting is permanent, so a token alone (e.g. a stolen one) isn't enough: re-check the password.
    data = request.get_json(silent=True) or {}
    current_password = data.get('current_password') or ''
    if not isinstance(current_password, str) or not current_user.check_password(current_password):
        return api_error("Current password is incorrect", "INVALID_PASSWORD", 400)
    delete_user_account(current_user)
    return jsonify({"message": "Account deleted successfully"}), 200


@auth_api.route('/api/auth/password', methods=['PUT'])
@limiter.limit("5 per minute", key_func=user_or_ip_key)
@token_required
def change_password(current_user):
    data = request.get_json(silent=True) or {}
    current_password = data.get('current_password') or ''
    new_password = data.get('new_password') or ''
    if not isinstance(current_password, str) or not current_user.check_password(current_password):
        return api_error("Current password is incorrect", "INVALID_PASSWORD", 400)
    weak = password_error(new_password if isinstance(new_password, str) else '')
    if weak:
        return api_error(weak, "WEAK_PASSWORD", 400)
    current_user.set_password(new_password)
    # Sign out every other device; this device gets a fresh token.
    current_user.token_version = (current_user.token_version or 0) + 1
    db.session.commit()
    return jsonify({"message": "Password updated", "token": issue_user_token(current_user),
                    "user": current_user.to_public_dict()}), 200


@auth_api.route('/api/auth/profile', methods=['PUT'])
@limiter.limit("20 per hour", key_func=user_or_ip_key)
@token_required
def update_profile(current_user):
    data = request.get_json(silent=True) or {}
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')

    if name is not None:
        name = clean_text(name, 0)
        if not name or len(name) > 100:
            return api_error("Name must be 1-100 characters", "VALIDATION", 400)
        current_user.name = name
    if phone is not None:
        phone = clean_text(phone, 0)
        if phone and not PHONE_RE.match(phone):
            return api_error("Please enter a valid phone number", "VALIDATION", 400)
        current_user.phone = phone or None

    email_changed = False
    if email:
        email = clean_text(email, 0).lower()
        if email != current_user.email:
            if len(email) > 150 or not EMAIL_RE.match(email):
                return api_error("Please enter a valid email address", "VALIDATION", 400)
            current_password = data.get('current_password') or ''
            if not isinstance(current_password, str) or not current_user.check_password(current_password):
                return api_error("Enter your current password to change your email", "INVALID_PASSWORD", 400)
            if User.query.filter(User.email == email, User.id != current_user.id).first():
                return api_error("Email already in use", "EMAIL_IN_USE", 400)
            current_user.email = email
            current_user.email_verified = False
            email_changed = True

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return api_error("Email already in use", "EMAIL_IN_USE", 400)

    payload = {"message": "Profile updated successfully", "user": current_user.to_public_dict()}
    if email_changed:
        payload["verification_sent"] = _send_verification(current_user)
    return jsonify(payload), 200

@auth_api.route('/api/auth/push-token', methods=['PUT'])
@token_required
def update_push_token(current_user):
    data = request.get_json(silent=True) or {}
    token = data.get('token')
    if isinstance(token, str) and token.strip() and len(token) <= 255:
        current_user.push_token = token.strip()
        db.session.commit()
        return jsonify({"message": "Push token updated"}), 200
    return api_error("No token provided", "VALIDATION", 400)

@auth_api.route('/api/auth/notifications-preference', methods=['PUT'])
@token_required
def update_notifications_preference(current_user):
    data = request.get_json(silent=True) or {}
    enabled = data.get('enabled')
    if enabled is not None:
        current_user.notifications_enabled = bool(enabled)
        db.session.commit()
        return jsonify({"message": f"Notifications {'enabled' if enabled else 'disabled'}"}), 200
    return api_error("Invalid payload", "VALIDATION", 400)


# -------------------- EMAIL VERIFICATION --------------------

@auth_api.route('/api/auth/email/send-code', methods=['POST'])
@limiter.limit("10 per hour", key_func=user_or_ip_key)
@token_required
def send_email_code(current_user):
    if current_user.email_verified:
        return api_error("Your email is already verified.", "ALREADY_VERIFIED", 409)
    try:
        resend_after = codes.send_code(current_user.email, codes.PURPOSE_VERIFY_EMAIL, user=current_user, ip=client_ip())
    except codes.CodeError as err:
        return _code_error(err)
    except EmailNotConfigured:
        return api_error("Email is not available right now. Please try again later.", "EMAIL_NOT_CONFIGURED", 503)
    except EmailSendError:
        return api_error("We couldn't send the email. Please try again in a moment.", "EMAIL_SEND_FAILED", 503)
    return jsonify({"sent": True, "resend_after": resend_after}), 200


@auth_api.route('/api/auth/email/verify', methods=['POST'])
@limiter.limit("20 per hour", key_func=user_or_ip_key)
@token_required
def verify_email(current_user):
    if current_user.email_verified:
        return jsonify({"user": current_user.to_public_dict()}), 200
    data = request.get_json(silent=True) or {}
    try:
        codes.consume_code(current_user.email, codes.PURPOSE_VERIFY_EMAIL, data.get('code'))
    except codes.CodeError as err:
        return _code_error(err)
    current_user.email_verified = True
    db.session.commit()
    return jsonify({"user": current_user.to_public_dict()}), 200


# -------------------- FORGOT / RESET PASSWORD --------------------

@auth_api.route('/api/auth/password/forgot', methods=['POST'])
@limiter.limit("10 per hour")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = clean_text(data.get('email'), 0).lower()
    if not email or len(email) > 150 or not EMAIL_RE.match(email):
        return api_error("Please enter a valid email address", "VALIDATION", 400)
    # Checked before looking the account up, so the answer never depends on whether it exists.
    if not codes.can_deliver():
        return api_error("Email is not available right now. Please try again later.", "EMAIL_NOT_CONFIGURED", 503)

    user = User.query.filter_by(email=email).first()
    if user:
        try:
            codes.send_code(email, codes.PURPOSE_RESET_PASSWORD, user=user, ip=client_ip())
        except codes.CodeError:
            pass  # cooldown / hourly cap: stay silent (no account enumeration)
        except (EmailNotConfigured, EmailSendError):
            current_app.logger.error("Password reset email for %s could not be sent", mask_email(email))
    return jsonify({"ok": True}), 200


@auth_api.route('/api/auth/password/reset', methods=['POST'])
@limiter.limit("20 per hour")
def reset_password():
    data = request.get_json(silent=True) or {}
    email = clean_text(data.get('email'), 150).lower()
    new_password = data.get('new_password') if isinstance(data.get('new_password'), str) else ''
    weak = password_error(new_password)
    if weak:
        return api_error(weak, "WEAK_PASSWORD", 400)
    try:
        codes.consume_code(email, codes.PURPOSE_RESET_PASSWORD, data.get('code'))
    except codes.CodeError as err:
        return _code_error(err)

    user = User.query.filter_by(email=email).first()
    if not user:
        db.session.rollback()
        return api_error("That code is not valid. Please request a new one.", "INVALID_CODE", 400)
    user.set_password(new_password)
    user.email_verified = True  # they proved they own the inbox
    user.token_version = (user.token_version or 0) + 1  # sign out every device
    db.session.commit()
    return jsonify({"ok": True}), 200


# -------------------- FAVORITES --------------------

def _vendor_id_from_body():
    data = request.get_json(silent=True) or {}
    try:
        return int(data.get('vendor_id'))
    except (TypeError, ValueError):
        return None


@auth_api.route('/api/favorites', methods=['GET'])
@token_required
def get_favorites(current_user):
    favorites = (
        Favorite.query.filter_by(user_id=current_user.id)
        .order_by(Favorite.created_at.desc())
        .all()
    )
    results = []
    for fav in favorites:
        v = fav.vendor
        if is_public_vendor(v):
            results.append({
                **serialize_vendor(v, current_user),
                "saved_at": fav.created_at.isoformat() if fav.created_at else None,
            })
    return jsonify({"favorites": results}), 200


@auth_api.route('/api/favorites/sync', methods=['POST'])
@token_required
def sync_favorites(current_user):
    """Merge vendor ids saved while logged out into the account."""
    data = request.get_json(silent=True) or {}
    ids = set()
    for raw in (data.get('vendor_ids') or [])[:500]:
        try:
            ids.add(int(raw))
        except (TypeError, ValueError):
            continue
    existing = {f.vendor_id for f in Favorite.query.filter_by(user_id=current_user.id).all()}
    valid = {v.id for v in public_vendor_query().filter(Vendor.id.in_(ids)).all()} if ids else set()
    for vendor_id in valid - existing:
        db.session.add(Favorite(user_id=current_user.id, vendor_id=vendor_id))
    db.session.commit()
    return jsonify({"vendor_ids": sorted(existing | valid)}), 200

@auth_api.route('/api/favorites/toggle', methods=['POST'])
@token_required
def toggle_favorite(current_user):
    vendor_id = _vendor_id_from_body()
    if not vendor_id:
        return api_error("vendor_id is required", "VALIDATION", 400)

    fav = Favorite.query.filter_by(user_id=current_user.id, vendor_id=vendor_id).first()
    if fav:
        db.session.delete(fav)
        db.session.commit()
        return jsonify({"status": "removed"}), 200
    if not is_public_vendor(db.session.get(Vendor, vendor_id)):
        return api_error("Vendor not found", "NOT_FOUND", 404)
    db.session.add(Favorite(user_id=current_user.id, vendor_id=vendor_id))
    db.session.commit()
    return jsonify({"status": "added"}), 201

# -------------------- USER HISTORY --------------------

@auth_api.route('/api/user/submissions', methods=['GET'])
@token_required
def get_user_submissions(current_user):
    submissions = VendorSubmission.query.filter_by(user_id=current_user.id).order_by(VendorSubmission.created_at.desc()).all()
    results = []
    for sub in submissions:
        results.append({
            "id": sub.id,
            "stall_name": sub.stall_name,
            "cuisine_type": sub.cuisine_type,
            "city_name": sub.city.name if sub.city else None,
            "status": sub.status,
            "approx_address": sub.approx_address,
            "review_notes": sub.review_notes,
            "created_at": sub.created_at.isoformat() if sub.created_at else None
        })
    return jsonify({"submissions": results}), 200

@auth_api.route('/api/user/reviews', methods=['GET'])
@token_required
def get_user_reviews(current_user):
    ratings = Rating.query.filter_by(user_id=current_user.id).order_by(Rating.created_at.desc()).all()
    results = []
    for r in ratings:
        v = r.vendor
        if not v:
            continue
        # Vendor details follow the same rules as every vendor payload (hidden/locked => no name).
        card = serialize_vendor(v, current_user) if is_public_vendor(v) else None
        results.append({
            "id": r.id,
            "vendor_id": v.id,
            "vendor_name": card.get("name") if card else None,
            "vendor_image_url": card.get("image_url") if card else None,
            "vendor_locked": bool(card and card.get("locked")),
            "vendor": card,
            "city_name": v.city.name if v.city else None,
            "rating_value": r.rating_value,
            "review_text": r.review_text,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return jsonify({"reviews": results}), 200

# -------------------- SAVED --------------------

@auth_api.route('/api/saved', methods=['GET'])
@token_required
def get_saved(current_user):
    saved = SavedVendor.query.filter_by(user_id=current_user.id).all()
    results = [serialize_vendor(s.vendor, current_user) for s in saved if is_public_vendor(s.vendor)]
    return jsonify({"saved": results}), 200

@auth_api.route('/api/saved/toggle', methods=['POST'])
@token_required
def toggle_saved(current_user):
    vendor_id = _vendor_id_from_body()
    if not vendor_id:
        return api_error("vendor_id is required", "VALIDATION", 400)

    saved_item = SavedVendor.query.filter_by(user_id=current_user.id, vendor_id=vendor_id).first()
    if saved_item:
        db.session.delete(saved_item)
        db.session.commit()
        return jsonify({"status": "removed"}), 200
    if not is_public_vendor(db.session.get(Vendor, vendor_id)):
        return api_error("Vendor not found", "NOT_FOUND", 404)
    db.session.add(SavedVendor(user_id=current_user.id, vendor_id=vendor_id))
    db.session.commit()
    return jsonify({"status": "added"}), 201
