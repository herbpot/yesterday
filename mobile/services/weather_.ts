import { PermissionsAndroid, Platform, Linking, Alert } from "react-native";
import Geolocation from "react-native-geolocation-service";


export async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const grantedFine = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "위치 정보 접근 권한",
          message: "현재 위치의 날씨 정보를 제공하기 위해 위치 정보 접근 권한이 필요합니다.",
          buttonNeutral: "나중에",
          buttonNegative: "거절",
          buttonPositive: "허용",
        }
      );
      if (grantedFine === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("ACCESS_FINE_LOCATION 권한 획득");
        if (Platform.Version >= 29) { // Android 10 이상인 경우 백그라운드 위치 권한 안내
          Alert.alert(
            "백그라운드 위치 권한 안내",
            "위젯이 백그라운드에서도 날씨를 정확하게 업데이트하려면, 앱 설정에서 위치 권한을 '항상 허용'으로 변경해야 할 수 있습니다.",
            [
              { text: "알겠습니다" },
              { text: "설정으로 이동", onPress: () => Linking.openSettings() } // 사용자를 앱 설정 화면으로 안내
            ]
          );
        }
        return true;
      } else {
        console.log("ACCESS_FINE_LOCATION 권한 거부됨");
        Alert.alert("권한 거부됨", "위치 정보 접근 권한이 거부되어 날씨 정보를 정확히 가져올 수 없습니다.");
        return false;
      }
    } catch (err) {
      console.warn(err);
      return false; 
    }
  } else if (Platform.OS === 'ios') {
    // iOS의 경우 Info.plist에 다음 키와 설명 문자열을 추가해야 합니다:
    // - NSLocationWhenInUseUsageDescription (앱 사용 중 위치 접근)
    // - NSLocationAlwaysAndWhenInUseUsageDescription (항상 위치 접근 - 백그라운드용)
    const status = await Geolocation.requestAuthorization('always'); // 'always' 또는 'whenInUse'
    console.log('iOS 위치 권한 상태:', status);
    if (status === 'denied') {
        Alert.alert("권한 거부됨", "위치 정보 접근 권한이 거부되어 날씨 정보를 정확히 가져올 수 없습니다. 앱 설정에서 변경해주세요.");
        return false;
    } else if (status === 'granted') {
        console.log('iOS 위치 권한 획득 (항상 또는 사용 중)');
        return true;
    }
  }
  return false; // 다른 플랫폼에서는 권한 요청을 하지 않음
}


