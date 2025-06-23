from fastapi import APIRouter, HTTPException, Query
import httpx
from typing import Literal, List, Dict, Any
from datetime import datetime, timedelta, timezone # 사용되지 않아 제거
import zoneinfo # Python 3.9 이상, 또는 pytz 라이브러리 사용

app = APIRouter(prefix="/meteo-weather")

WEATHER_CODE_MAP = {
    0: "clear",
    1: "mainlyClear",
    2: "partlyCloudy",
    3: "overcast",
    45: "fog",
    48: "depositingRime",
    51: "drizzleLight",
    53: "drizzleModerate",
    55: "drizzleDense",
    61: "rainSlight",
    63: "rainModerate",
    65: "rainHeavy",
    71: "snowSlight",
    73: "snowModerate",
    75: "snowHeavy",
    95: "thunderstorm",
    99: "thunderstormHail",
}

WEATHER_IMAGES = {
    "clear_day":   "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2600.png",
    "clear_night": "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f319.png",
    "cloudy":      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26c5.png",
    "overcast":    "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2601.png",
    "rain":        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f327.png",
    "snow":        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f328.png",
    "thunder":     "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26c8.png",
}


def code_to_key(code: int, is_day: Literal[0, 1]) -> str:
    """날씨 코드와 낮/밤 여부를 기준으로 이미지 키를 반환합니다."""
    if code == 0:
        return "clear_day" if is_day else "clear_night"

    # ② 구름 계열
    if code in (1, 2):
        return "cloudy"
    if code == 3:
        return "overcast"

    # ③ 안개·서리
    if code in (45, 48):
        return "cloudy" # 안개/서리는 구름 이미지를 사용하도록 매핑됨

    # ④ 비·이슬비
    if code in (51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82): # 소나기 및 빙결비 코드 추가
        return "rain"

    # ⑤ 눈
    if code in (71, 73, 75, 77, 85, 86): # 눈 관련 코드 추가
        return "snow"

    # ⑥ 천둥·우박
    if code in (95, 96, 99): # 천둥 관련 코드 추가 (96: 뇌우 + 약한 우박)
        return "thunder"

    # ⑦ 알 수 없는 코드 → 기본(흐림)으로
    return "cloudy"

async def get_location_timezone(lat: float, lon: float) -> str:
    """API에서 위치 시간대 정보를 가져옵니다."""
    try:
        # 최소한의 데이터 요청으로 시간대 정보를 얻음 (예: current_weather=true 만 요청)
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&timezone=auto"
        async with httpx.AsyncClient() as client:
            res = await client.get(url)
            res.raise_for_status()
            data = res.json()
            timezone_str = data.get("timezone")
            if not timezone_str:
                 raise ValueError("API 응답에 시간대 정보가 누락되었습니다.")
            return timezone_str
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"시간대 API 요청 실패: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시간대 정보 가져오는 중 오류 발생: {str(e)}")

def build_weather_url(lat: float, lon: float) -> str:
    """현재 날씨 및 관련 데이터를 가져오기 위한 API URL을 생성합니다."""
    return (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"hourly=temperature_2m,relativehumidity_2m,uv_index,apparent_temperature,weathercode,is_day&" # weathercode, is_day도 hourly에 추가 요청 (current_weather와 함께 사용)
        f"current_weather=true&"
        f"timezone=auto"
    )

def build_hourly_temperature_url_by_date_range(lat: float, lon: float, start_date_str: str, end_date_str: str) -> str:
    """시간별 기온 데이터를 특정 날짜 범위 (YYYY-MM-DD)로 가져오기 위한 API URL을 생성합니다."""
    # start_date와 end_date는 요청된 위치 시간대의 달력 날짜를 기준으로 해석됩니다.
    return (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"hourly=temperature_2m&" # 시간별 기온만 요청
        f"start_date={start_date_str}&" # 시작 날짜 지정 (위치 시간대 기준)
        f"end_date={end_date_str}&"     # 끝 날짜 지정 (위치 시간대 기준)
        f"timezone=auto" # 시간대 자동 설정 (응답에서 확인하여 사용)
    )


