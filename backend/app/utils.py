import requests
from flask import current_app

def send_push_notification(token, message, title=None, data=None):
    """
    Sends a push notification to an Expo app using the Expo Push API.
    
    :param token: The Expo push token (e.g., 'ExponentPushToken[...]')
    :param message: The body of the push notification
    :param title: The title of the push notification
    :param data: A dictionary of extra data to send with the notification
    """
    if not token or not token.startswith('ExponentPushToken'):
        print(f"Invalid Expo push token: {token}")
        return False
        
    payload = {
        'to': token,
        'sound': 'default',
        'body': message,
    }
    
    if title:
        payload['title'] = title
        
    if data:
        payload['data'] = data
        
    try:
        response = requests.post(
            'https://exp.host/--/api/v2/push/send',
            json=payload,
            headers={
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            }
        )
        response.raise_for_status()
        print(f"Successfully sent push notification to {token}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error sending push notification: {e}")
        if hasattr(e, 'response') and e.response:
            print(e.response.text)
        return False


def send_push_batch(tokens, message, title=None, data=None):
    """Send one message to many Expo push tokens (chunks of 100). Returns how many were accepted."""
    valid = [t for t in dict.fromkeys(tokens or []) if t and t.startswith("ExponentPushToken")]
    sent = 0
    for i in range(0, len(valid), 100):
        chunk = valid[i:i + 100]
        payload = [{"to": t, "sound": "default", "body": message, "title": title, "data": data or {}} for t in chunk]
        try:
            response = requests.post(
                "https://exp.host/--/api/v2/push/send",
                json=payload,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
                timeout=10,
            )
            response.raise_for_status()
            tickets = response.json().get("data", [])
            sent += sum(1 for t in tickets if t.get("status") == "ok")
        except requests.exceptions.RequestException as e:
            print(f"Error sending push batch: {e}")
    return sent
