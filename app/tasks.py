from celery import Celery

from datetime import datetime, timezone
import pytz
from .weather import get_compare
from .push import send_push
from .storage import list_subscribers  # uid, token, lat, lon, tz, hour, minute
from .logger import logger

import os

app = Celery('tasks', broker=os.getenv("REDISCLOUD_URL") + '/0')

app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
)

@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(300.0, send_push_notification.s(), name='send push every 5 minutes')

@app.task
def send_push_notification():
    now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
    messages = []
    for sub in list_subscribers():              # DB / Redis 모두 OK
        local = now_utc.astimezone(pytz.timezone(sub.tz))
        if not (local.hour == sub.hour and local.minute - sub.minute < 5):
            continue                            # “이번 5분 슬롯” 사용자만
        
        diff = get_compare(sub.lat, sub.lon)
        w = "덥네요" if diff['delta'] > 0 else "춥네요"
        body = f"오늘은({diff['now']:.1f}°C), 어제보다 살짝더 {w}.({diff['delta']:+.1f}°C)"
        messages.append({"token": sub.fcm_token, "title": "어제보다", "body": body})

    sent = send_push(messages)        # <-- send_push 수정 (멀티캐스트 지원)
    return {"sent": sent}