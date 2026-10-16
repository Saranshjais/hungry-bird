import requests
from flask import current_app

from app import db
from app.models import User

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_TOKEN_PREFIX = "ExponentPushToken"


def _push_recipients_query():
    return User.query.filter(
        User.push_token.like(f"{EXPO_TOKEN_PREFIX}%"),
        User.notifications_enabled == True,  # noqa: E712
        db.or_(User.status.is_(None), User.status != "suspended"),
    )


def push_available():
    """Device push only works for Expo tokens; the Flutter app does not register any yet."""
    return _push_recipients_query().first() is not None


def push_recipient_tokens():
    return [u.push_token for u in _push_recipients_query().all()]


def send_push_batch(tokens, message, title=None, data=None):
    """Send one message to many Expo push tokens (chunks of 100). Returns how many were accepted."""
    valid = [t for t in dict.fromkeys(tokens or []) if t and t.startswith(EXPO_TOKEN_PREFIX)]
    sent = 0
    for i in range(0, len(valid), 100):
        chunk = valid[i:i + 100]
        payload = [{"to": t, "sound": "default", "body": message, "title": title, "data": data or {}} for t in chunk]
        try:
            response = requests.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
                timeout=10,
            )
            response.raise_for_status()
            tickets = response.json().get("data", [])
            sent += sum(1 for t in tickets if t.get("status") == "ok")
        except (requests.exceptions.RequestException, ValueError) as e:
            # Never log the tokens themselves.
            current_app.logger.warning("Expo push batch failed (%s)", e.__class__.__name__)
    return sent
