import { View, SafeAreaView, StatusBar, Text, ImageBackground, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native"
import React, { useMemo, useState, useCallback, useEffect } from "react";

import {COLORS} from "../../constants/colors";
import {FONTS} from "../../constants/fonts";
import styles from "../../styles/appMainStyles"; // 스타일시트 import

import { getCoords, fetchWeather, WEATHER_IMAGES } from "../../services/weather_";


import InfoCard from "./InfoCard";
import DiffBadge from "./DiffBadge";

// Helper function for outfit recommendation
const getOutfitRecommendation = (feelsLike: number | null, tempDiff: number | undefined): string => {
    if (feelsLike === null) return "옷차림 정보를 준비 중입니다.";

    let recommendation = "";
    let diffMessage = "";

    if (tempDiff !== undefined) {
        if (tempDiff > 5) {
            diffMessage = "어제보다 많이 따뜻해졌어요! ";
        } else if (tempDiff < -5) {
            diffMessage = "어제보다 많이 추워졌어요! ";
        } else if (tempDiff > 0) {
            diffMessage = "어제보다 조금 따뜻해요. ";
        } else if (tempDiff < 0) {
            diffMessage = "어제보다 조금 쌀쌀해요. ";
        }
    }

    if (feelsLike < 5) {
        recommendation = "오늘은 매우 추워요! 두꺼운 패딩과 목도리를 추천해요.";
    } else if (feelsLike < 10) {
        recommendation = "쌀쌀한 날씨예요. 따뜻한 코트나 두꺼운 스웨터를 입으세요.";
    } else if (feelsLike < 15) {
        recommendation = "선선한 가을 날씨예요. 가벼운 자켓이나 가디건이 좋겠어요.";
    } else if (feelsLike < 20) {
        recommendation = "활동하기 좋은 날씨네요. 긴팔 티셔츠나 얇은 셔츠를 추천해요.";
    } else if (feelsLike < 25) {
        recommendation = "따뜻한 날씨예요. 반팔 티셔츠나 얇은 긴팔이 적당해요.";
    } else { // feelsLike >= 25
        recommendation = "더운 날씨예요! 시원한 반팔이나 민소매를 추천해요.";
    }

    return `${diffMessage}${recommendation}`;
};


const DiffView = () => {
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [isLocationPermissionDenied, setIsLocationPermissionDenied] = useState(false);

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
    
    // 시간대별 기온 데이터 상태 (차트 화면으로 전달할 데이터)
    const [todayHourlyData, setTodayHourlyData] = useState< { hour: string; temp: number; }[]>([]);
    const [yesterdayHourlyData, setYesterdayHourlyData] = useState<{ hour: string; temp: number; }[]>([]);

    const loadWeather = useCallback(async () => {
        // useCallback: `loadWeather` 함수가 `today`, `yesterday` 등 상태에 의존하지 않고,
        // 컴포넌트 리렌더링 시 재생성되지 않도록 최적화합니다.
        // `getCoords`와 `fetchWeather`는 외부에서 import된 함수이므로 의존성 배열에 포함하지 않습니다.
        try {
          setLoading(true);
          setErr(null);
          setIsLocationPermissionDenied(false);
    
          const coords = await getCoords();
          console.log("날씨 데이터 요청 중...", "좌표:", coords);
          const parsed = await fetchWeather(coords);
          const { weather, hourlyWeather: rawHourlyData } = parsed;
          console.log("날씨 데이터 응답 (weather):", weather);
          console.log("날씨 데이터 응답 (hourlyWeather):", rawHourlyData);
    
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
             setErr("날씨 정보를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
          }
    
          if (Array.isArray(rawHourlyData)) {
              const transformedTodayData = rawHourlyData.map(item => ({
                  hour: item.hour,
                  temp: item.todayTemp,
              }));
              const transformedYesterdayData = rawHourlyData.map(item => ({
                  hour: item.hour,
                  temp: item.yesterdayTemp,
              }));
              setTodayHourlyData(transformedTodayData);
              setYesterdayHourlyData(transformedYesterdayData);
          } else {
              console.error("hourlyWeather 데이터가 예상한 배열 형태가 아닙니다.", rawHourlyData);
              setTodayHourlyData([]);
              setYesterdayHourlyData([]);
          }
    
        } catch (e: any) {
          console.error("날씨 데이터 로드 중 오류 발생:", e);
          if (e.message.includes("Location permission denied")) { // 예시: 실제 에러 메시지에 따라 조정 필요
            setErr("위치 정보 접근 권한이 필요합니다. 설정에서 권한을 허용해주세요.");
            setIsLocationPermissionDenied(true);
          } else {
            setErr(`날씨 데이터를 불러오는데 실패했습니다: ${e.message}. 잠시 후 다시 시도해주세요.`);
          }
          // 에러 발생 시 모든 상태 초기화
          setToday(null); setYesterday(null);
          setHumidity(null); setHumidityY(null);
          setUv(null); setUvY(null);
          setFeels(null); setFeelsY(null);
          setImageKey("clear_day"); // 기본 이미지 키로 복원
          setTodayHourlyData([]); setYesterdayHourlyData([]);
        } finally {
          setLoading(false);
        }
    }, []); // 빈 의존성 배열: `loadWeather` 함수는 외부 함수와 상태 setter에만 의존하므로 안정적입니다.
    
    useEffect(() => {
        // useEffect: 컴포넌트가 마운트될 때 `loadWeather` 함수를 한 번 실행합니다.
        // `loadWeather`가 `useCallback`으로 감싸져 있으므로, 의존성 배열에 포함해도 불필요한 재실행을 방지합니다.
        async function init() {
            await loadWeather();
        }
        init();
    }, [loadWeather]);

    const memoizedImageSource = useMemo(() => {
        // useMemo: `imageKey`가 변경될 때만 `ImageBackground`의 `source` 객체를 재생성합니다.
        // 불필요한 객체 생성을 방지하여 렌더링 성능을 최적화합니다.
        const uri = WEATHER_IMAGES[imageKey];
        return uri ? { uri } : null;
    }, [imageKey]);
    
    
    const tempDiff =
    today !== null && yesterday !== null ? today - yesterday : undefined;

    const outfitRecommendation = useMemo(() => {
        // useMemo: `feels` 또는 `tempDiff`가 변경될 때만 옷차림 추천 텍스트를 다시 계산합니다.
        return getOutfitRecommendation(feels, tempDiff);
    }, [feels, tempDiff]);


    return (
        <View style={styles.container}>
            {loading ? (
                <View style={[styles.bodyContent]}>
                    <ActivityIndicator size="large" />
                    <Text style={[FONTS.body, { color: COLORS.text, textAlign: 'center' }]}>
                        날씨 정보를 불러오는 중...
                    </Text>
                </View>
            ) : err ? (
                <View style={[styles.bodyContent]}>
                    <Text style={[FONTS.body, { color: COLORS.text, textAlign: 'center', marginBottom: 20 }]}>
                        {err}
                    </Text>
                    {!isLocationPermissionDenied && ( // 위치 권한 에러가 아닐 때만 재시도 버튼 표시
                        <TouchableOpacity onPress={loadWeather} style={localStyles.retryButton}>
                            <Text style={localStyles.retryButtonText}>다시 시도</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={[styles.bodyContent]}>

                    {/* ... 메인 콘텐츠 (기온, 이미지, 카드, 버튼 등) ... */}
                    {/* 오늘·어제 기온 */}
                    <View> {/* 그룹화를 위한 View 추가 */}
                        <Text style={[FONTS.body, { color: COLORS.text, textAlign: 'center' }]}> {/* 중앙 정렬 추가 */}
                        현재 : {today?.toFixed(1)}°C
                        </Text>
                        <Text style={[FONTS.body, { color: COLORS.text, textAlign: 'center' }]}> {/* 중앙 정렬 추가 */}
                        어제 : {yesterday?.toFixed(1)}°C
                        </Text>
                        {tempDiff !== undefined && <DiffBadge diff={tempDiff} unit="°C" />}
                    </View>

                    {/* 옷차림 추천 텍스트 */}
                    <Text style={[FONTS.h3, { color: COLORS.text, textAlign: 'center', marginTop: 20 }]}>
                        {outfitRecommendation}
                    </Text>

                    <View style={styles.imgWrapper}>
                    {memoizedImageSource && (
                        <ImageBackground
                        style={{ flex: 1 }}
                        resizeMode="cover"
                        source={memoizedImageSource}
                        />
                    )}
                    </View>

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
        </View>
    )
}

// DiffView 컴포넌트 내에서만 사용될 스타일
const localStyles = StyleSheet.create({
    retryButton: {
        backgroundColor: COLORS.primary, // 예시 색상, 실제 앱의 테마에 맞게 조정
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        marginTop: 10,
    },
    retryButtonText: {
        color: COLORS.white, // 예시 색상
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default DiffView;