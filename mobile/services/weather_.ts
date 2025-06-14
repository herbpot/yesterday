import * as Location from "expo-location";

export async function getCoords(): Promise<Location.LocationObjectCoords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("위치 권한이 필요합니다.");
  const { coords } = await Location.getCurrentPositionAsync({});
  return coords;
}

const openMeteoURL = (lat: number, lon: number) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,uv_index,apparent_temperature&current_weather=true&timezone=auto`;

const codeToKey = (code: number, isDay: 0 | 1): string => {
  /* Open-Meteo WMO weather-code → 이미지 자원 키 맵 */
  const table: Record<number, string> = {
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
  };
  const key = table[code] ?? "unknown";
  return `${key}_${isDay ? "day" : "night"}`;
};

export const WEATHER_IMAGES: Record<string, string> = {
  clear_day:   "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2600.png", // ☀️
  clear_night: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f319.png", // 🌙
  cloudy:      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26c5.png", // 🌤️
  overcast:    "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2601.png", // ☁️
  rain:        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f327.png", // 🌧️
  snow:        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f328.png", // 🌨️
  thunder:     "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26c8.png", // ⛈️
};

export async function fetchWeather(coords: Location.LocationObjectCoords) {
  try {
    const url = openMeteoURL(coords.latitude, coords.longitude)
    console.log("날씨 데이터 요청 URL:", url);
    const res = await fetch(url);
    if (!res.ok) throw new Error("날씨 데이터를 불러오지 못했습니다.");
    return res.json();
  } catch (error: Error | any) {
    console.error("날씨 데이터 요청 실패:", error.message);
    throw new Error("날씨 데이터를 불러오지 못했습니다. fetchError");
  }
}

/* ────────────────────────────────  단계 3  응답 파싱  ──────────────────────────────── */
export type ParsedWeather = {
  imageKey: string;
  todayTemp: number;
  yesterdayTemp: number;
  humidity: number;
  humidityY: number;
  uv: number;
  uvY: number;
  feels: number;
  feelsY: number;
};

export function parseWeather(j: any): ParsedWeather {
  const {
    current_weather: { weathercode, is_day },
    hourly,
  } = j;

  const last = hourly.time.length - 1;          // 현재 시각 index
  const yesterdaySameHour = last - 24;         // 어제 동일 시각 index

  return {
    imageKey: codeToKey(weathercode, is_day),
    todayTemp: hourly.temperature_2m[last],
    yesterdayTemp: hourly.temperature_2m[yesterdaySameHour],
    humidity: hourly.relativehumidity_2m[last],
    humidityY: hourly.relativehumidity_2m[yesterdaySameHour],
    uv: hourly.uv_index[last],
    uvY: hourly.uv_index[yesterdaySameHour],
    feels: hourly.apparent_temperature[last],
    feelsY: hourly.apparent_temperature[yesterdaySameHour],
  };
}