export async function getCoords(): Promise<LocationCoords | null> {
  if (Platform.OS === 'android') {
    // 1. ACCESS_FINE_LOCATION 권한 확인
    const hasFineLocationPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );

    if (!hasFineLocationPermission) {
      console.error(
        '[getCoords] ACCESS_FINE_LOCATION 권한이 없습니다. ' +
        '위젯이 정확히 동작하려면 앱을 실행하여 위치 권한을 먼저 허용해야 합니다.'
      );
      // 위젯 컨텍스트에서는 UI를 통한 즉각적인 권한 요청이 어렵고 바람직하지 않습니다.
      // 앱 실행 시 권한을 받도록 유도해야 합니다.
      return null;
    }

    // 2. ACCESS_BACKGROUND_LOCATION 권한 확인 (Android 10 이상)
    // 이 권한이 없으면 앱이 실제로 백그라운드 상태일 때 위치 정보를 가져오지 못할 수 있습니다.
    if (Platform.Version >= 29) { // Android 10 (Q)
      const hasBackgroundLocationPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
      );
      if (!hasBackgroundLocationPermission) {
        console.warn(
          '[getCoords] ACCESS_BACKGROUND_LOCATION 권한이 없습니다. ' +
          '앱이 백그라운드에 있을 때 위젯 업데이트를 위한 위치 정보 접근이 제한될 수 있습니다. ' +
          '최상의 경험을 위해 앱 설정에서 위치 권한을 "항상 허용"으로 변경해주세요.'
        );
        // 백그라운드 권한이 없더라도 일단 위치 정보 가져오기를 시도합니다.
        // OS 정책이나 앱 상태에 따라 성공할 수도, 실패할 수도 있습니다.
      }
    }
  } else if (Platform.OS === 'ios') {
    // iOS의 경우, Geolocation.requestAuthorization('always' 또는 'whenInUse')를 호출하여 권한을 요청하고,
    // Info.plist에 NSLocationWhenInUseUsageDescription 와 NSCLocationAlwaysAndWhenInUseUsageDescription 키를 추가해야 합니다.
    // getCoords 함수 호출 전에 앱 로직에서 권한 상태를 확인하고 관리하는 것이 좋습니다.
    const iosAuthStatus = await Geolocation.requestAuthorization('whenInUse'); // 또는 'always'
    if (iosAuthStatus !== 'granted' && iosAuthStatus !== 'restricted') { // restricted는 부모 통제 등
        console.warn('[getCoords] iOS 위치 권한이 충분하지 않습니다:', iosAuthStatus);
        // return null; // iOS에서는 권한 상태에 따라 다르게 처리 가능
    }
  }

  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('[getCoords] 위치 정보 가져오기 성공:', { latitude, longitude });
        resolve({ lat: latitude, lon: longitude });
      },
      (error) => {
        console.error('[getCoords] 위치 정보 가져오기 실패:', error.code, error.message);
        // error.code (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT, PLAY_SERVICES_NOT_AVAILABLE 등)
        resolve(null); // 실패 시 null 반환
      },
      {
        enableHighAccuracy: true,   // 높은 정확도 요청 (배터리 소모는 약간 더 클 수 있음)
        timeout: 15000,             // 위치 요청 타임아웃 (15초)
        maximumAge: 1000 * 60 * 5,  // 5분 이내의 캐시된 위치 정보 사용 허용 (0으로 하면 항상 새로고침)
                                    // 위젯 업데이트 간격에 맞춰 조절 가능
        showLocationDialog: false,  // (Android) 위치 서비스 비활성화 시 설정 다이얼로그 표시 안함 (위젯에서는 false 권장)
      }
    );
  });
}

const openMeteoURL = (lat: number, lon: number) =>
  `${process.env.EXPO_PUBLIC_API_BASE}meteo-weather/weather?lat=${lat}&lon=${lon}`;

const gethourlyData = (lat: number, lon: number) => 
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

export async function fetchWeather(coords: LocationCoords | null): Promise<ParsedWeatherResponse> {
  if (!coords) {
    throw new Error("위치 정보가 없습니다. 먼저 위치 권한을 확인해주세요.");
  }
  try {
    const url = openMeteoURL(coords.lat, coords.lon)
    console.log("날씨 데이터 요청 URL:", url);
    const res = await fetch(url);
    if (!res.ok) throw new Error("날씨 데이터를 불러오지 못했습니다.");
    
    const url_ = openMeteoURL(coords.lat, coords.lon)
    console.log("시간별 날씨 데이터 요청 URL:", url_);
    const res_ = await fetch(url_);
    if (!res.ok) throw new Error("시간별 날씨 데이터를 불러오지 못했습니다.");
    return {"weather": (await res.json() as ParsedWeather), "hourlyWeather": (await res_.json() as ParsedHourlyWeather)};
  } catch (error: Error | any) {
    console.error("날씨 데이터 요청 실패:", error.message);
    throw error;
  }
}

/* ────────────────────────────────  단계 3  응답 파싱  ──────────────────────────────── */
export type ParsedWeatherResponse = {
  weather: ParsedWeather;
  hourlyWeather: ParsedHourlyWeather;
};

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

export type ParsedHourlyWeather = {
  todayHourlyData: HourlyData[];
  yesterdayHourlyData: HourlyData[];
}

export type HourlyData = {
  hour: string; // 예: "00", "06", "12", "18" 등 시간 레이블
  temp: number;
};

export type LocationCoords = {
  lat: number;
  lon: number;
}