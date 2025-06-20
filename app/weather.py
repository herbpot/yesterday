import os, json, zoneinfo, requests, redis
from datetime import datetime, timedelta
from pandas import to_datetime
from timezonefinder import TimezoneFinder
import logging
from dotenv import load_dotenv
load_dotenv("./.env")

logger = logging.getLogger("..")
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# ───────── Redis 연결 ───────── #
rdb = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    decode_responses=True,
)

# ───────── 공통 상수 ───────── #
API_KEY   = os.environ["GOOGLE_MAPS_WEATHER_API_KEY"]
BASE_URL  = "https://weather.googleapis.com/v1"
LANG      = "ko"          # 한국어 응답

tf = TimezoneFinder()


# ───────── 내부 유틸리티 ───────── #
def _round_hour(dt: datetime) -> datetime:
    "분·초·마이크로초 제거(로컬 tz 유지)"
    return dt.replace(minute=0, second=0, microsecond=0)


def _tz(lat: float, lon: float) -> zoneinfo.ZoneInfo:
    name = tf.timezone_at(lat=lat, lng=lon)
    if not name:
        raise ValueError("Timezone not found")
    return zoneinfo.ZoneInfo(name)


def _get(url: str, params: dict) -> dict:
    "Google Weather API 공통 GET"
    params.update({"key": API_KEY, "languageCode": LANG})
    logger.info(f"GET {url} with params: {params}")
    resp = requests.get(url, params=params, timeout=10)
    if resp.status_code != 200:
        raise RuntimeError(
            f"Weather API error {resp.status_code}: {resp.text[:200]}"
        )
    return resp.json()


# ───────── API 래퍼 ───────── #
def _current_conditions(lat: float, lon: float) -> float:
    url = f"{BASE_URL}/currentConditions:lookup"
    data = _get(
        url,
        {
            "location.latitude": lat,
            "location.longitude": lon,
        },
    )
    return float(data["currentConditions"][0]["temperature"])


def _history_hours(lat: float, lon: float, hours: int = 24) -> list[dict]:
    url = f"{BASE_URL}/history/hours:lookup"
    data = _get(
        url,
        {
            "location.latitude": lat,
            "location.longitude": lon,
            "hours": hours,
        },
    )
    return data["historyHours"]  # 각 항목에 observationTimeSec, temperature 포함


# ───────── 기능 ① 지금 ↔︎ 어제 같은 시각 ───────── #
def get_compare(lat: float, lon: float) -> dict:
    tz      = _tz(lat, lon)
    now_dt  = _round_hour(datetime.now(tz))
    yest_dt = now_dt - timedelta(days=1)

    cache_key = f"cmp:{lat:.4f}:{lon:.4f}:{now_dt:%Y%m%d%H}"
    if val := rdb.get(cache_key):
        return json.loads(val)

    # 1) 현재 기온
    temp_now = _current_conditions(lat, lon)

    # 2) 지난 24시간 이력
    hist = _history_hours(lat, lon, 24)

    # observationTimeSec → 로컬 datetime
    yest_temp = None
    for h in hist:
        obs_dt = datetime.fromtimestamp(h["observationTimeSec"], tz)
        if _round_hour(obs_dt) == yest_dt:
            yest_temp = float(h["temperature"])
            break
    if yest_temp is None:
        raise ValueError("24시간 이력에 전일 동일 시각이 포함되지 않았습니다.")

    payload = {
        "now": temp_now,
        "yesterday": yest_temp,
        "delta": round(temp_now - yest_temp, 1),
    }
    rdb.setex(cache_key, 600, json.dumps(payload))  # 10 분 캐시
    return payload


# ───────── 기능 ② 오늘·어제 최고·최저 ───────── #
def get_extremes(lat: float, lon: float) -> dict:
    tz          = _tz(lat, lon)
    today_date  = datetime.now(tz).date()
    yest_date   = today_date - timedelta(days=1)
    cache_key   = f"ext:{lat:.4f}:{lon:.4f}:{today_date}"
    if val := rdb.get(cache_key):
        return json.loads(val)

    # 최근 48 시간(두 날짜 커버) 이력 가져오기
    hist = _history_hours(lat, lon, hours=48)

    today_temps, yest_temps = [], []
    for h in hist:
        t = datetime.fromtimestamp(h["observationTimeSec"], tz)
        temp = float(h["temperature"])
        if t.date() == today_date:
            today_temps.append(temp)
        elif t.date() == yest_date:
            yest_temps.append(temp)

    if not today_temps or not yest_temps:
        raise ValueError("히스토리 자료가 부족합니다. 자정 이후에 다시 시도하세요.")

    payload = {
        "today_max": max(today_temps),
        "today_min": min(today_temps),
        "yest_max": max(yest_temps),
        "yest_min": min(yest_temps),
        "delta_max": round(max(today_temps) - max(yest_temps), 1),
        "delta_min": round(min(today_temps) - min(yest_temps), 1),
    }
    rdb.setex(cache_key, 3600, json.dumps(payload))  # 1 시간 캐시
    return payload


# ───────── CLI 테스트 ───────── #
if __name__ == "__main__":
    seoul = (37.5665, 126.9780)
    print("▲ 지금 ↔︎ 어제 같은 시각")
    print(get_compare(*seoul))
    print("▲ 오늘·어제 최고·최저")
    print(get_extremes(*seoul))
