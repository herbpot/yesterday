import { PermissionsAndroid, Platform, Linking, Alert } from "react-native";
import BackgroundFetch from "react-native-background-fetch";
import Geolocation from "react-native-geolocation-service";
import AsyncStorage from "@react-native-async-storage/async-storage";


export async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    console.log("위치 권한 요청 중...");

    const permissions = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    ]);

    console.log('권한 요청 결과:', permissions);

    const fineLocation = permissions[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const backgroundLocation = permissions[PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION];

    // ⚠️ 1. 정밀 위치 권한이 '다시 묻지 않음' 상태일 경우
    if (fineLocation === 'never_ask_again') {
      Alert.alert(
        '위치 권한이 필요합니다',
        '앱이 정상적으로 작동하려면 위치 권한이 필요합니다. 설정 화면에서 직접 권한을 허용해 주세요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '설정 열기',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return false;
    }

    // ⚠️ 2. 백그라운드 위치 권한 거부됨
    if (backgroundLocation !== 'granted') {
      Alert.alert(
        '백그라운드 위치 권한 미허용',
        '일부 기능은 백그라운드 위치 권한이 필요할 수 있습니다.',
        [{ text: '확인' }]
      );
      // 권한 거부됐지만 강제 종료는 아님
    }

    // ✅ 최종적으로 권한이 모두 허용되었는지 확인
    return fineLocation === 'granted' && backgroundLocation === 'granted';
  }

  // Android가 아니라면 true 반환
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