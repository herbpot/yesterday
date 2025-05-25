from timezonefinder import TimezoneFinder
from datetime import datetime, timedelta
from meteostat import Point, Hourly, Daily
import zoneinfo, json
from pandas import to_datetime

from .logger import logger
from .storage import rdb

tf = TimezoneFinder()

def _round_hour(dt):
    return dt.replace(minute=0, second=0, microsecond=0, tzinfo=None)

def _tz(lat, lon):
    tz_name = tf.timezone_at(lat=lat, lng=lon)
    if not tz_name:
        raise ValueError("Timezone not found")
    return zoneinfo.ZoneInfo(tz_name)

# ───────── 현재 vs 어제 같은 시각 ───────── #
def get_compare(lat: float, lon: float):
    tz = _tz(lat, lon)
    now = _round_hour(datetime.now())
    yest = (now - timedelta(days=1)).replace(tzinfo=None)
    cache_key = f"cmp:{lat:.2f}:{lon:.2f}:{now:%Y%m%d%H}"
    if val := rdb.get(cache_key):
        return json.loads(val)

    # Meteostat 포인트 객체
    point = Point(lat, lon)

    # 어제 ~ 현재까지 시간별 데이터 가져오기
    df = Hourly(point, yest, now).fetch()

    if now not in df.index or yest not in df.index:
        raise ValueError("기온 데이터가 누락되었습니다.")

    temp_now = float(df.loc[now]['temp'])
    temp_yest = float(df.loc[yest]['temp'])
    delta = round(temp_now - temp_yest, 1)

    payload = {
        "now": temp_now,
        "yesterday": temp_yest,
        "delta": delta
    }
    rdb.setex(cache_key, 600, json.dumps(payload))
    return payload

# ───────── 오늘 / 어제 최고·최저 ───────── #
def get_extremes(lat: float, lon: float):
    today = _round_hour(datetime.today()).replace(hour=0)
    yest  = today - timedelta(days=1)
    cache_key = f"ext:{lat:.2f}:{lon:.2f}:{today}"
    if val := rdb.get(cache_key):
        return json.loads(val)

    point = Point(lat, lon)

    # 어제 ~ 오늘 일별 데이터 가져오기
    df = Daily(point, yest - timedelta(days=1), today).fetch()
    
    if to_datetime(yest) not in df.index or to_datetime(today) not in df.index:
        raise ValueError("일별 기온 데이터가 누락되었습니다.")

    today_max = float(df.loc[today]['tmax'])
    today_min = float(df.loc[today]['tmin'])
    yest_max = float(df.loc[yest]['tmax'])
    yest_min = float(df.loc[yest]['tmin'])

    payload = {
        "today_max": today_max, "today_min": today_min,
        "yest_max": yest_max,   "yest_min": yest_min,
        "delta_max": round(today_max - yest_max, 1),
        "delta_min": round(today_min - yest_min, 1)
    }
    rdb.setex(cache_key, 3600, json.dumps(payload))
    return payload

if __name__ == "__main__":
    print(get_compare(37.5665, 126.978, None))
