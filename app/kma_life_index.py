 """
 kma_life_index.py  (v2)
 -------------------------------------------------------------------------
 생활기상지수 V4 OpenAPI 래퍼 + 행정구역코드 자동 추정 기능
 -------------------------------------------------------------------------
 • 지원 지수  : 자외선( get_uv_index ), 대기정체( get_air_diffusion_index ),
               여름철 체감온도( get_sensation_temperature_index )
 • 좌표 → 행정구역코드 자동 변환 : area_no_from_latlon(lat, lon)
               - 근사치: 각 행정동(읍/면/동) 중심좌표(위경도) 기준, 가장 가까운 코드 반환
               - 필요 CSV: area_code_centroid.csv (열: area_no, lat, lon)
 • 의존 패키지: requests, redis, python-dotenv, timezonefinder, pandas
 -------------------------------------------------------------------------
 사용 예시
 -------------------------------------------------------------------------
     from kma_life_index import get_uv_index

     # 위·경도만 알고 있는 경우
     uv = get_uv_index(lat=37.5665, lon=126.9780)
     print(uv["uv"][0])

     # 행정구역코드를 이미 보유한 경우
     uv2 = get_uv_index(area_no="1114055000")
 -------------------------------------------------------------------------
 """

 from __future__ import annotations
 import csv, math, os, json, pathlib, requests, redis, datetime as dt, zoneinfo
 from typing import Tuple, List
 from dotenv import load_dotenv
 from timezonefinder import TimezoneFinder

 # ───────── 환경 변수 ───────── #
 load_dotenv()
 KMA_KEY    = os.environ["KMA_API_KEY"]               # 공공데이터포털 Encoding Key
 REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
 REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

 # ───────── 상수 ───────── #
 BASE_LIFE = "https://apis.data.go.kr/1360000/LivingWthrIdxServiceV4"
 CSV_NAME  = "area_code_centroid.csv"  # 동 단위 행정코드 & 위경도 센트로이드 목록
 _AREA_DB: List[Tuple[str, float, float]] | None = None  # (area_no, lat, lon)

 tf = TimezoneFinder()
 rdb = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

 # ---------------------------------------------------------------------
 # 내부 헬퍼
 # ---------------------------------------------------------------------
 def _tz(lat: float, lon: float) -> zoneinfo.ZoneInfo:
     return zoneinfo.ZoneInfo(tf.timezone_at(lat=lat, lng=lon) or "Asia/Seoul")

 def _life_base_time(tz: zoneinfo.ZoneInfo) -> dt.datetime:
     """생활기상지수 발표시각(06·18KST)에 맞춰 base_time 계산"""
     now = dt.datetime.now(tz)
     if now.hour < 6:
         base = (now - dt.timedelta(days=1)).replace(hour=18)
     elif now.hour < 18:
         base = now.replace(hour=6)
     else:
         base = now.replace(hour=18)
     return base.replace(minute=0, second=0, microsecond=0)

 def _call_life(endpoint: str, params: dict) -> dict:
     p = {
         "serviceKey": KMA_KEY,
         "dataType": "JSON",
         "numOfRows": 10,
         "pageNo": 1,
         **params,
     }
     url = f"{BASE_LIFE}/{endpoint}"
     res = requests.get(url, params=p, timeout=7)
     res.raise_for_status()
     body = res.json()["response"]["body"]
     if body["totalCount"] == 0:
         raise ValueError("생활기상지수 응답 없음")
     return body["items"]["item"][0]

 # ---------------------------------------------------------------------
 # 좌표 → 행정구역코드 근사치 매핑
 # ---------------------------------------------------------------------
 def _load_area_db() -> List[Tuple[str, float, float]]:
     global _AREA_DB
     if _AREA_DB is not None:
         return _AREA_DB
     csv_path = pathlib.Path(__file__).with_name(CSV_NAME)
     if not csv_path.exists():
         raise FileNotFoundError(
             f"{CSV_NAME} not found. 다운로드 후 같은 폴더에 배치하세요.")
     with csv_path.open(newline="", encoding="utf-8") as f:
         rdr = csv.DictReader(f)
         _AREA_DB = [(row["area_no"], float(row["lat"]), float(row["lon"])) for row in rdr]
     return _AREA_DB

 def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
     R = 6371.0
     dlat = math.radians(lat2 - lat1)
     dlon = math.radians(lon2 - lon1)
     a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
     return 2 * R * math.asin(math.sqrt(a))

 def area_no_from_latlon(lat: float, lon: float) -> str:
     """위·경도로 가장 가까운 행정구역코드(10자리) 반환"""
     db = _load_area_db()
     best = min(db, key=lambda rec: _haversine(lat, lon, rec[1], rec[2]))
     return best[0]

 # ---------------------------------------------------------------------
 # 공개 API 래퍼 (UV, 공기확산, 체감온도)
 # ---------------------------------------------------------------------
 def _fetch_index(endpoint: str, area_no: str, tz: zoneinfo.ZoneInfo) -> dict:
     base_dt = _life_base_time(tz)
     cache_key = f"{endpoint}:{area_no}:{base_dt:%Y%m%d%H}"
     if v := rdb.get(cache_key):
         return json.loads(v)

     item = _call_life(endpoint, {"areaNo": area_no, "time": base_dt.strftime("%Y%m%d%H")})
     vals = [float(item[f"h{i}"]) for i in range(0, 76) if f"h{i}" in item]
     payload = {"base_time": item["date"], "values": vals}
     rdb.setex(cache_key, 3600, json.dumps(payload))
     return payload

 def get_uv_index(*, area_no: str | None = None, lat: float | None = None, lon: float | None = None) -> dict:
     if area_no is None:
         if lat is None or lon is None:
             raise ValueError("area_no 또는 lat/lon 중 하나는 필수")
         area_no = area_no_from_latlon(lat, lon)
     tz = _tz(lat, lon) if lat is not None and lon is not None else zoneinfo.ZoneInfo("Asia/Seoul")
     data = _fetch_index("getUVIdxV4", area_no, tz)
     data["uv"] = data.pop("values")
     return data

 def get_air_diffusion_index(*, area_no: str | None = None, lat: float | None = None, lon: float | None = None) -> dict:
     if area_no is None:
         if lat is None or lon is None:
             raise ValueError("area_no 또는 lat/lon 중 하나는 필수")
         area_no = area_no_from_latlon(lat, lon)
     tz = _tz(lat, lon) if lat is not None and lon is not None else zoneinfo.ZoneInfo("Asia/Seoul")
     data = _fetch_index("getAirDiffusionIdxV4", area_no, tz)
     data["air_diffusion"] = data.pop("values")
     return data

 def get_sensation_temperature_index(*, area_no: str | None = None, lat: float | None = None, lon: float | None = None) -> dict:
     if area_no is None:
         if lat is None or lon is None:
             raise ValueError("area_no 또는 lat/lon 중 하나는 필수")
         area_no = area_no_from_latlon(lat, lon)
     tz = _tz(lat, lon) if lat is not None and lon is not None else zoneinfo.ZoneInfo("Asia/Seoul")
     data = _fetch_index("getSenTaIdxV4", area_no, tz)
     data["sensation_temp"] = data.pop("values")
     return data

 # ---------------------------------------------------------------------
 # CLI quick check
 # ---------------------------------------------------------------------
 if __name__ == "__main__":
     lat, lon = 37.5665, 126.9780  # 서울 광화문
     print("UV:", get_uv_index(lat=lat, lon=lon)["uv"][:5])
     print("AirDiffusion:", get_air_diffusion_index(lat=lat, lon=lon)["air_diffusion"][:5])
     print("SensationTemp:", get_sensation_temperature_index(lat=lat, lon=lon)["sensation_temp"][:5])
