// App.tsx
import React, { useEffect, useState, memo } from "react";
import {
  StatusBar,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import * as Location from "expo-location";
import Svg, { Path } from "react-native-svg";
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';
import { transform } from "@babel/core";

const BANNER_ID = "ca-app-pub-4388792395765448/9451868044"; // 👉 실제 배포 시 실 광고 단위 ID로 교체

/* ───── API 헬퍼 ───── */
const nowDate =	new Date();
nowDate.setMonth(nowDate.getMonth() + 1);
const yesterdayDate = new Date(nowDate);
yesterdayDate.setDate(nowDate.getDate() - 1);
const pad = (n: number) => String(n).padStart(2, "0");

const openMeteoURL = (lat: number, lon: number) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
  `&current_weather=true&hourly=relativehumidity_2m,uv_index,apparent_temperature,temperature_2m&start_date=${yesterdayDate.getUTCFullYear()}-${pad(yesterdayDate.getUTCMonth())}-${pad(yesterdayDate.getUTCDate())}&end_date=${nowDate.getUTCFullYear()}-${pad(nowDate.getUTCMonth())}-${pad(nowDate.getUTCDate())}`;

/* ───── 공통 Diff 배지 ───── */
type DiffProps = { diff: number; unit?: string };
const DiffBadge = memo(({ diff, unit = "" }: DiffProps) => {
  const up = diff >= 0;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: up ? COLORS.positiveBg : COLORS.negativeBg },
      ]}
    >
      <Svg width={12} height={12} viewBox="0 0 24 24" fill={up ? COLORS.positive : COLORS.negative}>
        <Path d={up ? "M12 4l6 8H6z" : "M12 20l-6-8h12z"} />
      </Svg>
      <Text
        style={[
          styles.badgeText,
          { color: up ? COLORS.positive : COLORS.negative },
        ]}
      >
        {up ? "+" : ""}
        {Math.abs(diff).toFixed(1)}
        {unit}
      </Text>
    </View>
  );
});

const WEATHER_IMAGES: Record<string, string> = {
  clear_day:   "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2600.png", // ☀️
  clear_night: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f319.png", // 🌙
  cloudy:      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26c5.png", // 🌤️
  overcast:    "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2601.png", // ☁️
  rain:        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f327.png", // 🌧️
  snow:        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f328.png", // 🌨️
  thunder:     "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26c8.png", // ⛈️
};

/* weathercode 그룹핑 */
const codeToKey = (code: number, isDay: number): keyof typeof WEATHER_IMAGES => {
  if (code === 0) return isDay ? "clear_day" : "clear_night"; // 맑음
  if (code <= 3) return "cloudy"; // 부분적으로 흐림
  if (code <= 45) return "overcast"; // 안개·짙은 안개
  if (code <= 67) return "snow"; // 눈/진눈깨비
  if (code <= 77) return "overcast"; // 서리·싸락눈
  if (code <= 86) return "snow"; // 눈
  if (code <= 99) return "thunder"; // 뇌우
  return "rain"; // 비 포함 나머지
};

/* ───── 2-열 카드 ───── */
type CardProps = { label: string; value: string; diff?: number; unit?: string };
const InfoCard = ({ label, value, diff, unit = "" }: CardProps) => (
  <View style={styles.card}>
    <Text style={styles.cardLabel}>{label}</Text>
    <Text style={styles.cardValue}>{value}</Text>
    {diff !== undefined && <DiffBadge diff={diff} unit={unit} />}
  </View>
);

