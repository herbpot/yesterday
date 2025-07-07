# app/storage.py

from dataclasses import dataclass
from pymongo import MongoClient, UpdateOne
from pymongo.collection import Collection
from datetime import datetime
import os
import pytz
from dotenv import load_dotenv

from .logger import logger

load_dotenv(dotenv_path='/app/.env')


DEV = os.getenv("DEV", "false").lower() == "true"

# ───────── MongoDB 연결
mongo_client = MongoClient(os.getenv("MONGO_URL"))
db = mongo_client.yesterday
if DEV:
    db = mongo_client.yesterday_dev  # 개발 환경에서는 별도의 컬렉션 사용
    logger.info("Using development MongoDB collection: yesterday_dev")
subs: Collection = db.subscribers  # 컬렉션 이름

# ───────── Subscriber 데이터 구조
@dataclass
class Subscriber:
    uid: str
    fcm_token: str
    lat: float
    lon: float
    tz: str
    hour: int
    minute: int

# ───────── 저장 또는 업데이트
def upsert_subscriber(sub: Subscriber) -> None:
    logger.info(f"[Mongo] Upserting subscriber: {sub.uid} ({sub.lat}, {sub.lon})")
    subs.update_one(
        {"uid": sub.uid},
        {"$set": sub.__dict__},
        upsert=True
    )

# ───────── 삭제
def delete_subscriber(uid: str) -> None:
    logger.info(f"[Mongo] Deleting subscriber: {uid}")
    subs.delete_one({"uid": uid})
    logger.info(f"[Mongo] Subscriber {uid} deleted")

# ───────── 전체 구독자 조회
from datetime import datetime
import pytz

from datetime import datetime, timedelta
import pytz
from .logger import logger
from .storage import Subscriber, subs  # Mongo 컬렉션 `subs`

def list_subscribers() -> list[Subscriber]:
    result: list[Subscriber] = []
    now_utc = datetime.utcnow()

    for raw in subs.find():
        try:
            tz = raw["tz"]
            local_now = now_utc.astimezone(pytz.timezone(tz))
            target_hour = int(raw.get("hour", 7))
            target_minute = int(raw.get("minute", 0))

            # 알림 시각을 datetime으로 구성
            alarm_time = local_now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)

            # 시각이 지나간 경우 다음 날로 보정 (예: 23:59 → 00:01은 내일 알림으로 처리)
            if alarm_time < local_now:
                alarm_time += timedelta(days=1)

            # 5분 이내에 포함되는지 확인
            delta = (alarm_time - local_now).total_seconds()
            if not (0 <= delta <= 300):  # 0초 ~ 300초 = 5분
                continue

            sub = Subscriber(
                uid=raw["uid"],
                fcm_token=raw["fcm_token"],
                lat=float(raw["lat"]),
                lon=float(raw["lon"]),
                tz=tz,
                hour=target_hour,
                minute=target_minute,
            )
            result.append(sub)
            logger.info(f"[Mongo] Loaded subscriber: {sub.uid}")
        except Exception as e:
            logger.error(f"[Mongo] Error loading subscriber: {raw.get('uid')} -> {e}")

    logger.info(f"[Mongo] Total subscribers loaded in 5-minute window: {len(result)}")
    return result


if __name__ == "__main__":
    # 테스트용: 전체 구독자 조회
    subs = list_subscribers()
    for sub in subs:
        print(f"UID: {sub.uid}, Location: ({sub.lat}, {sub.lon}), Timezone: {sub.tz}")
    print(f"Total subscribers: {len(subs)}")