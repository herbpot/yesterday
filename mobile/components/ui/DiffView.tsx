import { View, SafeAreaView, StatusBar, Text, ImageBackground, ActivityIndicator } from "react-native"
import React, { useMemo, useState, useCallback, useEffect } from "react";

import {COLORS} from "../../constants/colors";
import {FONTS} from "../../constants/fonts";
import styles from "../../styles/appMainStyles"; // 스타일시트 import

import { getCoords, fetchWeather, WEATHER_IMAGES } from "../../services/weather_";


import InfoCard from "./InfoCard";
import DiffBadge from "./DiffBadge";

const DiffView = () => {
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
    
    // 시간대별 기온 데이터 상태 (차트 화면으로 전달할 데이터)
    const [todayHourlyData, setTodayHourlyData] = useState< { hour: string; temp: number; }[]>([]);
    const [yesterdayHourlyData, setYesterdayHourlyData] = useState<{ hour: string; temp: number; }[]>([]);

    const loadWeather = useCallback(async () => {
        try {
          setLoading(true);
          setErr(null);
          // setIsScrolledToTop(true); // 스크롤 제거로 불필요
    
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
             setErr("날씨 정보를 불러오는데 실패했습니다.");
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
          setErr(`날씨 데이터를 불러오는데 실패했습니다: ${e.message}`);
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
    }, []); // 빈 의존성 배열: 상태 Setter와 import된 함수는 안정적이므로 빈 배열 사용.
    
    useEffect(() => {
        async function init() {
            await loadWeather();
        }
        init();
    }, [loadWeather]);

    const memoizedImageSource = useMemo(() => {
        const uri = WEATHER_IMAGES[imageKey];
        return uri ? { uri } : null;
    }, [imageKey]);
    
    
    const tempDiff =
    today !== null && yesterday !== null ? today - yesterday : undefined;

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
                    <Text style={[FONTS.body, { color: COLORS.text, textAlign: 'center' }]}>
                        {err}
                    </Text>
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

export default DiffView;