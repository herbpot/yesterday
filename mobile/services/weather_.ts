import { PermissionsAndroid, Platform, Linking } from "react-native";
import BackgroundFetch from "react-native-background-fetch";
import Geolocation from "react-native-geolocation-service";
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function ensureLocationPermission() {
  if (Platform.OS === 'android') {
    console.log("위치 권한 요청 중...");
    const fg = await PermissionsAndroid.requestMultiple(
      [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      ],
    );
    console.log(fg)
  }
  return true;
}

export async function initBackgroundLocation() {
  // 퍼미션 (foreground + background)
  console.log("init background job")
  await BackgroundFetch.configure(
    { minimumFetchInterval: 10, enableHeadless: true },
    async taskId => {
      console.log("background locationion")
      Geolocation.getCurrentPosition(
        async pos => {
          await AsyncStorage.setItem(
            'userLocation',
            JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude })
          );
          console.log("background: ", pos)
          BackgroundFetch.finish(taskId);
        },
        err => {
          console.warn(err);
          BackgroundFetch.finish(taskId);
        },
        { accuracy: { android: 'low' }, timeout: 10000 }
      );
    },
    taskId => console.log(`timeout: ${taskId}`)
  );
  await BackgroundFetch.start();
}

export async function getCoords(): Promise<LocationCoords> {

  // const loc = await AsyncStorage.getItem('userLocation')
  // if (loc) { 
  //   console.log("저장된 위치 정보:", loc);
  //   return JSON.parse(loc) as LocationCoords;
  // }else {
  //   console.log("위치 정보가 없으므로 새로 요청합니다.");
    Geolocation.getCurrentPosition(async (pos) => {
      await AsyncStorage.setItem(
        'userLocation',
        JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      );
      console.log("gelolcation:", pos)
    });
    return JSON.parse(await AsyncStorage.getItem('userLocation')) as LocationCoords;
  // }
}

const openMeteoURL = (lat: number, lon: number) =>
  `${process.env.EXPO_PUBLIC_API_BASE}meteo-weather/weather?lat=${lat}&lon=${lon}`;

export const WEATHER_IMAGES: Record<string, string> = {
  clear_day:   "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2600.png", // ☀️
  clear_night: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f319.png", // 🌙
  cloudy:      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26c5.png", // 🌤️
  overcast:    "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2601.png", // ☁️
  rain:        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f327.png", // 🌧️
  snow:        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f328.png", // 🌨️
  thunder:     "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26c8.png", // ⛈️
};

export async function fetchWeather(coords: LocationCoords): Promise<ParsedWeather> {
  try {
    const url = openMeteoURL(coords.lat, coords.lon)
    console.log("날씨 데이터 요청 URL:", url);
    const res = await fetch(url);
    if (!res.ok) throw new Error("날씨 데이터를 불러오지 못했습니다.");
    return await res.json() as ParsedWeather;
  } catch (error: Error | any) {
    console.error("날씨 데이터 요청 실패:", error.message);
    throw error;
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

export type LocationCoords = {
  lat: number;
  lon: number;
}