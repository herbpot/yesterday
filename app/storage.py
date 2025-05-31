# app/storage.py
from dataclasses import dataclass
import os, redis

from .logger import logger

SUB_KEY = "subs"           # uid 집합

rdb = redis.from_url(
    os.getenv("REDISCLOUD_URL"),
    decode_responses=True,  # Redis에서 문자열로 디코딩
    encoding="utf-8",       # UTF-8로 인코딩
)

@dataclass
class Subscriber:
    uid: str
    fcm_token: str
    lat: float
    lon: float
    tz: str
    hour: int
    minute: int

# ───────────────── 저장 / 업데이트 (register 엔드포인트에서 호출)
def upsert_subscriber(sub: Subscriber) -> None:
    logger.info(f"Upserting subscriber: {sub.uid} ({sub.lat}, {sub.lon})")
    rdb.hset(f"subs:{sub.uid}", mapping=sub.__dict__)
    rdb.sadd(SUB_KEY, sub.uid)

def delete_subscriber(uid: str) -> None:
    logger.info(f"Deleting subscriber: {uid}")
    rdb.srem(SUB_KEY, uid)  # 집합에서 제거
    rdb.delete(f"subs:{uid}")  # 해시 삭제
    logger.info(f"Subscriber {uid} deleted")

# ───────────────── 전체 목록 가져오기 (스케줄러에서 사용)
def list_subscribers() -> list[Subscriber]:
    subscribers: list[Subscriber] = []
    for uid in rdb.smembers(SUB_KEY):
        raw = rdb.hgetall(f"subs:{uid}")
        logger.info(f"Loading subscriber: {uid} -> {raw}")
        if not raw:        # 지워졌는데 집합에 남아 있을 수 있음
            rdb.srem(SUB_KEY, uid)
            continue
        subscribers.append(
            Subscriber(
                uid=uid,
                fcm_token=raw["fcm_token"],
                lat=float(raw["lat"]),
                lon=float(raw["lon"]),
                tz=raw["tz"],
                hour=int(raw.get("hour", 7)),
                minute=int(raw.get("minute", 0)),
            )
        )
    logger.info(f"Subscribers loaded: {len(subscribers)}")
    return subscribers