/* ───── 메인 ───── */
export default function AppMain({navigation}: { navigation: any }) {
  /* 상태 */
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  /* 일별 최고기온 */
  const [today, setToday] = useState<number | null>(null);
  const [yesterday, setYesterday] = useState<number | null>(null);

  /* 실시간 지표 + 어제 동시간대 지표 */
  const [humidity, setHumidity] = useState<number | null>(null);
  const [humidityY, setHumidityY] = useState<number | null>(null);

  const [uv, setUv] = useState<number | null>(null);
  const [uvY, setUvY] = useState<number | null>(null);

  const [feels, setFeels] = useState<number | null>(null);
  const [feelsY, setFeelsY] = useState<number | null>(null);

		const [imageKey, setImageKey] = useState<keyof typeof WEATHER_IMAGES>("clear_day");

  /* ─── 데이터 로드 ─── */
  const loadWeather = async () => {
    try {
      setLoading(true);
      setErr(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error("위치 권한이 필요합니다.");

      const { coords } = await Location.getCurrentPositionAsync({});
      const res = await fetch(openMeteoURL(coords.latitude, coords.longitude));
      const j = await res.json();

						const { weathercode, is_day } = j.current_weather;
      setImageKey(codeToKey(weathercode, is_day));

      /* 일별 최고기온 */
      const idxT = j.hourly.time.length - 1;
      const idxY = idxT - 24;
      setToday(j.hourly.temperature_2m[idxT]);
      setYesterday(j.hourly.temperature_2m[idxY]);

      /* 시간 배열 = 오늘 + 어제 (24 h × 2) */
      const last = j.hourly.time.length - 1; // 현재 시각 index
      const yesterdaySameHour = last - 24;

      setHumidity(j.hourly.relativehumidity_2m[last]);
      setHumidityY(j.hourly.relativehumidity_2m[yesterdaySameHour]);

      setUv(j.hourly.uv_index[last]);
      setUvY(j.hourly.uv_index[yesterdaySameHour]);

      setFeels(j.hourly.apparent_temperature[last]);
      setFeelsY(j.hourly.apparent_temperature[yesterdaySameHour]);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, []);

  const tempDiff =
    today !== null && yesterday !== null ? today - yesterday : undefined;

  /* ─── UI ─── */
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: StatusBar.currentHeight || 0,
      }} >
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          accessibilityLabel="알림설정"
          onPress={() => navigation.navigate("Settings")}
        >
          <Svg width={22} height={22} viewBox="0 0 48 48" fill={COLORS.text}>
            <Path d="M40.62,28.34l-.87-.7A2,2,0,0,1,39,26.08V18A15,15,0,0,0,26.91,3.29a3,3,0,0,0-5.81,0A15,15,0,0,0,9,18v8.08a2,2,0,0,1-.75,1.56l-.87.7a9,9,0,0,0-3.38,7V37a4,4,0,0,0,4,4h8.26a8,8,0,0,0,15.47,0H40a4,4,0,0,0,4-4V35.36A9,9,0,0,0,40.62,28.34ZM24,43a4,4,0,0,1-3.44-2h6.89A4,4,0,0,1,24,43Zm16-6H8V35.36a5,5,0,0,1,1.88-3.9l.87-.7A6,6,0,0,0,13,26.08V18a11,11,0,0,1,22,0v8.08a6,6,0,0,0,2.25,4.69l.87.7A5,5,0,0,1,40,35.36Z"/>
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>살짝더</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          accessibilityLabel="현재 위치로 새로고침"
          onPress={loadWeather}
        >
          <Svg width={22} height={22} viewBox="0 0 150 150" fill={COLORS.text}>
            <Path d="M16.08,59.26A8,8,0,0,1,0,59.26a59,59,0,0,1,97.13-45V8a8,8,0,1,1,16.08,0V33.35a8,8,0,0,1-8,8L80.82,43.62a8,8,0,1,1-1.44-15.95l8-.73A43,43,0,0,0,16.08,59.26Zm22.77,19.6a8,8,0,0,1,1.44,16l-10.08.91A42.95,42.95,0,0,0,102,63.86a8,8,0,0,1,16.08,0A59,59,0,0,1,22.3,110v4.18a8,8,0,0,1-16.08,0V89.14h0a8,8,0,0,1,7.29-8l25.31-2.3Z"/>
          </Svg>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : err ? (
        <View style={styles.centerBox}>
          <Text style={styles.errText}>{err}</Text>
        </View>
      ) : (
        <View style={styles.body}>
          {/* 오늘·어제 기온 */}
          {/* <Text style={[FONTS.display, { color: COLORS.text }]}>오늘 기온</Text> */}
          <Text style={[FONTS.body, { color: COLORS.text }]}>
            현재&nbsp;:&nbsp;{today?.toFixed(1)}°C
          </Text>
          <Text style={[FONTS.body, { color: COLORS.text }]}>
            어제&nbsp;:&nbsp;{yesterday?.toFixed(1)}°C
          </Text>
          {tempDiff !== undefined && <DiffBadge diff={tempDiff} unit="°C" />}

          {/* 이미지 */}
          <View style={styles.imgWrapper}>
            <ImageBackground
              style={{ flex: 1 }}
              resizeMode="cover"
              source={{ uri: WEATHER_IMAGES[imageKey] }}
            />
          </View>

          {/* 2-열 카드 */}
          <View style={styles.infoGrid}>
            {humidity !== null && humidityY !== null && (
              <InfoCard
                label="습도"
                value={`${humidity.toFixed(0)} %`}
                diff={humidity - humidityY}
                unit="%"
              />
            )}
            {uv !== null && uvY !== null && (
              <InfoCard
                label="UV 지수"
                value={uv.toFixed(1)}
                diff={uv - uvY}
              />
            )}
            {feels !== null && feelsY !== null && (
              <InfoCard
                label="체감"
                value={`${feels.toFixed(1)}°C`}
                diff={feels - feelsY}
                unit="°C"
              />
            )}
          </View>
        </View>
      )}
      <View // Banner
        style={{
          justifyContent:'space-between',
          backgroundColor:'red',
          alignItems:'center'
        }}
      >
      </View>
    </SafeAreaView>
      <BannerAd
          unitId={BANNER_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        />
    </View>
  );
}

/* ───── 스타일 ───── */
const COLORS = {
  background: "#ECEFF1",
  text: "#1B1F23",
  accent: "#2563EB",
  positive: "#B91C1C",
  positiveBg: "#FEE2E2",
  negative: "#1E40AF",
  negativeBg: "#DBEAFE",
};

const FONTS = {
  display: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  body: { fontSize: 16, lineHeight: 24 },
};

const styles = StyleSheet.create({
  container: { 
			flex: 1, 
			backgroundColor: COLORS.background ,
		},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  iconBtn: { width: 48, alignItems: "flex-end" },

  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  errText: { color: "red" },

  body: { alignItems: "center", paddingHorizontal: 16 },
  imgWrapper: {
    width: "30%",
    maxWidth: 400,
    aspectRatio: 16 / 16,
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 24,
  },

  infoGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: "600", color: COLORS.text },

  cta: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  ctaTxt: { color: "#fff", fontWeight: "700" },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 4,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
});