@app.get("/weather")
async def get_weather(lat: float = Query(..., description="위도"), lon: float = Query(..., description="경도")) -> Dict[str, Any]:
    """
    현재 날씨 및 관련 데이터를 가져옵니다.

    Args:
        lat: 위도.
        lon: 경도.

    Returns:
        현재 날씨 정보 딕셔너리.
    """
    try:
        url = build_weather_url(lat, lon)
        async with httpx.AsyncClient() as client:
            res = await client.get(url)
            res.raise_for_status() # 4xx 또는 5xx 상태 코드에 대해 예외 발생
            data = res.json()

        return parse_weather(data)

    except httpx.HTTPStatusError as e:
         raise HTTPException(status_code=e.response.status_code, detail=f"날씨 API 요청 실패: {e.response.status_code} - {e.response.text}")
    except (ValueError, RuntimeError) as e:
         # parse_weather 내부에서 발생하는 예상된 파싱 오류 처리
         raise HTTPException(status_code=500, detail=f"날씨 데이터 파싱 또는 구조 오류: {str(e)}")
    except Exception as e:
        # 예상치 못한 기타 오류 처리
        raise HTTPException(status_code=500, detail=f"날씨 데이터 처리 중 예기치 않은 오류 발생: {str(e)}")


def parse_weather(j: dict) -> Dict[str, Any]:
    """API 응답 JSON에서 현재 날씨 데이터를 파싱합니다."""
    try:
        current = j.get("current_weather")
        hourly = j.get("hourly")

        # 필수 키 검증 강화
        required_hourly_keys = ["time", "temperature_2m", "relativehumidity_2m", "uv_index", "apparent_temperature", "weathercode", "is_day"]
        if not current or not hourly or not all(key in hourly and isinstance(hourly[key], list) for key in required_hourly_keys):
             raise ValueError("API 응답에서 필수 날씨 데이터 필드가 누락되었거나 형식이 올바르지 않습니다.")

        hourly_times = hourly["time"]
        hourly_temps = hourly["temperature_2m"]
        hourly_humidities = hourly["relativehumidity_2m"]
        hourly_uvs = hourly["uv_index"]
        hourly_feels = hourly["apparent_temperature"]
        hourly_weathercodes = hourly["weathercode"] # 시간별 코드 추가
        hourly_is_day = hourly["is_day"] # 시간별 낮/밤 추가

        n = len(hourly_times)

        # 현재 시간을 기준으로 가장 가까운 hourly 데이터 포인트 인덱스를 찾습니다.
        # API는 일반적으로 정각 데이터를 제공합니다.
        now = datetime.now(timezone.utc) # 서버의 현재 시간을 UTC로 가져옵니다.
        # Open-Meteo API 시간 문자열 예: "2023-10-27T15:00" (UTC 또는 요청된 시간대)
        # API의 시간대 정보를 파싱하여 사용하거나, API 응답 시간대가 'auto'이면 서버 시간대와 일치할 가능성이 높다고 가정할 수 있습니다.
        # 정확성을 위해 API 응답의 'timezone' 및 'timezone_abbreviation' 필드를 활용하는 것이 좋지만,
        # 여기서는 API 시간 문자열이 ISO 8601 형식이며 파싱 가능하다고 가정합니다.

        current_idx = -1
        # API 시간 배열은 오름차순 정렬되어 있습니다.
        # 현재 시간보다 같거나 작은 시간 중 가장 마지막 인덱스를 찾습니다.
        # API가 과거 데이터를 포함하므로, 마지막 데이터가 현재 시간과 완전히 일치하지 않을 수 있습니다.
        # 가장 가까운 과거 또는 현재 시점의 데이터 인덱스를 찾습니다.
        # 편의상 마지막 인덱스를 현재 데이터로 간주합니다. build_weather_url에 past_hours=48을 넣었으므로
        # 마지막 데이터는 현재 시간과 매우 가깝거나 같습니다.
        current_idx = n - 1
        if current_idx < 0:
             raise ValueError("API 응답에 시간별 데이터가 포함되어 있지 않습니다.")


        # 어제 동시간대 데이터 인덱스: 현재 데이터 인덱스에서 24를 뺍니다.
        # 이 인덱스가 0 이상이어야 유효합니다.
        yesterday_idx = current_idx - 24


        # 필요한 데이터 추출 및 데이터 가용성 확인
        today_temp = hourly_temps[current_idx] if 0 <= current_idx < n else None
        # 어제 기온은 yesterday_idx가 유효한 범위에 있을 때 가져옵니다.
        yesterday_temp = hourly_temps[yesterday_idx] if 0 <= yesterday_idx < n else None

        humidity = hourly_humidities[current_idx] if 0 <= current_idx < n else None
        # 버그 수정: humidityY도 올바른 키와 어제 인덱스 사용
        humidityY = hourly_humidities[yesterday_idx] if 0 <= yesterday_idx < n else None

        uv = hourly_uvs[current_idx] if 0 <= current_idx < n else None
        uvY = hourly_uvs[yesterday_idx] if 0 <= yesterday_idx < n else None

        feels = hourly_feels[current_idx] if 0 <= current_idx < n else None
        feelsY = hourly_feels[yesterday_idx] if 0 <= yesterday_idx < n else None

        # 현재 날씨 코드와 낮/밤 여부는 current_weather에서 가져오는 것이 공식적이므로 그대로 사용
        weather_code = current.get("weathercode")
        is_day = current.get("is_day")

        # weathercode나 is_day가 누락된 경우 처리
        # API 문서에 따르면 current_weather=true 시 항상 포함되어야 하지만, 안전하게 확인
        image_key = "cloudy" # 기본값
        if weather_code is not None and is_day is not None:
             image_key = code_to_key(weather_code, is_day)
        elif 0 <= current_idx < n and hourly_weathercodes[current_idx] is not None and hourly_is_day[current_idx] is not None:
             # current_weather가 누락된 경우 hourly 데이터에서 현재 시간대의 코드 사용 시도
              image_key = code_to_key(hourly_weathercodes[current_idx], hourly_is_day[current_idx])


        return {
            "imageKey": image_key,
            "imageURL": WEATHER_IMAGES.get(image_key, ""),
            "todayTemp": today_temp, # 현재 기온
            "yesterdayTemp": yesterday_temp, # 어제 동시간대 기온 (만약 없다면 None)
            "humidity": humidity,
            "humidityY": humidityY,
            "uv": uv,
            "uvY": uvY,
            "feels": feels,
            "feelsY": feelsY,
        }
    except Exception as e:
        # 더 구체적인 메시지로 다시 발생시키거나 다르게 처리
        # 파싱 중 발생할 수 있는 모든 예외를 여기서 잡아서 RuntimeError로 다시 발생시킵니다.
        # 이렇게 하면 get_weather 엔드포인트의 except 블록에서 일관되게 처리할 수 있습니다.
        raise RuntimeError(f"날씨 데이터 파싱 또는 구조 오류: {str(e)}")


