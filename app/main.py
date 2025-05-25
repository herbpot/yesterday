from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import os, redis

from .logger import logger
from .weather import get_compare, get_extremes
from .push    import send_push
from .storage import Subscriber, upsert_subscriber, list_subscribers
from .scheduler import start_scheduler



app = FastAPI(title="TempDiff API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용. 배포 시 특정 origin으로 제한 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Token(BaseModel):
    uid:   str
    token: str   # FCM / APNs

async def _startup():
    start_scheduler()          # 백그라운드 스레드로 5분 루프 시작

app.add_event_handler("startup", _startup)

# ─────────────── 기온 비교 ─────────────── #
@app.get("/compare")
async def compare(lat: float, lon: float):
    try:
        return get_compare(lat, lon)
    except ValueError as e:
        logger.error(f"compare: {e}")
        raise HTTPException(400, str(e))

@app.get("/extremes")
async def extremes(lat: float, lon: float):
    try:
        return get_extremes(lat, lon)
    except ValueError as e:
        logger.error(f"extremes: {e}")
        raise HTTPException(400, str(e))

# ─────────────── 푸시 토큰 등록 ─────────────── #
@app.post("/register_token")
async def register_token(data: Token):
    rdb.sadd("push_tokens", data.token)
    return {"status": "ok"}

@app.post("/register")
async def register(sub: Subscriber):
    upsert_subscriber(sub)
    return {"status": "ok"}


# ─────────────── 일일 알림 (Cloud Scheduler) ─────────────── #
from datetime import datetime, timezone
import pytz, json

TIME_WINDOW_MIN = 10   # 10분 단위로 배치 실행한다고 가정

@app.post("/notify_daily")
async def notify_daily():
    now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
    messages = []
    for sub in list_subscribers():              # DB / Redis 모두 OK
        local = now_utc.astimezone(pytz.timezone(sub.tz))
        if not (local.hour == sub.hour and local.minute - sub.minute < 5):
            continue                            # “이번 5분 슬롯” 사용자만
        
        diff = get_compare(sub.lat, sub.lon)
        w = "덥네요" if diff['delta'] > 0 else "춥네요"
        body = f"오늘은({diff['today']:.1f}°C), 어제보다 살짝더 {w}.({diff['delta']:+.1f}°C)"
        messages.append({"token": sub.token, "title": "어제보다", "body": body})

    sent = send_push(messages)        # <-- send_push 수정 (멀티캐스트 지원)
    return {"sent": sent}

@app.get("/privacy-policy", response_class=HTMLResponse)
async def privacy_policy():
    with open("./app/PrivacyPolicy.html", "r", encoding="utf-8") as f:
        content = f.read()
        return HTMLResponse(content=content)
