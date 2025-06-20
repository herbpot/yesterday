"""
KMA 단기예보 OpenAPI 기반 현재·어제 기온 비교 / 오늘·어제 극값 모듈
Author : ONDAM (2025-06-13)
"""

import os, json, requests, redis, zoneinfo, datetime as dt
from dotenv import load_dotenv
from timezonefinder import TimezoneFinder
from pandas import to_datetime, DataFrame, isna
from kma_grid import latlon_to_xy     # (2)절에서 만든 함수
import math, re, numpy as np
from typing import Dict, Any
import logging

logger = logging.getLogger("..")
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(handler)
logger.setLevel(logging.DEBUG)

# ───────── 설정 ───────── #
load_dotenv()
SERVICE_KEY = os.environ["KMA_API_KEY"]          # 인증키(인코딩)
BASE_URL    = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
_KOREAN_NUM_MAP: Dict[str, float] = {
    "강수없음": 0.0,
    "적설없음": 0.0,
    "": math.nan,  # 빈 문자열
}
_MM_PATTERN = re.compile(r"([0-9.]+)\s*mm")
_SUB_MM_PATTERN = re.compile(r"[0-9.]*\s*mm\s*미만")

rdb = redis.Redis(
    host=os.getenv("REDIS_HOST","localhost"),
    port=int(os.getenv("REDIS_PORT","6379")),
    decode_responses=True
)
tf = TimezoneFinder()

# ───────── 내부 공통 ───────── #
def _tz(lat, lon):
    name = tf.timezone_at(lat=lat, lng=lon) or "Asia/Seoul"
    return zoneinfo.ZoneInfo(name)

def _now(tz):
    """현재 시각을 최근 발표(정시)로 내림(분10초 제거)"""
    kst = dt.datetime.now(tz).replace(minute=0, second=0, microsecond=0)
    # 기상청 API는 발표 시각이 매시 30분 이후 제공 => 45분 이전이면 한 시간 전 base_time 사용
    # if dt.datetime.now(tz).minute < 30:
    #     kst -= dt.timedelta(hours=1)
    return kst

def _call_api(endpoint:str, params:dict):
    p = {
        "serviceKey": SERVICE_KEY,
        "dataType"  : "JSON",
        **params
    }
    url = f"{BASE_URL}/{endpoint}"
    while True:
        t = 1
        try:
            res = requests.get(url, params=p, timeout=6)
            break
        except:
            t += 1
            if t > 5:
                logger.error(f"API 호출 실패: {url} with params: {params}")
                raise RuntimeError("KMA API 호출 실패")
            logger.warning(f"API 호출 재시도 {t}/5: {url} with params: {params}")
    res.raise_for_status()
    logger.info(f"API 호출: {url} with params: {params}")
    logger.debug(f"응답: {res.text[:200]}")  # 처음 200자만 로그
    if res.status_code != 200 or res.json().get("response", {}).get("header", {}).get("resultCode") != "00":
        raise RuntimeError(
            f"KMA API 오류 {res.status_code}: {res.text[:200]}"
        )
    body = res.json()["response"]["body"]
    if body["totalCount"] == 0:
        raise ValueError("KMA API 결과 없음")
    logger.debug(f"API 응답 아이템 수: {body['totalCount']}")
    return body["items"]["item"]

def _to_float(value: Any) -> float:
    """fcstValue 필드(문자/숫자/이상치)를 float 로 변환."""
    if isna(value):                     # NaN
        return np.nan

    s = str(value).strip()

    # 1) -999 → NaN
    if s == "-999":
        return np.nan

    # 2) 매핑 테이블(한글 키워드)
    if s in _KOREAN_NUM_MAP:
        return _KOREAN_NUM_MAP[s]

    # 3) ‘mm 미만’ → 0.5 mm 로 통일
    if _SUB_MM_PATTERN.fullmatch(s):
        return 0.5

    # 4) ‘3.0mm’ 같은 정량값
    m = _MM_PATTERN.fullmatch(s)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return np.nan

    # 5) 일반 실수 또는 정수
    try:
        return float(s)
    except ValueError:
        return np.nan

