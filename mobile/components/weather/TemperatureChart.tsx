// src/components/weather/TemperatureChart.tsx
import React, { memo, useMemo } from 'react'; // useMemo 임포트
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ChartData, ChartConfig } from 'react-native-chart-kit/dist/HelperTypes';

// Constants import
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

// --- 차트 전용 색상 상수 정의 ---
const CHART_COLORS = {
  background: '#fff',
  text: '#000000',
  todayLine: '#4682B4',
  yesterdayLine: '#B91C1C',
  gridLine: '#fff',
  dotStroke: '#FFFFFF',
};
// ---------------------------------------------

// 차트 데이터 포인트 타입 정의
interface ChartDataPoint {
  hour: string;
  temp: number;
}

interface TemperatureChartProps {
  todayData: ChartDataPoint[];
  yesterdayData: ChartDataPoint[];
  title: string; // Prop으로 받지만 현재 렌더링에서 사용되지 않음
}

const screenWidth = Dimensions.get('window').width;
const parentPaddingHorizontal = 16;
const chartWidth = screenWidth - parentPaddingHorizontal * 2;

const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};


const TemperatureChart = memo(React.forwardRef(({ title, todayData, yesterdayData }: TemperatureChartProps, ref) => { // title prop은 사용되지 않지만 그대로 유지
  // 데이터가 비어있거나 길이가 다르면 차트를 렌더링하지 않거나 대체 메시지 표시
  if (!todayData || todayData.length === 0 || !yesterdayData || yesterdayData.length === 0 || todayData.length !== yesterdayData.length) {
     return (
       <View style={styles.noDataContainer}> {/* StyleSheet.create로 정의된 안정적인 스타일 사용 */}
         <Text style={styles.noDataText}>기온 데이터를 불러올 수 없습니다.</Text> {/* StyleSheet.create로 정의된 안정적인 스타일 사용 */}
       </View>
     );
  }

  // ⭐ Solution 1: useMemo를 사용하여 배열 생성 메모이제이션
  const labels = useMemo(
    () => todayData.map((data, index) => index % 6 === 0 ? data.hour.substring(0, 2) : ''),
    [todayData] // todayData prop이 변경될 때만 다시 생성
  );
  const todayTemps = useMemo(
    () => todayData.map(data => data.temp),
    [todayData] // todayData prop이 변경될 때만 다시 생성
  );
  const yesterdayTemps = useMemo(
    () => yesterdayData.map(data => data.temp),
    [yesterdayData] // yesterdayData prop이 변경될 때만 다시 생성
  );


  // ⭐ Solution 2: useMemo를 사용하여 data 객체 생성 메모이제이션
  const data = useMemo(() => ({
    labels: labels,
    datasets: [
      {
        data: todayTemps,
        color: (opacity = 1) => hexToRgba(CHART_COLORS.todayLine, opacity),
        strokeWidth: 2,
        withDots: true,
      },
      {
        data: yesterdayTemps,
        color: (opacity = 1) => hexToRgba(CHART_COLORS.yesterdayLine, opacity),
        strokeWidth: 2,
        withDots: true,
      }
    ],
    legend: ['오늘', '어제'],
  }), [labels, todayTemps, yesterdayTemps]); // labels, todayTemps, yesterdayTemps 배열이 변경될 때만 다시 생성


  // ⭐ Solution 3: useMemo를 사용하여 chartConfig 객체 생성 메모이제이션
  const chartConfig: ChartConfig = useMemo(() => ({
    backgroundGradientFrom: CHART_COLORS.background,
    backgroundGradientFromOpacity: 1,
    backgroundGradientTo: CHART_COLORS.background,
    backgroundGradientToOpacity: 1,
    useShadowColorFromDataset: true,
    fillShadowGradientTo: CHART_COLORS.background,
    fillShadowGradientToOpacity: 0,
    color: (opacity = 1) => hexToRgba(CHART_COLORS.text, opacity),
    labelColor: (opacity = 1) => hexToRgba(CHART_COLORS.text, opacity),
    propsForDots: {
       r: "4",
       strokeWidth: "2",
       stroke: CHART_COLORS.dotStroke,
     },
    propsForLabels: {
        fontSize: 12,
        fill: CHART_COLORS.text,
    },
    decimalPlaces: 1,
    style: { // 이 내부 객체도 chartConfig가 메모이제이션되면 안정화됨
       borderRadius: 16,
     },
     // 나머지 chartConfig 속성 유지...
  }), [CHART_COLORS]); // CHART_COLORS는 상수이므로 빈 의존성 배열도 가능하지만, 명시적으로 사용하는 상수를 포함


  return (
    // 차트 전체를 감싸는 컨테이너 (카드 모양 스타일)
    <View style={styles.chartContainer}> {/* StyleSheet.create로 정의된 안정적인 스타일 사용 */}
        {/* <Text style={[styles.chartTitle, { color: COLORS.text }]}>{title}</Text> */} {/* 주석 처리된 상태 유지 */}
        <LineChart
            data={data} // ⭐ useMemo로 생성된 안정적인 객체 전달
            width={chartWidth}
            height={220}
            chartConfig={chartConfig} // ⭐ useMemo로 생성된 안정적인 객체 전달
            style={styles.chart} // StyleSheet.create로 정의된 안정적인 스타일 사용
            withHorizontalLines={false}
            withVerticalLines={false}
        />
    </View>
  );
}));

// 컴포넌트 정의 하단에 StyleSheet.create 스타일 정의는 문제가 없으며 안정적입니다.
const styles = StyleSheet.create({
    chartContainer: { /* ... */ },
    chartTitle: { /* ... */ }, // 현재 사용되지 않음
    chart: { /* ... */ },
    noDataContainer: { /* ... */ },
    noDataText: { /* ... */ }
});

export default TemperatureChart;