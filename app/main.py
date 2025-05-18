from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, redis

from .logger import logger
from .weather import get_compare, get_extremes
from .push    import send_push

rh = os.getenv("REDISCLOUD_URL", "localhost:6379")
rdb = redis.Redis(
    host=rh.split(":")[0],
    port=int(rh.split(":")[1]),
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

# ─────────────── 기온 비교 ─────────────── #
@app.get("/compare")
async def compare(lat: float, lon: float):
    try:
        logger.info(f"compare: {lat}, {lon}")
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

# ─────────────── 일일 알림 (Cloud Scheduler) ─────────────── #
# @app.post("/notify_daily")
# async def notify_daily():
#     tokens = list(rdb.smembers("push_tokens"))
#     if not tokens:
#         return {"sent": 0}
#     sent = send_push(tokens,
#                      title="오늘/어제 기온 확인",
#                      body="앱을 열고 오늘과 어제의 기온 차이를 보세요!")
#     return {"sent": sent} 