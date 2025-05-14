// services/weather.ts
// ────────────────────────────────────────────────────────────────
// 어제보다 API v1 연동 모듈
//  - GET /compare   : 현재 vs 어제 같은 시각 기온차
//  - GET /extremes  : 오늘·어제 최고‧최저 비교
//  - POST /register_token, /notify_daily → 별도 모듈에서 다루는 것을 권장
// ────────────────────────────────────────────────────────────────
import * as Location from "expo-location";

const DEFAULT_DEV_URL = "http://localhost:8080";
const DEFAULT_PROD_URL = "https://tempdiff.vercel.app/api";

// 📌 .env(또는 app.config.ts 의 extra)에 `EXPO_PUBLIC_API_BASE` 지정 가능
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ??
  (__DEV__ ? DEFAULT_DEV_URL : DEFAULT_PROD_URL);

// ─── 타입 정의 ───────────────────────────────────────────────────
export interface CompareResult {
  now: number;        // 현재 시각(°C)
  yesterday: number;  // 어제 같은 시각(°C)
  delta: number;      // now − yesterday
}

export interface ExtremesResult {
  today_max: number;
  today_min: number;
  yest_max: number;
  yest_min: number;
  delta_max: number;  // today_max − yest_max
  delta_min: number;  // today_min − yest_min
}

// ─── 내부 유틸: 사용자 좌표 가져오기 ──────────────────────────────
async function getCoords(): Promise<{ lat: number; lon: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("위치 권한이 거부되었습니다."); // UI에서 Toast 등으로 안내
  }
  const loc = await Location.getCurrentPositionAsync({});
  return {
    lat: +loc.coords.latitude.toFixed(6),
    lon: +loc.coords.longitude.toFixed(6),
  };
}

// ─── 공통 fetch 래퍼: 에러·상태코드·CORS 처리 ───────────────────
async function apiGet<T>(path: string, query: Record<string, any>): Promise<T> {
  const q = new URLSearchParams(query).toString();
  const res = await fetch(`${API_BASE}${path}?${q}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    // API 명세: 400, 503 등 반환 → 그대로 throw
    const body = await res.text();
    throw new Error(
      `API 오류 (${res.status}): ${body || res.statusText || "Unknown"}`
    );
  }
  return (await res.json()) as T;
}

// ─── 1) 현재 vs 어제 같은 시각 비교 ───────────────────────────────
export async function fetchCompare(): Promise<CompareResult> {
  const { lat, lon } = await getCoords();
  return await apiGet<CompareResult>("/compare", { lat, lon });
}

// ─── 2) 최고·최저 기온 비교 ─────────────────────────────────────
export async function fetchExtremes(): Promise<ExtremesResult> {
  const { lat, lon } = await getCoords();
  return await apiGet<ExtremesResult>("/extremes", { lat, lon });
}

// ─── 3) 캐싱(선택) ────────────────────────────────────────────────
// 요구 사항(TTL): /compare 10분, /extremes 1시간
// → 전체 앱 규모가 커지면 SWR(react-query) 캐시 레이어에 통합 권장