# 시간별 온도 비교를 위한 새 엔드포인트

@app.get("/hourly-temperature-calendar") # 엔드포인트 이름 변경
async def get_hourly_temperature_calendar(lat: float = Query(..., description="위도"), lon: float = Query(..., description="경도")) -> List[Dict[str, Any]]:
    """
    어제(00:00-23:59)와 오늘(00:00-23:59)의 시간별 기온 데이터를 가져와 비교합니다.
    위치 시간대를 기준으로 정확한 날짜 범위를 사용합니다.

    Args:
        lat: 위도.
        lon: 경도.

    Returns:
        각 시간대별 어제와 오늘의 기온을 포함하는 딕셔너리 목록 (24개 항목).
        데이터가 없는 경우 해당 기온 값은 None이 됩니다.
    """
    try:
        # 1. 먼저 위치 시간대 정보를 가져옵니다.
        timezone_str = await get_location_timezone(lat, lon)

        # 2. 가져온 시간대를 사용하여 정확한 어제/오늘 달력 날짜를 계산합니다.
        try:
            # Open-Meteo는 IANA 시간대 이름을 반환합니다 (예: "Europe/Berlin").
            location_tz = zoneinfo.ZoneInfo(timezone_str)
        except zoneinfo.ZoneInfoNotFoundError:
             raise RuntimeError(f"API에서 알 수 없는 시간대 문자열을 받았습니다: {timezone_str}")
        except Exception as e:
             raise RuntimeError(f"시간대 정보 처리 중 오류 발생: {e}")

        # UTC 현재 시간을 위치 시간대로 변환하여 위치의 현재 시각을 얻음
        now_location_tz = datetime.now(timezone.utc).astimezone(location_tz)
        today_calendar_date = now_location_tz.date()
        yesterday_calendar_date = today_calendar_date - timedelta(days=1)

        # API 요청에 사용할 YYYY-MM-DD 형식의 날짜 문자열 생성
        yesterday_date_str = yesterday_calendar_date.strftime("%Y-%m-%d")
        today_date_str = today_calendar_date.strftime("%Y-%m-%d")

        # 3. 위치 시간대 기준의 어제/오늘 날짜 범위로 API에 메인 데이터 요청
        url = build_hourly_temperature_url_by_date_range(lat, lon, yesterday_date_str, today_date_str)

        async with httpx.AsyncClient() as client:
            res = await client.get(url)
            res.raise_for_status()
            data = res.json()

        # 4. API 응답 파싱 및 데이터 분류 (위치 시간대 기준 날짜와 비교)
        hourly_data = data.get("hourly")

        # 필수 키 및 형식 검증
        if not hourly_data or "time" not in hourly_data or not isinstance(hourly_data.get("time"), list) or "temperature_2m" not in hourly_data or not isinstance(hourly_data.get("temperature_2m"), list):
             raise ValueError("API에서 시간별 온도 데이터 필드가 누락되었거나 형식이 올바르지 않습니다.")

        hourly_times = hourly_data["time"]
        hourly_temps = hourly_data["temperature_2m"]

        # 어제와 오늘의 시간별 기온을 저장할 딕셔너리
        # 시간 문자열(HH:MM)을 키로 사용
        yesterday_hourly_temps_map: Dict[str, float | None] = {}
        today_hourly_temps_map: Dict[str, float | None] = {}

        # 시간별 데이터 순회 및 분류
        for time_str, temp in zip(hourly_times, hourly_temps):
            try:
                # API 타임스탬프 파싱: API 문자열은 이미 위치 시간대 기준의 시간을 나타냅니다.
                # 나이브 객체로 파싱하고, 그 객체의 date() 속성을 사용합니다.
                dt_obj_naive = datetime.fromisoformat(time_str)

                date_part = dt_obj_naive.date()
                hour_part_str = dt_obj_naive.strftime("%H:00") # 시간 단위로 저장 (00:00, 01:00 등)

                # 위치 시간대 기준의 어제/오늘 날짜와 비교
                if date_part == yesterday_calendar_date:
                    yesterday_hourly_temps_map[hour_part_str] = temp
                elif date_part == today_calendar_date:
                    today_hourly_temps_map[hour_part_str] = temp
                # 다른 날짜 데이터는 무시 (요청 범위가 어제/오늘이므로 거의 없을 것으로 예상)

            except (ValueError, TypeError) as e:
                # 타임스탬프나 온도를 파싱하는 중 오류 발생 시 해당 항목은 건너뜁니다.
                print(f"경고: 시간 데이터 '{time_str}' 또는 온도 값 '{temp}' 파싱 실패: {e}") # 또는 로깅

        # 5. 비교 데이터 리스트 생성 (00:00부터 23:00까지 고정)
        comparison_data = []
        for hour in range(24):
            hour_str = f"{hour:02}:00" # "00:00", "01:00", ..., "23:00"
            comparison_data.append({
                "hour": hour_str,
                # 맵에서 해당 시간의 기온 값을 가져옵니다. 값이 없으면 None이 됩니다.
                "yesterdayTemp": yesterday_hourly_temps_map.get(hour_str),
                "todayTemp": today_hourly_temps_map.get(hour_str),
            })

        return comparison_data

    except httpx.HTTPStatusError as e:
         # API 요청 실패 (메인 데이터 요청 중 발생)
         raise HTTPException(status_code=e.response.status_code, detail=f"날씨 API 요청 실패: {e.response.status_code} - {e.response.text}")
    except ValueError as e:
         # 데이터 구조 오류 등
         raise HTTPException(status_code=500, detail=f"시간별 온도 데이터 파싱 또는 구조 오류: {e}")
    except RuntimeError as e:
         # 시간대 처리, 데이터 슬라이싱/분류 로직 오류 등
         raise HTTPException(status_code=500, detail=f"시간별 온도 데이터 처리 로직 오류: {e}")
    except Exception as e:
        # 기타 예상치 못한 오류
        raise HTTPException(status_code=500, detail=f"시간별 온도 데이터 처리 중 예기치 않은 오류 발생: {str(e)}")
    