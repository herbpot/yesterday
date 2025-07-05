from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import sys

from .logger import logger
from .weather import get_compare, get_extremes
from .storage import Subscriber, upsert_subscriber, delete_subscriber
from .scheduler import start_scheduler
from .tasks import send_push_notification, test_task
from .meteo_weather import app as meteo_weather_router



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

app.include_router(meteo_weather_router)
# @app.get("/compare")
# async def compare(lat: float, lon: float):
#     try:
#         return get_compare(lat, lon)
#     except ValueError as e:
#         logger.error(f"compare: {e}")
#         raise HTTPException(400, str(e))

# @app.get("/extremes")
# async def extremes(lat: float, lon: float):
#     try:
#         return get_extremes(lat, lon)
#     except ValueError as e:
#         logger.error(f"extremes: {e}")
#         raise HTTPException(400, str(e))

# ─────────────── 푸시 토큰 등록 ─────────────── #
@app.post("/register")
async def register(sub: Subscriber):
    upsert_subscriber(sub)
    return {"status": "ok"}

@app.post("/unregister")
async def unregister(uid: str):
    if not uid:
        raise HTTPException(400, "uid is required")
    delete_subscriber(uid)
    return {"status": "ok"}

# ─────────────── 일일 알림 (Cloud Scheduler) ─────────────── #

@app.get("/test")
async def test():
    test_task()  # Celery 작업으로 테스트 실행
    return {"status": "ok", "message": "Test endpoint is working"}

@app.get("/notify_daily")
async def notify_daily():
    send_push_notification()  # Celery 작업으로 푸시 알림 전송
    return {"status": "ok", "message": "Daily notification task started"}

@app.get("/privacy-policy", response_class=HTMLResponse)
async def privacy_policy():
    with open("./app/PrivacyPolicy.html", "r", encoding="utf-8") as f:
        content = f.read()
        return HTMLResponse(content=content)