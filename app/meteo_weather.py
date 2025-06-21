from fastapi import APIRouter, HTTPException, Query
import httpx
from typing import Literal, List, Dict, Any
from datetime import datetime, timedelta, timezone

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
        return "cloudy"

    # ④ 비·이슬비
    if code in (51, 53, 55, 61, 63, 65):
        return "rain"

    # ⑤ 눈
    if code in (71, 73, 75):
        return "snow"

    # ⑥ 천둥·우박
    if code in (95, 99):
        return "thunder"

    # ⑦ 알 수 없는 코드 → 기본(흐림)으로
    return "cloudy"


def build_weather_url(lat: float, lon: float) -> str:
    """현재 날씨 및 관련 데이터를 가져오기 위한 API URL을 생성합니다."""
    return (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"hourly=temperature_2m,relativehumidity_2m,uv_index,apparent_temperature&"
        f"current_weather=true&timezone=auto"
    )

def build_hourly_temperature_url(lat: float, lon: float) -> str:
     """시간별 기온 데이터를 가져오기 위한 API URL을 생성합니다."""
     # API는 일반적으로 'hourly=temperature_2m'만 요청해도 지난 7일 및 향후 3일의 시간별 데이터를 제공합니다.
     # 시간대는 'auto'로 설정하여 API가 자동으로 결정하도록 합니다.
     # 최소 48시간의 과거 데이터를 요청하기 위해 past_hours를 명시적으로 설정합니다.
     return (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"hourly=temperature_2m&" # 시간별 기온만 요청
        f"past_hours=48&" # 최소 48시간의 과거 데이터 요청
        f"timezone=auto" # 시간대 자동 설정
     )


@app.get("/weather")
async def get_weather(lat: float = Query(..., description="위도"), lon: float = Query(..., description="경도")):
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"날씨 데이터 파싱 또는 처리 실패: {str(e)}")


def parse_weather(j: dict):
    """API 응답 JSON에서 현재 날씨 데이터를 파싱합니다."""
    try:
        current = j.get("current_weather")
        hourly = j.get("hourly")

        if not current or not hourly or "time" not in hourly or "temperature_2m" not in hourly:
             raise ValueError("API에서 유효하지 않은 날씨 데이터 구조를 수신했습니다.")

        hourly_times = hourly["time"]
        hourly_temps = hourly["temperature_2m"]
        n = len(hourly_times)

        # 원본 로직은 마지막 시간 데이터와 24시간 전 데이터를 사용했습니다.
        # 데이터가 48시간 미만인 경우를 고려하여 인덱스 오류를 방지합니다.
        last_idx = n - 1
        yest_idx = max(0, n - 25) # 인덱스가 음수가 되지 않도록 함

        # 필요한 경우 데이터 가용성 확인
        today_temp = hourly_temps[last_idx] if 0 <= last_idx < n else None
        # yesterday_temp는 yest_idx가 유효하고 last_idx와 다르며, 해당 인덱스가 범위 내에 있을 때 가져옴
        yesterday_temp = hourly_temps[yest_idx] if 0 <= yest_idx < n and yest_idx != last_idx else None

        humidity = hourly["relativehumidity_2m"][last_idx] if 0 <= last_idx < n and "relativehumidity_2m" in hourly and len(hourly["relativehumidity_2m"]) > last_idx else None
        humidityY = hourly["relativehumidity_humidityY_2m"][yest_idx] if 0 <= yest_idx < n and yest_idx != last_idx and "relativehumidity_2m" in hourly and len(hourly["relativehumidity_2m"]) > yest_idx else None

        uv = hourly["uv_index"][last_idx] if 0 <= last_idx < n and "uv_index" in hourly and len(hourly["uv_index"]) > last_idx else None
        uvY = hourly["uv_index"][yest_idx] if 0 <= yest_idx < n and yest_idx != last_idx and "uv_index" in hourly and len(hourly["uv_index"]) > yest_idx else None

        feels = hourly["apparent_temperature"][last_idx] if 0 <= last_idx < n and "apparent_temperature" in hourly and len(hourly["apparent_temperature"]) > last_idx else None
        feelsY = hourly["apparent_temperature"][yest_idx] if 0 <= yest_idx < n and yest_idx != last_idx and "apparent_temperature" in hourly and len(hourly["apparent_temperature"]) > yest_idx else None


        weather_code = current.get("weathercode")
        is_day = current.get("is_day")

        # weathercode나 is_day가 누락된 경우 처리 (API 문서에 따르면 current_weather=true 시 항상 포함되어야 함)
        image_key = code_to_key(weather_code, is_day) if weather_code is not None and is_day is not None else "cloudy"


        return {
            "imageKey": image_key,
            "imageURL": WEATHER_IMAGES.get(image_key, ""),
            "todayTemp": today_temp,
            "yesterdayTemp": yesterday_temp,
            "humidity": humidity,
            "humidityY": humidityY,
            "uv": uv,
            "uvY": uvY,
            "feels": feels,
            "feelsY": feelsY,
        }
    except Exception as e:
        # 더 구체적인 메시지로 다시 발생시키거나 다르게 처리
        raise RuntimeError(f"날씨 데이터 구조 오류 또는 파싱 실패: {str(e)}")


