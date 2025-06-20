from fastapi import APIRouter, HTTPException, Query
import httpx
from typing import Literal

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
    return (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"hourly=temperature_2m,relativehumidity_2m,uv_index,apparent_temperature&"
        f"current_weather=true&timezone=auto"
    )


@app.get("/weather")
async def get_weather(lat: float = Query(...), lon: float = Query(...)):
    try:
        url = build_weather_url(lat, lon)
        async with httpx.AsyncClient() as client:
            res = await client.get(url)
            if res.status_code != 200:
                raise HTTPException(status_code=500, detail="날씨 API 요청 실패")
            data = res.json()

        return parse_weather(data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"날씨 데이터 파싱 실패: {str(e)}")


def parse_weather(j: dict):
    try:
        current = j["current_weather"]
        hourly = j["hourly"]
        last = len(hourly["time"]) - 1
        yest = last - 24

        weather_code = current["weathercode"]
        is_day = current["is_day"]

        image_key = code_to_key(weather_code, is_day)

        return {
            "imageKey": image_key,
            "imageURL": WEATHER_IMAGES.get(image_key, ""),
            "todayTemp": hourly["temperature_2m"][last],
            "yesterdayTemp": hourly["temperature_2m"][yest],
            "humidity": hourly["relativehumidity_2m"][last],
            "humidityY": hourly["relativehumidity_2m"][yest],
            "uv": hourly["uv_index"][last],
            "uvY": hourly["uv_index"][yest],
            "feels": hourly["apparent_temperature"][last],
            "feelsY": hourly["apparent_temperature"][yest],
        }
    except Exception as e:
        raise RuntimeError(f"날씨 데이터 구조 오류: {str(e)}")
