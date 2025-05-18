from firebase_admin import credentials, initialize_app, messaging
import firebase_admin, os, logging

cred_path = os.getenv("FIREBASE_CRED")
if not firebase_admin._apps and cred_path:
    initialize_app(credentials.Certificate(cred_path))
else:
    logging.warning("Firebase not initialised – push disabled")

def send_push(tokens: list[str], title: str, body: str) -> int:
    if not firebase_admin._apps:
        return 0
    msg = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(title=title, body=body)
    )
    rsp = messaging.send_multicast(msg)
    return rsp.success_count 