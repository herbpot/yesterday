# app/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timezone
import pytz, os
from .weather import get_compare
from .push import send_push
from .storage import list_subscribers    # uid, token, lat, lon, tz, hour, minute

sched = BackgroundScheduler(timezone=timezone.utc)

def job():
    now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
    messages = []

    for sub in list_subscribers():              # DB / Redis 모두 OK
        local = now_utc.astimezone(pytz.timezone(sub.tz))
        if not (local.hour == sub.hour and abs(local.minute - sub.minute) < 5):
            continue                            # “이번 5분 슬롯” 사용자만

        diff = get_compare(sub.lat, sub.lon)
        body = f"지금 {diff['now']:.1f}°C, 어제보다 {diff['delta']:+.1f}°C"
        messages.append({"token": sub.token, "title": "어제보다", "body": body})

    if messages:
        sent = send_push(messages)
        print(f"[{now_utc}] push sent: {sent}")

def start_scheduler():
    sched.add_job(job, IntervalTrigger(minutes=5, jitter=30))  # ±30s 랜덤 분산
    sched.start()
