// App.tsx
import React, { useEffect, useState, memo, useCallback, useMemo } from "react";
import {
  StatusBar,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Dimensions // Dimensions import
} from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';
import { getCoords, fetchWeather, WEATHER_IMAGES, ensureLocationPermission } from "../services/weather_"; // 날씨 서비스

import TemperatureChart from './TemperatureChart'; // 차트 컴포넌트 import

// screenWidth 정의 (차트 컴포넌트와 통일)
const screenWidth = Dimensions.get('window').width;

const BANNER_ID = "ca-app-pub-4388792395765448/9451868044"; // 👉 실제 배포 시 실 광고 단위 ID로 교체

/* ───── API 헬퍼 ───── */
const nowDate =	new Date();
nowDate.setMonth(nowDate.getMonth() + 1);
const yesterdayDate = new Date(nowDate);
yesterdayDate.setDate(nowDate.getDate() - 1);
const pad = (n: number) => String(n).padStart(2, "0");

/* ───── 공통 Diff 배지 ───── */
type DiffProps = { diff: number; unit?: string };
// 이 컴포넌트는 이미 memo로 잘 감싸져 있습니다.
const DiffBadge = memo(({ diff, unit = "" }: DiffProps) => {
  // COLORS 정의 전에 사용되므로, COLORS 정의 위치를 옮기거나 전역 상수 파일에서 import 해야 합니다.
  // 예시에서는 COLORS 정의를 위로 옮기거나 아래에 그대로 두고 사용합니다.
  // 안전하게 사용하려면 COLORS를 상위 스코프나 별도 파일에 정의해야 합니다.
  const up = diff >= 0;
  return (
    <View
      style={[
        styles.badge,
        // COLORS가 이 스코프에서 접근 가능한지 확인 필요
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


/* ───── 2-열 카드 ───── */
type CardProps = { label: string; value: string; diff?: number; unit?: string };
// InfoCard를 React.memo로 감쌉니다.
const InfoCard = memo(({ label, value, diff, unit = "" }: CardProps) => (
  <View style={styles.card}>
    <Text style={styles.cardLabel}>{label}</Text>
    <Text style={styles.cardValue}>{value}</Text>
    {diff !== undefined && <DiffBadge diff={diff} unit={unit} />}
  </View>
));


/* ───── 메인 ───── */
export default function AppMain({navigation}: { navigation: any }) {
  /* 상태 */
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  /* 일별 최고기온 (현재 코드는 오늘 현재 기온, 어제 최고 기온인 듯 합니다. 이름 변경 고려) */
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

  // 시간대별 기온 데이터 상태 추가 (weather_.ts에서 반환하는 데이터 형태에 맞춰 수정 필요)
  // 예시 데이터 구조: [{ hour: "00", temp: 10 }, { hour: "06", temp: 15 }, ...]
  const [todayHourlyData, setTodayHourlyData] = useState< { hour: string; temp: number; }[]>([]);
  const [yesterdayHourlyData, setYesterdayHourlyData] = useState<{ hour: string; temp: number; }[]>([]);


  /* ─── 데이터 로드 ─── */
  const loadWeather = async () => {
    try {
      setLoading(true);
      setErr(null);

      /* ➊ 위치 권한 & 좌표 */
      const coords = await getCoords();

      /* ➋ 날씨 API 호출 */
      console.log("날씨 데이터 요청 중...");
      console.log("좌표:", coords);
      // weather_.ts의 fetchWeather 함수가 시간대별 데이터를 포함하여 반환한다고 가정합니다.
      // 예: { ..., todayTemp: ..., yesterdayTemp: ..., todayHourlyData: [...], yesterdayHourlyData: [...] }
      const parsed = await fetchWeather(coords);
      const { weather, hourlyWeather } = parsed;
      console.log("날씨 데이터 응답:", weather, hourlyWeather);

      /* ➍ 상태 반영 */
      setImageKey(weather.imageKey);
      setToday(weather.todayTemp);
      setYesterday(weather.yesterdayTemp); // 이 yesterday 값은 어제의 최고 기온일 수 있습니다.
      setHumidity(weather.humidity);
      setHumidityY(weather.humidityY);
      setUv(weather.uv);
      setUvY(weather.uvY);
      setFeels(weather.feels);
      setFeelsY(weather.feelsY);

      // 시간대별 데이터 상태 반영
      setTodayHourlyData(hourlyWeather.todayHourlyData || []); // 데이터가 없을 경우 빈 배열
      setYesterdayHourlyData(hourlyWeather.yesterdayHourlyData || []); // 데이터가 없을 경우 빈 배열

    } catch (e: any) {
      setErr(e.message);
      // 에러 발생 시 차트 데이터도 초기화 (선택 사항)
      setTodayHourlyData([]);
      setYesterdayHourlyData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      console.log("앱 시작: 위치 권한 요청 및 초기화");
      console.log(await ensureLocationPermission());
      await loadWeather();
    }
    init();
  }, []);

  // navigation.navigate("Settings") 함수를 useCallback으로 메모이제이션
  const handleSettingsPress = useCallback(() => {
    navigation.navigate("Settings");
  }, [navigation]); // navigation 객체를 의존성 배열에 포함

  // ImageBackground source 객체를 useMemo로 메모이제이션
  const memoizedImageSource = useMemo(() => {
    const uri = WEATHER_IMAGES[imageKey];
    return uri ? { uri } : null;
  }, [imageKey]);


  const tempDiff =
    today !== null && yesterday !== null ? today - yesterday : undefined;

  /* ─── UI ─── */
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background, // COLORS가 이 스코프에서 접근 가능한지 확인 필요
        paddingTop: StatusBar.currentHeight || 0,
      }} >
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtnl}
          accessibilityLabel="알림설정"
          onPress={handleSettingsPress} // useMemoized 함수 사용
        >
          <Svg width={22} height={22} viewBox="0 0 48 48" fill={COLORS.text}> {/* COLORS 접근 확인 */}
            <Path d="M40.62,28.34l-.87-.7A2,2,0,0,1,39,26.08V18A15,15,0,0,0,26.91,3.29a3,3,0,0,0-5.81,0A15,15,0,0,0,9,18v8.08a2,2,0,0,1-.75,1.56l-.87.7a9,9,0,0,0-3.38,7V37a4,4,0,0,0,4,4h8.26a8,8,0,0,0,15.47,0H40a4,4,0,0,0,4-4V35.36A9,9,0,0,0,40.62,28.34ZM24,43a4,4,0,0,1-3.44-2h6.89A4,4,0,0,1,24,43Zm16-6H8V35.36a5,5,0,0,1,1.88-3.9l.87-.7A6,6,0,0,0,13,26.08V18a11,11,0,0,1,22,0v8.08a6,6,0,0,0,2.25,4.69l.87.7A5,5,0,0,1,40,35.36Z"/>
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>살짝더</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          accessibilityLabel="현재 위치로 새로고침"
          onPress={loadWeather} // loadWeather는 useCallback 불필요 (컴포넌트 외부에 정의됨)
        >
          <Svg width={22} height={22} viewBox="0 0 150 150" fill={COLORS.text}> {/* COLORS 접근 확인 */}
            <Path d="M16.08,59.26A8,8,0,0,1,0,59.26a59,59,0,0,1,97.13-45V8a8,8,0,1,1,16.08,0V33.35a8,8,0,0,1-8,8L80.82,43.62a8,8,0,1,1-1.44-15.95l8-.73A43,43,0,0,0,16.08,59.26Zm22.77,19.6a8,8,0,0,1,1.44,16l-10.08.91A42.95,42.95,0,0,0,102,63.86a8,8,0,0,1,16.08,0A59,59,0,0,1,22.3,110v4.18a8,8,0,0,1-16.08,0V89.14h0a8,8,0,0,1,7.29-8l25.31-2.3Z"/>
          </Svg>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.accent} /> {/* COLORS 접근 확인 */}
        </View>
      ) : err ? (
        <View style={styles.centerBox}>
          <Text style={styles.errText}>{err}</Text>
        </View>
      ) : (
        <View style={styles.body}>
          {/* 오늘·어제 기온 (현재 온도 표시) */}
          {/* <Text style={[FONTS.display, { color: COLORS.text }]}>오늘 기온</Text> */}
          <Text style={[FONTS.body, { color: COLORS.text }]}> {/* FONTS, COLORS 접근 확인 */}
            현재 : {today?.toFixed(1)}°C
          </Text>
          <Text style={[FONTS.body, { color: COLORS.text }]}> {/* FONTS, COLORS 접근 확인 */}
            어제 : {yesterday?.toFixed(1)}°C {/* 이 값이 어제의 최고 기온이라면 문구 수정 고려 */}
          </Text>
          {tempDiff !== undefined && <DiffBadge diff={tempDiff} unit="°C" />}

          {/* 이미지 */}
          <View style={styles.imgWrapper}>
            {memoizedImageSource && ( // useMemoized source 객체 사용
              <ImageBackground
                style={{ flex: 1 }}
                resizeMode="cover"
                source={memoizedImageSource}
              />
            )}
          </View>

          {/* !!! 기온 그래프 추가 !!! */}
          <TemperatureChart
            title="시간대별 기온"
            todayData={todayHourlyData}
            yesterdayData={yesterdayHourlyData}
          />
          {/* !!! 기온 그래프 추가 끝 !!! */}


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
      <View // Banner 영역
        style={{
          justifyContent:'space-between',
          // backgroundColor:'red', // 디버깅용 배경색 제거 또는 투명하게 변경
          alignItems:'center',
          // flex: 1, // 배너 영역에 flex:1을 주면 남은 공간을 다 차지하게 되어 레이아웃이 깨질 수 있습니다. 제거하거나 적절히 조절하세요.
          height: BannerAdSize.ANCHORED_ADAPTIVE_BANNER.height, // 배너 높이만큼 공간 확보
          width: '100%', // 부모 View 너비에 맞춤
          // marginBottom: someValue, // 필요시 하단 간격 추가
        }}
      >
      </View>
    </SafeAreaView>
      {/* SafeAreaView 바깥에 배너 광고를 두어 하단에 고정 */}
      {/* 배너 광고는 SafeAreaView 내부가 아닌 View 전체의 하단에 위치하는 것이 일반적입니다. */}
      <BannerAd
          unitId={BANNER_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            // requestOptions: {
            //   nonPersonalizedAdsOnly: true, // 비개인 맞춤 광고 설정 예시
            // },
          }}
          onAdFailedToLoad={(error) => console.error('광고 로드 실패:', error)}
          onAdLoaded={() => console.log('광고 로드 성공')}
        />
    </View>
  );
}

/* ───── 스타일 (AppMain 컴포넌트 정의보다 위로 옮기거나 별도 파일 관리 권장) ───── */
// DiffBadge에서 사용되므로 AppMain 함수 정의보다 위로 옮기거나
// 별도 constants 또는 styles 파일로 분리하여 import하는 것이 좋습니다.
const COLORS = {
  background: "#ECEFF1",
  text: "#1B1F23",
  accent: "#2563EB",
  positive: "#B91C1C", // 기온 상승 (붉은색)
  positiveBg: "#FEE2E2",
  negative: "#1E40AF", // 기온 하락 (푸른색)
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

// StyleSheet.create 결과는 안정적이므로 useMemo 필요 없음
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
  iconBtnl: { width: 48, alignItems: "flex-start" },

  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  errText: { color: "red" },

  body: {
    // flex: 1, // body에 flex:1을 주면 스크롤이 필요한 경우 문제가 될 수 있습니다. 컨텐츠 길이에 따라 자동 조절되도록 제거하거나 ScrollView를 사용하세요.
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 20, // 하단 배너와의 간격 확보
  },
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
    marginTop: 12, // 차트와의 간격 조절
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

  cta: { // 사용되지 않는 스타일? 필요시 활용
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