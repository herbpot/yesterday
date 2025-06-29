// src/screens/ChartScreen.tsx
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import Svg, { Path } from "react-native-svg";
import Animated, { runOnJS } from 'react-native-reanimated';

import { getCoords, fetchWeather, HourlyData } from '~/services/weather_';

// 상수 import
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

// 컴포넌트 import
// 수정된 TemperatureChart를 import합니다.
import TemperatureChart from '../../components/weather/TemperatureChart';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';

// 차트 데이터 포인트 타입 정의 (TemperatureChart로 전달)
type ChartDataPoint = { hour: string; temp: number; };

// 선택된 시간의 상세 정보 타입 (원본 HourlyData에서 필요한 필드만)
type SelectedHourDetail = {
  hour: string;
  todayTemp: number;
  yesterdayTemp: number;
  humidity: number;
  humidityY: number;
  uv: number;
  uvY: number;
  feels: number;
  feelsY: number;
} | null; // 데이터 없을 때는 null

type ChartScreenProps = {
  navigation: any; // 네비게이션 타입은 실제 사용하는 네비게이터 타입으로 변경 권장
};

export default function ChartScreen({ navigation }: ChartScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ⭐ 원시 데이터 상태 추가 (상세 정보 표시용)
  const [rawHourlyData, setRawHourlyData] = useState<HourlyData[]>([]);

  // 차트 컴포넌트에 전달할 데이터 (이미 변환된 형태)
  const [todayHourlyData, setTodayHourlyData] = useState<ChartDataPoint[]>([]);
  const [yesterdayHourlyData, setYesterdayHourlyData] = useState<ChartDataPoint[]>([]);

  // ⭐ 선택된 시간 상태 추가 (TemperatureChart에서 전달받을 "00시" 형태의 문자열)
  const [selectedHour, setSelectedHour] = useState<string | null>(null);

  // 컴포넌트 마운트 시 데이터를 불러오는 useEffect
  useEffect(() => {
    async function loadChartData() {
      console.log("차트 데이터 로딩 중...");
      try {
        setLoading(true);
        setError(null);

        const coords = await getCoords();
        const raw = await fetchWeather(coords);
        // console.log("차트 데이터 로딩 완료:", raw.hourlyWeather);

        // ⭐ 데이터 로딩 성공 시 원시 데이터와 차트용 데이터 모두 설정
        if (Array.isArray(raw.hourlyWeather) && raw.hourlyWeather.length > 0) {
          setRawHourlyData(raw.hourlyWeather); // 원시 데이터 저장

          // 차트용 데이터 변환 및 상태 설정
          const todayData = raw.hourlyWeather.map((item: any) => ({ hour: item.hour, temp: item.todayTemp }));
          const yesterdayData = raw.hourlyWeather.map((item: any) => ({ hour: item.hour, temp: item.yesterdayTemp }));
          setTodayHourlyData(todayData);
          setYesterdayHourlyData(yesterdayData);

          // ⭐ 데이터 로딩 완료 후 첫 번째 시간대를 기본 선택 시간으로 설정
          // TemperatureChart에서 '00시' 형태로 hour를 전달하므로, 여기도 '00시' 형태 유지
          setSelectedHour(raw.hourlyWeather[0].hour);

        } else {
          console.error("hourlyWeather 데이터가 예상한 배열 형태가 아니거나 비어있습니다.", raw.hourlyWeather);
          setError("날씨 데이터를 불러오는데 실패했습니다.");
          setRawHourlyData([]); // 에러 발생 시 초기화
          setTodayHourlyData([]);
          setYesterdayHourlyData([]);
          setSelectedHour(null); // 에러 발생 시 초기화
        }

      } catch (e: any) {
        console.error("차트 데이터 로드 중 오류 발생:", e);
        setError(`날씨 데이터를 불러오는데 실패했습니다: ${e.message}`); // 상세 에러 메시지 포함
        setRawHourlyData([]); // 에러 발생 시 초기화
        setTodayHourlyData([]);
        setYesterdayHourlyData([]);
        setSelectedHour(null); // 에러 발생 시 초기화
      } finally {
        setLoading(false); // 로딩 종료
      }
    }

    loadChartData();

  }, []); // 빈 의존성 배열: 컴포넌트 마운트 시 한 번만 실행

  // 뒤로 가기 핸들러 (useCallback으로 메모이제이션)
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]); // navigation 객체를 사용하므로 의존성 배열에 포함

  // ⭐ 차트에서 특정 시간을 선택했을 때 호출될 핸들러
  // TemperatureChart에서 'hour' 문자열(예: "10시")만 전달받음
  const handleSelectHour = useCallback((hour: string) => {
    console.log("시간 선택:", hour);
    setSelectedHour(hour); // 선택된 시간 상태 업데이트
  }, []); // setSelectedHour는 안정적인 함수이므로 의존성 불필요

  // ⭐ 선택된 시간에 해당하는 상세 데이터를 useMemo로 계산
  // 원시 데이터(rawHourlyData)에서 selectedHour와 일치하는 항목 찾기
  const selectedHourData: SelectedHourDetail = useMemo(() => {
    if (!selectedHour || rawHourlyData.length === 0) {
      return null;
    }
    // rawHourlyData에서 선택된 시간에 해당하는 데이터 찾기
    const data = rawHourlyData.find(item => item.hour === selectedHour);
    // 찾은 데이터를 SelectedHourDetail 타입에 맞게 반환 (모든 필드 포함)
    return data || null; // 찾지 못하면 null 반환
  }, [selectedHour, rawHourlyData]); // 선택된 시간 또는 원시 데이터가 변경될 때만 다시 계산

  const gesture = useMemo(() => {
    console.log('Gesture 객체 생성');
    return Gesture.Fling()
      .direction(Directions.DOWN) // UP 방향
      .onEnd(() => {
        console.log('Swipe Up detected');
        runOnJS(handleGoBack)(); // JS 스레드에서 뒤로 가기 호출
      });
  }, [handleGoBack]); // handleGoBack 함수가 변경될 때만 재생성

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={chartStyles.mainContainer}>
        <SafeAreaView style={chartStyles.container}>
          <StatusBar barStyle="dark-content" />
          <View style={chartStyles.header}>
            <View style={chartStyles.backButton}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill={COLORS.text}>
                  <Path d="M7 14l5-5 5 5z"/>
                </Svg>
            </View>
            </View>
          {loading ? (
            <View style={chartStyles.centerBox}>
                <ActivityIndicator size="large" color={COLORS.text} />
                <Text style={[chartStyles.errorText, { marginTop: 10 }]}>
                    차트 데이터를 불러오는 중...
                </Text>
            </View>
          ): error ? (
            <View style={chartStyles.centerBox}>
                <Text style={chartStyles.errorText}>
                    {error}
                </Text>
            </View>
          ): (
            <View style={chartStyles.contentArea}>
              <View style={chartStyles.chartWrapper}>
                <TemperatureChart
                  title=''
                  todayData={todayHourlyData}
                  yesterdayData={yesterdayHourlyData}
                  onSelectHour={handleSelectHour} // ⭐ 선택 핸들러 전달
                  selectedHour={selectedHour} // ⭐ 선택된 시간 상태 전달
                />
              </View>

              {/* 선택된 시간의 상세 정보 표시 영역 */}
              <View style={chartStyles.detailArea}>
                  {selectedHourData ? (
                      <>
                          <Text style={chartStyles.detailTitle}>{selectedHourData.hour} 상세 정보</Text>
                          {/* 기온 차이 */}
                          <View style={chartStyles.detailRow}>
                              <Text style={chartStyles.detailLabel}>기온:</Text>
                              <Text style={chartStyles.detailValue}>
                                  오늘 {selectedHourData.todayTemp.toFixed(1)}°C / 어제 {selectedHourData.yesterdayTemp.toFixed(1)}°C
                                  ({selectedHourData.todayTemp > selectedHourData.yesterdayTemp ? '+' : ''}{(selectedHourData.todayTemp - selectedHourData.yesterdayTemp).toFixed(1)}°C)
                              </Text>
                          </View>
                      </>
                  ) : (
                      // 선택된 시간 데이터가 없을 때 메시지
                      <Text style={chartStyles.noDataText}>시간을 선택하면 상세 정보를 볼 수 있습니다.</Text>
                  )}
              </View>
            </View>
          )}
        </SafeAreaView>
      </Animated.View>
    </GestureDetector>
  );
};

