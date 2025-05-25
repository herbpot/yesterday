from firebase_admin import credentials, initialize_app, messaging
import firebase_admin, os, logging

cred_path = os.getenv("FIREBASE_CRED")
if not firebase_admin._apps and cred_path:
    initialize_app(credentials.Certificate(cred_path))
else:
    logging.warning("Firebase not initialised – push disabled")
    logging.warning(f"cred_path: {cred_path}")


def send_push(messages: list[dict]) -> int:
    multicast = [
        messaging.Message(
            token=m["token"],
            notification=messaging.Notification(
                title=m["title"], body=m["body"]
            ),
        )
        for m in messages
    ]
    CHUNK = 500
    total = 0
    for i in range(0, len(multicast), CHUNK):
        resp = messaging.send_each(multicast[i : i + CHUNK])
        total += resp.success_count
    return total