# 시간별 온도 비교를 위한 새 엔드포인트
@app.get("/hourly-temperature")
async def get_hourly_temperature(lat: float = Query(..., description="위도"), lon: float = Query(..., description="경도")) -> List[Dict[str, Any]]:
    """
    어제와 오늘의 시간별 기온 데이터를 가져옵니다.

    Args:
        lat: 위도.
        lon: 경도.

    Returns:
        각 시간대별 어제와 오늘의 기온을 포함하는 딕셔너리 목록 (24개 항목).
        데이터가 없는 경우 해당 기온 값은 None이 됩니다.
    """
    try:
        url = build_hourly_temperature_url(lat, lon)
        async with httpx.AsyncClient() as client:
            res = await client.get(url)
            res.raise_for_status() # 4xx 또는 5xx 상태 코드에 대해 예외 발생
            data = res.json()

        # 시간별 데이터 파싱
        hourly_data = data.get("hourly")

        if not hourly_data or "time" not in hourly_data or "temperature_2m" not in hourly_data:
             raise ValueError("API에서 유효하지 않은 시간별 온도 데이터 구조를 수신했습니다.")

        hourly_times = hourly_data["time"]
        hourly_temps = hourly_data["temperature_2m"]

        n = len(hourly_times)

        # 어제와 오늘의 완전한 24시간 비교를 위해서는 최소 48시간 데이터가 필요합니다.
        if n < 48:
             # 데이터는 있지만 48시간 미만인 경우, 가능한 만큼만 처리하고 경고 로깅 또는 다른 처리를 고려할 수 있습니다.
             # 하지만 여기서는 명확히 48시간 데이터가 있다고 가정하고 마지막 48시간을 사용합니다.
             # 만약 API가 48시간 미만을 반환했다면, 여기서 오류를 발생시키는 것이 데이터를 오해하는 것보다 나을 수 있습니다.
             # 사용자 요청에 따라 오류 대신 None 처리를 하려면 이 부분을 수정해야 하지만, Open-Meteo API의 hourly=temperature_2m 요청은
             # 과거 7일 데이터를 제공하는 것이 일반적이므로 48시간은 항상 있을 가능성이 높습니다.
             # 그럼에도 불구하고, 48시간 미만인 경우에도 마지막 n시간 중 마지막 24시간과 그 이전 24시간을 비교할 수 있도록 로직을 수정할 수 있습니다.
             # 하지만 "어제와 오늘"이라는 명확한 구분은 48시간 데이터가 있을 때 가장 잘 적용됩니다.
             # 우선 48시간 미만이면 오류를 발생시키고, 필요하면 이 로직을 유연하게 수정하겠습니다.
              raise HTTPException(status_code=500, detail=f"시간별 온도 데이터를 충분히 가져오지 못했습니다. 최소 48시간 데이터가 필요합니다. 현재: {n} 시간 데이터만 사용 가능합니다.")


        # 마지막 48시간의 데이터를 추출합니다.
        # API는 시간 순서대로 데이터를 반환합니다.
        # 마지막 24시간은 오늘, 그 이전 24시간은 어제입니다.
        # 인덱스는 -48부터 -1까지 (총 48개)
        # 어제 데이터: -48부터 -25까지 (24개)
        # 오늘 데이터: -24부터 -1까지 (24개)
        yesterday_times = hourly_times[-48:-24]
        yesterday_temps = hourly_temps[-48:-24]

        today_times = hourly_times[-24:] # 이것은 hourly_times[-24:n] 와 동일하며, 마지막 24개 요소입니다.
        today_temps = hourly_temps[-24:]


        comparison_data = []
        # 어제와 오늘의 24시간 데이터가 있다고 가정하고 24번 반복합니다.
        # 위에서 n >= 48을 확인했으므로 yesterday_times, yesterday_temps, today_times, today_temps는
        # 각각 정확히 24개의 요소를 가져야 합니다. 따라서 인덱스 오류는 발생하지 않아야 합니다.
        # 하지만 API 응답 구조가 예상과 다를 가능성을 고려하여 안전하게 None 처리를 추가합니다.
        num_hours_to_compare = min(len(yesterday_times), len(today_times)) # 비교할 수 있는 최소 길이

        for i in range(num_hours_to_compare):
            hour_str_today = None
            yesterday_temp_val = None
            today_temp_val = None

            try:
                 # 'T' 뒤의 시간 부분 추출
                 hour_str_today = today_times[i].split('T')[1]
            except (IndexError, AttributeError, TypeError, ValueError):
                 # 시간 문자열 파싱 오류 - 이 경우 해당 항목의 시간 키를 None으로 둘 수 있습니다.
                 # 또는 이 항목 자체를 건너뛰는 것을 고려할 수 있으나, 사용자 요청에 따라 None 처리.
                 hour_str_today = None # 시간 파싱 실패 시 None

            try:
                 yesterday_temp_val = yesterday_temps[i]
            except (IndexError, TypeError):
                 # 어제 온도 데이터 접근 오류 - 해당 값만 None 처리
                 yesterday_temp_val = None

            try:
                 today_temp_val = today_temps[i]
            except (IndexError, TypeError):
                 # 오늘 온도 데이터 접근 오류 - 해당 값만 None 처리
                 today_temp_val = None

            # 시간 파싱에 실패했더라도 항목 자체는 추가합니다.
            comparison_data.append({
                 "hour": hour_str_today,
                 "yesterdayTemp": yesterday_temp_val,
                 "todayTemp": today_temp_val
            })

        # API가 정확히 48시간을 반환했다면, num_hours_to_compare는 24가 되어
        # comparison_data에 24개의 항목이 추가됩니다.
        # 만약 어떤 이유로 48시간 미만 (예: 47시간) 데이터가 반환되었다면,
        # num_hours_to_compare는 23이 되어 23개의 항목만 생성될 수 있습니다.
        # 사용자 요청의 '빈 부분이 없어야 합니다'는 '각 시간대별로 항목이 있어야 한다'는 의미로 해석하여,
        # 항상 24개의 항목을 반환하도록 강제하는 것이 사용자 의도에 더 맞을 수 있습니다.
        # API가 최소 48시간을 반환한다고 강하게 가정하고 24번 반복하는 것으로 변경하겠습니다.
        # 만약 실제 API 응답이 48시간 미만이고 이로 인해 IndexError가 발생하면,
        # try-except 블록이 None으로 처리해 줄 것입니다.

        comparison_data_fixed_length = []
        for i in range(24): # 항상 24번 반복하여 24시간 데이터 구조를 만듭니다.
             hour_str_today = None
             yesterday_temp_val = None
             today_temp_val = None

             try:
                  # today_times[-24:]의 i번째 요소에서 시간을 가져옵니다.
                  # i는 0부터 23까지입니다.
                  # today_times의 길이가 24 미만이면 IndexError가 발생할 수 있습니다.
                  if -24 + i >= -len(today_times): # today_times 리스트의 유효한 인덱스인지 확인
                     hour_str_today = today_times[-24 + i].split('T')[1]
                  else:
                     # 해당 시간대의 데이터가 오늘 시간에 아예 없는 경우 (매우 드물지만)
                     hour_str_today = f"{i:02}:00" # 대략적인 시간 표시라도 추가

             except (IndexError, AttributeError, TypeError, ValueError):
                  # 시간 문자열 파싱 오류
                  hour_str_today = None

             try:
                  # yesterday_temps[-48:-24]의 i번째 요소에서 온도를 가져옵니다.
                  # i는 0부터 23까지입니다.
                  # yesterday_temps의 길이가 24 미만이면 IndexError가 발생할 수 있습니다.
                  if -24 + i >= -len(yesterday_temps): # yesterday_temps 리스트의 유효한 인덱스인지 확인
                      yesterday_temp_val = yesterday_temps[-24 + i]
                  else:
                       yesterday_temp_val = None # 데이터 없음

             except (IndexError, TypeError):
                  # 어제 온도 데이터 접근 오류
                  yesterday_temp_val = None

             try:
                  # today_temps[-24:]의 i번째 요소에서 온도를 가져옵니다.
                  # i는 0부터 23까지입니다.
                  # today_temps의 길이가 24 미만이면 IndexError가 발생할 수 있습니다.
                  if i < len(today_temps): # today_temps 리스트의 유효한 인덱스인지 확인
                      today_temp_val = today_temps[i]
                  else:
                      today_temp_val = None # 데이터 없음

             except (IndexError, TypeError):
                  # 오늘 온도 데이터 접근 오류
                  today_temp_val = None

             comparison_data_fixed_length.append({
                  "hour": hour_str_today,
                  "yesterdayTemp": yesterday_temp_val,
                  "todayTemp": today_temp_val
             })

        return comparison_data_fixed_length

    except httpx.HTTPStatusError as e:
         raise HTTPException(status_code=e.response.status_code, detail=f"날씨 API 요청 실패: {e.response.status_code} - {e.response.text}")
    except ValueError as e:
         raise HTTPException(status_code=500, detail=f"날씨 데이터 파싱 실패: {e}")
    except Exception as e:
        # 다른 예외 처리
        raise HTTPException(status_code=500, detail=f"시간별 온도 데이터 처리 실패: {str(e)}")