const chartStyles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
   header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    // padding: 8,
    alignItems: 'center',
    flex:1,
  },
   backButtonPlaceholder: {
    width: 40,
   },
   // ⭐ 차트와 상세 정보 영역을 포함하는 컨테이너
  contentArea: {
    flex: 1,
    paddingHorizontal: 16, // 좌우 패딩
    paddingTop: 16, // 상단 패딩
    // 하단 패딩은 DetailArea의 margin으로 조절
  },
  chartLabel: {
     ...FONTS.h3,
     color: COLORS.text,
     textAlign: 'center',
     marginBottom: 10, // 차트와 라벨 사이 간격
  },
  // ⭐ TemperatureChart를 감싸는 래퍼 (배경, 그림자 등 스타일 적용)
  chartWrapper: {
    marginVertical: 16, // 차트 위아래 여백
    padding: 15, // 차트 내부 여백
    borderRadius: 12, // 배경 둥글게
    backgroundColor: COLORS.cardBackground, // 배경색
    elevation: 2, // 안드로이드 그림자
    shadowColor: "#000", // iOS 그림자
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    overflow: 'hidden', // 둥근 모서리 밖으로 차트 내용이 나가지 않도록
  },
   // 상세 정보 표시 영역 스타일
  detailArea: {
    marginTop: 20, // 차트와 상세 정보 사이 간격
    padding: 16, // 내부 패딩
    backgroundColor: COLORS.cardBackground, // 배경색
    borderRadius: 8,
  },
  detailTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    ...FONTS.body,
    color: COLORS.text,
    marginRight: 10,
    fontWeight: 'bold',
    // 레이블 너비를 고정하여 값의 정렬을 맞출 수 있습니다.
    // width: 80,
  },
  detailValue: {
     ...FONTS.body,
     color: COLORS.text,
     flexShrink: 1, // 공간 부족 시 줄바꿈 허용
  },
  noDataText: {
      ...FONTS.body,
      color: COLORS.text,
      textAlign: 'center',
      fontStyle: 'italic',
  },
   centerBox: { // 로딩/에러 메시지 표시용
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.text,
    textAlign: 'center',
  },
});