def split_by_category(df: DataFrame) -> Dict[str, DataFrame]:
    """
    기상청 초단기예보 DataFrame(df)을 'category' 값별로 분리.

    Parameters
    ----------
    df : pd.DataFrame
        forecast_cleaner.parse_forecast() 로 얻은 원본 DataFrame.
        (반드시 'category' 컬럼이 존재해야 함)

    Returns
    -------
    Dict[str, pd.DataFrame]
        key   : 카테고리 문자열(TMP, POP, PTY, …)  
        value : 해당 카테고리만 포함된 DataFrame (인덱스 reset)
    """
    if "category" not in df.columns:
        raise KeyError("'category' 컬럼이 없습니다 — 먼저 파서를 확인하세요.")

    cat_groups: Dict[str, pd.DataFrame] = {
        cat: g.reset_index(drop=True) for cat, g in df.groupby("category", sort=True)
    }
    return cat_groups

# ───────── ① 현재 ↔ 어제 같은 시각 ───────── #
def get_compare(lat:float, lon:float):
    tz   = _tz(lat, lon)
    now  = _now(tz)
    yest = now - dt.timedelta(days=1) + dt.timedelta(hours=1)  # 어제 같은 시각

    cache = f"cmp:{lat:.4f}:{lon:.4f}:{now:%Y%m%d%H}"
    if v:=rdb.get(cache):
        return json.loads(v)

    nx, ny = latlon_to_xy(lat, lon)

    def _t1h(base_dt):
        items = _call_api(
            "getUltraSrtNcst",
            {
                "base_date": base_dt.strftime("%Y%m%d"),
                "base_time": base_dt.strftime("%H%M"),
                "nx": nx, "ny": ny
            }
        )
        for it in items:
            if it["category"] == "T1H":
                return float(it["obsrValue"])
        raise ValueError("T1H 없음")

    t_now  = _t1h(now)
    t_yest = _t1h(yest)

    payload = {
        "now": t_now,
        "yesterday": t_yest,
        "delta": round(t_now - t_yest, 1)
    }
    rdb.setex(cache, 600, json.dumps(payload))
    return payload

# ───────── ② 오늘·어제 최고/최저 ───────── #
def get_extremes(lat:float, lon:float):
    tz   = _tz(lat, lon)
    today = _now(tz).date()  # 오늘 날짜
    yest  = today - dt.timedelta(days=1)

    logger.debug(f"오늘: {today}, 어제: {yest}")
    cache = f"ext:{lat:.4f}:{lon:.4f}:{today}"
    if v:=rdb.get(cache):
        return json.loads(v)

    nx, ny = latlon_to_xy(lat, lon)

    # 48시간(오늘 00시 기준) 초단기예보 T1H + 당일동네예보 TMX/TMN 보정
    base_dt = dt.datetime.combine(yest, dt.time(2,00))  # 가장 늦은 발표값
    items = _call_api(
        "getVilageFcst",
        {
            "base_date": base_dt.strftime("%Y%m%d"),
            "base_time": base_dt.strftime("%H%M"),
            "nx": nx, "ny": ny,
            "numOfRows": 60*48   # 충분히 크게
        }
    )

    # 시간별 T1H 모으기
    df = DataFrame(items)
    logger.debug(f"{df.head()}")  # 전체 기간
    # df = df[df["category"] == "T1H"][["fcstDate","fcstTime","fcstValue"]]
    df["dt"] = to_datetime(df["fcstDate"] + df['fcstTime'], format="%Y%m%d%H%M")
    dfs = split_by_category(df)  # 카테고리별로 분리
    df = dfs.get("TMP")
    df.set_index("dt", inplace=True)
    df.sort_index(inplace=True)
    df["temp"] = df["fcstValue"].map(_to_float).astype(float)

    today_t = df[df.index.date == today]["temp"]
    yest_t  = df[df.index.date == yest ]["temp"]

    logger.debug(f"{df.index.min()} ~ {df.index.max()}")  # 전체 기간
    logger.debug(f"오늘 기온: {today_t.tolist()}")
    logger.debug(f"어제 기온: {yest_t.tolist()}")
    
    if today_t.empty or yest_t.empty:
        raise ValueError("48시간 예보 부족 – 0시 이후 다시 호출 요망")

    payload = {
        "today_max": today_t.max(),
        "today_min": today_t.min(),
        "yest_max": yest_t.max(),
        "yest_min": yest_t.min(),
        "delta_max": round(today_t.max() - yest_t.max(), 1),
        "delta_min": round(today_t.min() - yest_t.min(), 1)
    }
    rdb.setex(cache, 3600, json.dumps(payload))
    return payload

# ───────── CLI 테스트 ───────── #
if __name__ == "__main__":
    lat, lon = 37.5665, 126.9780   # 서울
    print("현재·어제 비교:", get_compare(lat, lon))
    print("오늘·어제 극값 :", get_extremes(lat, lon))
