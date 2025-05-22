from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, redis

from .logger import logger
from .weather import get_compare, get_extremes
from .push    import send_push
from .storage import Subscriber, upsert_subscriber
from .scheduler import start_scheduler

rdb = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    decode_responses=True
)

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
        return get_compare(lat, lon, rdb)
    except ValueError as e:
        logger.error(f"compare: {e}")
        raise HTTPException(400, str(e))

@app.get("/extremes")
async def extremes(lat: float, lon: float):
    try:
        return get_extremes(lat, lon, rdb)
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
    uids = rdb.smembers("subs")
    if not uids:
        return {"sent": 0}

    messages = []          # FCM Message 배열
    for uid in uids:
        data = rdb.hgetall(f"subs:{uid}")
        if not data:
            continue
        tz = pytz.timezone(data["tz"])
        local_now = now_utc.astimezone(tz)

        # 사용자가 지정한 시각 ± TIME_WINDOW_MIN 내?
        if not (
            local_now.hour == int(data["hour"])
            and abs(local_now.minute - int(data["minute"])) < TIME_WINDOW_MIN
        ):
            continue

        # 실시간 Δ 계산
        diff = get_compare(float(data["lat"]), float(data["lon"]), rdb)
        body = f"지금은 {diff['now']:.1f}°C, 어제보다 살짝더 {"더워요" if diff['delta'] > 0 else "추워요"}.({diff['delta']:+.1f}°C)"

        messages.append(
            {
                "token": data["fcm_token"],
                "title": "살짝더",
                "body": body,
            }
        )

    sent = send_push(messages)        # <-- send_push 수정 (멀티캐스트 지원)
    return {"sent": sent}
