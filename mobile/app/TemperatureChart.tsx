// TemperatureChart.tsx
import React, { memo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

// 차트 데이터 포인트 타입 정의 (예시: 시간, 온도)
// 실제 weather_.ts 파일 수정 후 필요에 따라 데이터 구조 변경
interface ChartDataPoint {
  hour: string; // 예: "00", "06", "12", "18" 등 시간 레이블
  temp: number;
}

interface TemperatureChartProps {
  todayData: ChartDataPoint[];
  yesterdayData: ChartDataPoint[];
  title: string;
}

const screenWidth = Dimensions.get('window').width;

const TemperatureChart = memo(({ todayData, yesterdayData, title }: TemperatureChartProps) => {
  // 차트 라이브러리가 요구하는 데이터 형식으로 변환
  // 이 부분은 사용하는 차트 라이브러리의 요구사항에 따라 달라집니다.
  // react-native-chart-kit의 LineChart는 data 속성에 labels와 datasets 배열을 받습니다.
  // 예시: 데이터를 6시간 간격으로 표시한다고 가정
  const labels = todayData.map(data => data.hour); // 시간 레이블 (예: ["00", "06", "12", "18"])
  const todayTemps = todayData.map(data => data.temp);
  const yesterdayTemps = yesterdayData.map(data => data.temp);

  // 데이터가 비어있으면 차트를 렌더링하지 않거나 대체 메시지 표시
  if (!todayData || todayData.length === 0 || !yesterdayData || yesterdayData.length === 0) {
    return <View style={styles.noDataContainer}><Text style={styles.noDataText}>기온 데이터를 불러올 수 없습니다.</Text></View>;
  }


  // 차트 구성 데이터
  const data = {
    labels: labels,
    datasets: [
      {
        data: todayTemps,
        color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`, // 오늘: 빨간색 계열
        strokeWidth: 2,
        legend: "오늘",
      },
      {
        data: yesterdayTemps,
        color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`, // 어제: 파란색 계열
        strokeWidth: 2,
        legend: "어제",
      }
    ],
    legend: ["오늘", "어제"]
  };

  // 차트 설정
  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientFromOpacity: 1,
    backgroundGradientTo: "#fff",
    backgroundGradientToOpacity: 1,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // 축 및 레이블 색상
    strokeWidth: 2, // optional, default 3
    barPercentage: 0.5,
    useShadowColorFromDataset: false, // optional
    decimalPlaces: 1, // 소수점 이하 자릿수
    propsForDots: { // 점 스타일
        r: "4",
        strokeWidth: "1",
        stroke: "#ffa726"
    },
    fillShadowGradientFrom: "#fff", // fill 색상을 white로 설정
    fillShadowGradientTo: "#fff",
    fillShadowGradientFromOpacity: 0, // 채우기 투명도 0 (채우기 없음)
    fillShadowGradientToOpacity: 0,
  };


  return (
    <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <LineChart
            data={data}
            width={screenWidth - 32} // 화면 너비 - 좌우 패딩 (styles.body의 paddingHorizontal 16 * 2)
            height={220}
            chartConfig={chartConfig}
            bezier // 스무스한 곡선
            style={styles.chart}
            // yAxisSuffix="°C" // Y축 단위 표시
            // yAxisInterval={1} // optional, defaults to 1
        />
    </View>
  );
});

const styles = StyleSheet.create({
    chartContainer: {
        marginVertical: 16,
        borderRadius: 16,
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        alignItems: 'center', // 차트를 가운데 정렬
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1B1F23',
        marginTop: 10,
        marginBottom: 0, // 차트와의 간격 조절
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    noDataContainer: {
      marginVertical: 16,
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
      borderRadius: 12,
      elevation: 2,
    },
    noDataText: {
      fontSize: 16,
      color: '#6b7280',
    }
});

export default TemperatureChart;