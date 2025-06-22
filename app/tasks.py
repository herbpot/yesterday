from celery import Celery
from datetime import datetime, timezone
import pytz
import os

from pymongo import MongoClient
from .weather import get_compare
from .storage import list_subscribers
from .logger import logger

from firebase_admin import credentials, initialize_app, messaging
import firebase_admin, os, logging
from dotenv import load_dotenv
load_dotenv()

cred_path = os.getenv("FIREBASE_CRED")
if not firebase_admin._apps and cred_path:
    initialize_app(credentials.Certificate(cred_path))
else:
    logging.warning("Firebase not initialised – push disabled in task")
    logging.warning(f"cred_path: {cred_path}, admin apps: {firebase_admin._apps}")
    logging.warning(f"conditions: {not firebase_admin._apps and cred_path}")
    logging.warning(os.listdir())


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

DEV = os.getenv("DEV", "false").lower() == "true"

# MongoDB 연결
mongo_client = MongoClient(os.getenv("MONGO_URL"))  # 예: mongodb+srv://user:pass@cluster.mongodb.net/dbname
db = mongo_client.yesterday
if DEV:
    db = mongo_client.yesterday_dev  # 개발 환경에서는 별도의 컬렉션 사용
notifications = db.notifications_sent

# TTL 인덱스 초기화 (최초 1회만 실행되면 됨)
# createdAt으로부터 86400초(24시간) 후 문서 자동 삭제
notifications.create_index("createdAt", expireAfterSeconds=86400)

# Celery 설정
if DEV:
    app = Celery('tasks', broker=os.getenv("MONGO_URL") + "/broker_dev")
    logger.info("Using development broker for Celery")
else:
    app = Celery('tasks', broker=os.getenv("MONGO_URL") + "/broker")
app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
)

@app.on_after_configure.connect()
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(300.0, send_push_notification.s(), name='send push every 5 minutes')

@app.task(name="test_task")
def test_task():
    logger.info("Test task executed successfully!")
    return {"status": "success", "message": "Test task completed."}

@app.task(name='send_push_notification')
def send_push_notification():
    try:
            
        now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
        today_str = now_utc.strftime("%Y-%m-%d")
        messages = []

        for sub in list_subscribers():

            # TTL 기반 중복 체크
            if notifications.find_one({"uid": sub.uid, "date": today_str}):
                continue

            try:
                diff = get_compare(sub.lat, sub.lon)
            except Exception as e:
                logger.error(f"[{sub.uid}] get_compare error: {e}")
                continue

            w = "덥네요" if diff['delta'] > 0 else "춥네요"
            body = f"오늘은({diff['now']:.1f}°C), 어제보다 살짝 더 {w}.({diff['delta']:+.1f}°C)"
            messages.append({
                "token": sub.fcm_token,
                "title": "어제보다",
                "body": body
            })

            # TTL 자동 삭제를 위한 createdAt 포함 저장
            notifications.insert_one({
                "uid": sub.uid,
                "date": today_str,
                "createdAt": datetime.utcnow()
            })

        sent = send_push(messages) if messages else 0
        logger.info(f"[SEND] 알림 전송 완료 ({sent}건)")
        return {"sent": sent}
    except Exception as e:
        logger.error(f"[SEND] 알림 전송 실패: {e}")
        return {"sent": 0, "error": str(e)}
