// src/screens/AppMainScreen.tsx (기존 App.tsx 파일 이름 변경)
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  StatusBar,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  ScrollView,
  findNodeHandle // findNodeHandle import
} from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';

// 서비스 import
import { getCoords, fetchWeather, WEATHER_IMAGES, ensureLocationPermission } from "../services/weather_";

// 상수 import
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

// 컴포넌트 import
import DiffBadge from '../components/ui/DiffBadge';
import InfoCard from '../components/ui/InfoCard';
import TemperatureChart from '../components/weather/TemperatureChart';

// 스타일 import
import styles from '../styles/appMainStyles';


// screenWidth 정의
const screenWidth = Dimensions.get('window').width;
// 배너 광고의 대략적인 높이 (ANCHORED_ADAPTIVE_BANNER는 높이가 가변적일 수 있으므로, 보수적인 값 사용)
const APPROX_BANNER_HEIGHT = BannerAdSize.ANCHORED_ADAPTIVE_BANNER.height || 60;


const BANNER_ID = "ca-app-pub-4388792395765448/9451868044"; // 👉 실제 배포 시 실 광고 단위 ID로 교체 (상수로 이동 고려)

/* ───── API 헬퍼 (사용되지 않는 듯 합니다. 필요 없다면 제거) ───── */
/*
const nowDate =	new Date();
nowDate.setMonth(nowDate.getMonth() + 1);
const yesterdayDate = new Date(nowDate);
yesterdayDate.setDate(nowDate.getDate() - 1);
const pad = (n: number) => String(n).padStart(2, "0");
*/

