from datetime import datetime, timezone
import os

import asyncio
from .meteo_weather import get_weather
from .storage import list_subscribers, mongo_client
from .logger import logger

from firebase_admin import initialize_app, messaging
import firebase_admin, os
from dotenv import load_dotenv
from celery import Celery

load_dotenv(dotenv_path='/app/.env')

if not firebase_admin._apps:
    initialize_app()

mongo_url = os.getenv("MONGO_URL")
celery = Celery("app.tasks", broker=mongo_url, backend=mongo_url)

logger.info(f"Celery app initialized with broker and backend set to MongoDB. {mongo_url}")

celery.conf.beat_schedule = {
    'send-push-every-minute': {
        'task': 'app.tasks.send_push_notification',
        'schedule': 60.0,
    },
}
celery.conf.timezone = 'UTC'

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

db = mongo_client.yesterday
if DEV:
    db = mongo_client.yesterday_dev
notifications = db.notifications_sent

notifications.create_index("createdAt", expireAfterSeconds=76400)

@celery.task
def test_task():
    logger.info("Test task executed successfully!")
    return {"status": "success", "message": "Test task completed."}

@celery.task
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
                weather_data = asyncio.run(get_weather(sub.lat, sub.lon))
                today_temp = weather_data.get("todayTemp")
                yesterday_temp = weather_data.get("yesterdayTemp")

                if today_temp is None or yesterday_temp is None:
                    raise ValueError("오늘 또는 어제 기온 데이터를 가져올 수 없습니다.")

                diff_delta = today_temp - yesterday_temp
                diff_now = today_temp
                diff = {"delta": diff_delta, "now": diff_now}
            except Exception as e:
                logger.error(f"[{sub.uid}] get_weather error: {e}")
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