/* ───── 메인 화면 컴포넌트 ───── */
export default function AppMain({navigation}: { navigation: any }) {
  /* 상태 */
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 초기 정보 표시용 기온 (현재 온도, 어제 특정 시각 기온으로 가정)
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

  // 시간대별 기온 데이터 상태 (변환된 형태)
  const [todayHourlyData, setTodayHourlyData] = useState< { hour: string; temp: number; }[]>([]);
  const [yesterdayHourlyData, setYesterdayHourlyData] = useState<{ hour: string; temp: number; }[]>([]);

  // ScrollView 및 주요 콘텐츠 Ref
  const scrollViewRef = useRef<ScrollView>(null);
  const bodyContentRef = useRef<View>(null); // 초기 날씨 정보 컨테이너 Ref (스크롤 위치 계산용)

  // 스크롤 위치 상태 (맨 위에 있는지 여부)
  const [isScrolledToTop, setIsScrolledToTop] = useState(true);


  /* ─── 데이터 로드 ─── */
  const loadWeather = async () => {
    try {
      setLoading(true);
      setErr(null);
      // 로드 시작 시 스크롤 버튼은 기본적으로 표시 상태로 설정
      setIsScrolledToTop(true);

      /* ➊ 위치 권한 & 좌표 */
      const coords = await getCoords();

      /* ➋ 날씨 API 호출 */
      console.log("날씨 데이터 요청 중...");
      console.log("좌표:", coords);
      // weather_.ts의 fetchWeather 함수가 { weather: {...}, hourlyWeather: [...] } 구조를 반환한다고 가정
      const parsed = await fetchWeather(coords);
      const { weather, hourlyWeather: rawHourlyData } = parsed;

      console.log("날씨 데이터 응답 (weather):", weather);
      console.log("날씨 데이터 응답 (hourlyWeather):", rawHourlyData);

      /* ➍ 상태 반영 */
      // weather 객체에서 개별 필드를 가져와 상태 업데이트
      if (weather) {
          setImageKey(weather.imageKey);
          setToday(weather.todayTemp);
          setYesterday(weather.yesterdayTemp);
          setHumidity(weather.humidity);
          setHumidityY(weather.humidityY);
          setUv(weather.uv);
          setUvY(weather.uvY);
          setFeels(weather.feels);
          setFeelsY(weather.feelsY);
      } else {
         console.error("weather 객체가 응답에 없습니다.");
         setErr("날씨 정보를 불러오는데 실패했습니다.");
      }


      // 제공된 JSON 구조를 기반으로 시간대별 데이터 변환
      if (Array.isArray(rawHourlyData)) {
          const transformedTodayData = rawHourlyData.map(item => ({
              hour: item.hour,
              temp: item.todayTemp,
          }));
          const transformedYesterdayData = rawHourlyData.map(item => ({
              hour: item.hour,
              temp: item.yesterdayTemp,
          }));

          console.log("오늘 시간대별 기온 데이터 (변환 후):", transformedTodayData);
          console.log("어제 시간대별 기온 데이터 (변환 후):", transformedYesterdayData);

          setTodayHourlyData(transformedTodayData);
          setYesterdayHourlyData(transformedYesterdayData);
      } else {
          console.error("hourlyWeather 데이터가 예상한 배열 형태가 아닙니다.", rawHourlyData);
          // 시간대별 데이터가 없을 경우 차트를 표시하지 않음
          setTodayHourlyData([]);
          setYesterdayHourlyData([]);
          // 에러 메시지는 weather 객체 없을 때만 표시하도록 분리 (필요시 조정)
      }


    } catch (e: any) {
      console.error("날씨 데이터 로드 중 오류 발생:", e);
      setErr(`날씨 데이터를 불러오는데 실패했습니다: ${e.message}`);
      // 에러 발생 시 모든 상태 초기화
      setToday(null);
      setYesterday(null);
      setHumidity(null);
      setHumidityY(null);
      setUv(null);
      setUvY(null);
      setFeels(null);
      setFeelsY(null);
      setImageKey("clear_day"); // 기본 이미지 키로 복원
      setTodayHourlyData([]);
      setYesterdayHourlyData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      console.log("앱 시작: 위치 권한 요청 및 초기화");
      // console.log(await ensureLocationPermission()); // 권한 요청 결과 로깅 (선택 사항)
      await loadWeather();
    }
    init();
  }, []); // 빈 의존성 배열: 마운트 시 한 번만 실행


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


  // ScrollView 스크롤 이벤트 핸들러
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    // 스크롤 위치가 거의 0이면 맨 위로 간주
    setIsScrolledToTop(offsetY < 10); // 약간의 오차 허용 (스크롤바가 미세하게 움직여도 0이 아닐 수 있음)
  }, []);

  // 아래쪽 화살표 버튼 클릭 핸들러 - bodyContentRef의 하단으로 스크롤
  const scrollToChart = useCallback(() => {
    // bodyContentRef의 높이를 측정하여 그만큼 스크롤
    bodyContentRef.current?.measureLayout(
      findNodeHandle(scrollViewRef.current!) || 0, // 스크롤 뷰 내에서의 위치 측정 기준 노드 (ScrollView 자신)
      (x, y, width, height) => {
        // y는 bodyContent의 ScrollView 내 Y좌표, height는 bodyContent의 높이
        // 따라서 y + height는 bodyContent 바로 다음 요소(차트)의 시작 Y좌표
        // 차트 상단에 약간의 여백을 두고 스크롤하려면 y + height + margin 값을 더해줍니다.
        scrollViewRef.current?.scrollTo({ y: y + height + (styles.scrollViewContent.paddingBottom as number || 0) + 10, animated: true }); // bodyContent 아래 패딩 + 약간의 여유 공간
      },
      (error: any) => {
        console.error("스크롤 위치 측정 실패:", error);
        // 측정 실패 시 ScrollView 끝까지 스크롤하는 대체 로직
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    );
  }, []); // 의존성 배열: 빈 배열 (ref는 변하지 않으므로)


  /* ─── UI ─── */
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: StatusBar.currentHeight || 0, // 상태바 높이 고려
      }} >
    {/* 전체 레이아웃은 SafeAreaView(헤더+스크롤영역)와 배너 컨테이너로 구성 */}
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtnl}
          accessibilityLabel="알림설정"
          onPress={handleSettingsPress}
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

      {/* 로딩 또는 에러 메시지 (스크롤 뷰 영역을 대체) */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : err ? (
        <View style={styles.centerBox}>
          <Text style={styles.errText}>{err}</Text>
        </View>
      ) : (
        /* 스크롤 가능한 콘텐츠 영역 */
        <ScrollView
           ref={scrollViewRef}
           onScroll={handleScroll} // 스크롤 이벤트 핸들러 연결
           scrollEventThrottle={16} // 스크롤 이벤트 발생 주기 (성능 개선)
           showsVerticalScrollIndicator={false} // 스크롤바 숨김
           contentContainerStyle={styles.scrollViewContent} // ScrollView 내부 콘텐츠 스타일
        >
          {/* 초기 표시되는 날씨 정보 컨테이너 */}
          <View ref={bodyContentRef} style={styles.bodyContent}>
            {/* 오늘·어제 기온 (현재 온도 표시) */}
            <Text style={[FONTS.body, { color: COLORS.text }]}>
              현재 : {today?.toFixed(1)}°C
            </Text>
            <Text style={[FONTS.body, { color: COLORS.text }]}>
              어제 : {yesterday?.toFixed(1)}°C
            </Text>
            {tempDiff !== undefined && <DiffBadge diff={tempDiff} unit="°C" />}

            {/* 이미지 */}
            <View style={styles.imgWrapper}>
              {memoizedImageSource && (
                <ImageBackground
                  style={{ flex: 1 }}
                  resizeMode="cover"
                  source={memoizedImageSource}
                />
              )}
            </View>

            {/* 2-열 카드 */}
            <View style={styles.infoGrid}>
              {/* 각 InfoCard는 memo 컴포넌트입니다. */}
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
             {/* 초기 콘텐츠와 그래프 사이의 간격 */}
             <View style={{ height: 20 }} />
          </View>

          {/* 시간대별 기온 그래프 (초기에는 아래쪽에 위치) */}
          {/* 그래프 컴포넌트도 memo 컴포넌트입니다. */}
          <TemperatureChart
            title="시간대별 기온"
            todayData={todayHourlyData}
            yesterdayData={yesterdayHourlyData}
          />

        </ScrollView>
      )}
    </SafeAreaView>

    {/* 아래쪽 화살표 버튼 (로딩/에러 상태가 아니고, 맨 위에 있을 때만 표시) */}
    {isScrolledToTop && !loading && !err && todayHourlyData.length > 0 && (
      <TouchableOpacity
         style={[styles.scrollDownButton, { bottom: APPROX_BANNER_HEIGHT + 15 }]} // 배너 높이 + 간격만큼 위로 배치
         onPress={scrollToChart}
         accessibilityLabel="시간대별 기온 그래프 보기"
      >
         {/* 아래쪽 화살표 SVG 아이콘 */}
         <Svg width={30} height={30} viewBox="0 0 24 24" fill={COLORS.accent}>
           <Path d="M8.12 9.29L12 13.17l3.88-3.88a.996.996 0 1 1 1.41 1.41l-4.59 4.59a.996.996 0 0 1-1.41 0L6.71 10.7a.996.996 0 0 1 0-1.41c.39-.38 1.03-.39 1.41 0z"/>
         </Svg>
      </TouchableOpacity>
    )}


    {/* 배너 광고 View (하단에 고정) */}
    <View
      style={{
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        // backgroundColor: 'rgba(0,255,0,0.3)', // 디버깅용
      }}
    >
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          // requestOptions: { nonPersonalizedAdsOnly: true },
        }}
        onAdFailedToLoad={(error) => console.error('광고 로드 실패:', error)}
        onAdLoaded={() => console.log('광고 로드 성공')}
      />
    </View>

    </View> // Main container 끝
  );
}