// src/components/weather/TemperatureChart.tsx
import React, { memo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

// Constants import
import { COLORS } from '../../constants/colors'; // 기존 앱의 밝은 색상 상수는 참조용으로 유지
// import { FONTS } from '../../constants/fonts'; // 현재 차트에서 폰트 상수는 직접 사용되지 않음


// --- 차트 전용 어두운 테마 색상 상수 정의 ---
const CHART_COLORS = {
  background: '#1A1A1A', // 차트 배경색 (어두운 회색)
  text: '#E0E0E0', // 레이블, 범례 등 텍스트 색상 (밝은 회색)
  todayLine: '#4682B4', // 오늘 라인 색상 (스틸블루 계열)
  yesterdayLine: '#888888', // 어제 라인 색상 (연한 회색)
  gradientFrom: '#4682B4', // 그라데이션 시작 색상 (오늘 라인 색상과 동일)
  gradientTo: '#1A1A1A', // 그라데이션 끝 색상 (차트 배경색과 동일)
  gridLine: '#333333', // (사용하지 않지만 정의) 그리드 라인 색상
  dotStroke: '#FFFFFF', // 데이터 포인트 점 테두리 색상 (흰색)
};
// ---------------------------------------------


// LineChart 컴포넌트의 data 프롭이 기대하는 데이터 구조 인터페이스 정의
// 'react-native-chart-kit' 공식 문서를 참고하여 정의합니다.
interface LineChartPropsData {
  labels: string[]; // X축 레이블 (예: 시간)
  datasets: {
    data: number[]; // 각 데이터셋의 값 배열 (예: 기온)
    color?: (opacity: number) => string; // 데이터셋 선 색상 함수
    strokeWidth?: number; // 데이터셋 선 두께
    legend?: string; // 범례 텍스트
    withDots?: boolean; // 데이터 포인트(점) 표시 여부
    withInnerDots?: boolean; // 데이터 포인트 내부 원 표시 여부
    withOuterDots?: boolean; // 데이터 포인트 외부 원 표시 여부
    strokeDasharray?: number[]; // 점선 스타일 [대시 길이, 간격 길이]
    // --- 그라데이션 필드 ---
    fillGradientFrom?: string; // 그라데이션 시작 색상 (Hex, rgb, rgba 등)
    fillGradientTo?: string; // 그라데이션 끝 색상
    fillGradientFromOpacity?: number; // 그라데이션 시작 투명도
    fillGradientToOpacity?: number; // 그라데이션 끝 투명도
    // -----------------------
    [key: string]: any; // 그 외 추가적인 속성을 허용
  }[];
   // 전체 범례 배열 (datasets의 legend 속성을 기반으로 자동으로 생성되거나 여기서 직접 지정)
   // legend?: string[];
}


// 차트 데이터 포인트 타입 정의 (AppMain에서 변환 후 전달하는 형태)
interface ChartDataPoint {
  hour: string;
  temp: number;
}

interface TemperatureChartProps {
  todayData: ChartDataPoint[];
  yesterdayData: ChartDataPoint[];
  title: string;
}

// 화면 너비 계산 (부모 컨테이너의 패딩을 고려하여 차트 너비 계산에 사용)
const screenWidth = Dimensions.get('window').width;
// AppMainScreen의 scrollViewContent에 적용된 paddingHorizontal 값 (appMainStyles.ts 참조)
const parentPaddingHorizontal = 16;
const chartWidth = screenWidth - parentPaddingHorizontal * 2;

// Hex 색상을 RGBA 문자열로 변환하는 헬퍼 함수 (그라데이션 색상 등에 사용)
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};


const TemperatureChart = memo(({ todayData, yesterdayData, title }: TemperatureChartProps) => {
  // 데이터가 비어있거나 길이가 다르면 차트를 렌더링하지 않거나 대체 메시지 표시
  if (!todayData || todayData.length === 0 || !yesterdayData || yesterdayData.length === 0 || todayData.length !== yesterdayData.length) {
     return (
       <View style={styles.noDataContainer}>
         <Text style={styles.noDataText}>기온 데이터를 불러올 수 없습니다.</Text>
       </View>
     );
  }

  // 차트 라이브러리가 요구하는 데이터 형식으로 변환
  // X축 레이블: "00:00" -> "00" (시간만 표시)
  // 모든 레이블을 표시하기보다 일부만 표시하여 겹침 방지 (6시간 간격 예시)
  const labels = todayData.map((data, index) => index % 6 === 0 ? data.hour.substring(0, 2) : '');
  const todayTemps = todayData.map(data => data.temp);
  const yesterdayTemps = yesterdayData.map(data => data.temp);


  // LineChartPropsData 타입 사용
  const data: LineChartPropsData = {
    labels: labels, // X축 레이블 (시간)
    datasets: [
      {
        data: todayTemps,
        // 선 색상 함수: 오늘 라인 색상 사용
        color: (opacity = 1) => hexToRgba(CHART_COLORS.todayLine, opacity),
        strokeWidth: 2,
        legend: "오늘",
        withDots: true, // 점 표시
        // --- 오늘 데이터 그라데이션 필드 ---
        fillGradientFrom: CHART_COLORS.gradientFrom, // 시작 색상
        fillGradientTo: CHART_COLORS.gradientTo, // 끝 색상
        fillGradientFromOpacity: 0.7, // 시작 투명도 (조절 가능)
        fillGradientToOpacity: 0.1, // 끝 투명도 (거의 투명)
        // ----------------------------------
      },
      {
        data: yesterdayTemps,
        // 선 색상 함수: 어제 라인 색상 사용
        color: (opacity = 1) => hexToRgba(CHART_COLORS.yesterdayLine, opacity),
        strokeWidth: 2,
        legend: "어제",
        withDots: true, // 점 표시
        strokeDasharray: [5, 5], // 점선 스타일 [대시 길이, 간격 길이]
         // --- 어제 데이터 그라데이션 필드 (선택 사항: 이미지에는 없어 추가하지 않음) ---
        // fillGradientFrom: CHART_COLORS.yesterdayLine,
        // fillGradientTo: CHART_COLORS.background,
        // fillGradientFromOpacity: 0.5,
        // fillGradientToOpacity: 0.1,
        // -----------------------------------
      }
    ],
  };

  // 차트 스타일 설정을 위한 구성 객체 (chartConfig)
  const chartConfig = {
    // --- 배경 스타일 (어두운 배경) ---
    backgroundGradientFrom: CHART_COLORS.background,
    backgroundGradientFromOpacity: 1,
    backgroundGradientTo: CHART_COLORS.background,
    backgroundGradientToOpacity: 1,
    // -----------------------------

    // 축, 레이블, 범례 텍스트 색상 (밝은 텍스트 색상 사용)
    color: (opacity = 1) => hexToRgba(CHART_COLORS.text, opacity),
    labelColor: (opacity = 1) => hexToRgba(CHART_COLORS.text, opacity),

    // --- 배경 그리드 선 제거 ---
    withHorizontalLines: false, // 가로선 제거
    withVerticalLines: false, // 세로선 제거
    // --------------------------

    // 데이터 포인트(점) 스타일
    // `propsForDots`를 사용하여 모든 점에 공통 스타일 적용 (선택 사항)
    // 각 데이터셋의 color 속성과 withDots 속성을 우선 사용합니다.
     propsForDots: {
       r: "4", // 점 반경
       strokeWidth: "2", // 점 테두리 두께
       stroke: CHART_COLORS.dotStroke, // 점 테두리 색상 (흰색)
     },
     // withDots: true, // chartConfig의 global 설정 (datasets에서 개별 설정 가능)


    // 레이블(X/Y 축) 스타일 (FONTS.body와 유사하게 설정)
    // color/labelColor와 propsForLabels를 조합하여 최종 스타일 결정
    propsForLabels: {
        fontSize: 12, // 레이블 폰트 크기 (이미지 참고, body 폰트보다 약간 작게)
        // fontWeight: 'normal', // fontWeight는 SVG Text에서 지원 안 될 수 있습니다.
        // fill: (opacity = 1) => hexToRgba(CHART_COLORS.text, opacity), // 색상은 labelColor에서 설정됨
    },


    // 전체 영역 채우기 (dataset별 그라데이션 사용 시 필요 없음)
    // dataset의 fillGradient* 속성이 global fillShadowGradient* 보다 우선합니다.
    fillShadowGradientFrom: CHART_COLORS.background, // 배경색과 동일
    fillShadowGradientTo: CHART_COLORS.background,
    fillShadowGradientFromOpacity: 0,
    fillShadowGradientToOpacity: 0,


    decimalPlaces: 1, // Y축 값의 소수점 이하 자릿수

    // Y축 접미사 추가 (°C)
    yAxisSuffix: "°C",
     // Y축 접미사 스타일 (labelColor를 따름)

    // Y축 시작점 조정 (데이터의 최소값 근처에서 시작)
    fromZero: false,

    // X/Y 축 레이블 회전 (필요시)
    // verticalLabelRotation: 0,
    // horizontalLabelRotation: 0,

    // --- 차트 내부 패딩 (Y축 레이블, X축 레이블, 범례 공간 확보) ---
    // 공식 문서 예제를 참고하여 적절한 값 설정
    paddingTop: 20, // 차트 상단 (제목과 차트 영역 사이)
    paddingRight: 20, // 차트 오른쪽 (범례 공간)
    paddingBottom: 10, // 차트 하단 (X축 레이블 공간)
    paddingLeft: 10, // 차트 왼쪽 (Y축 레이블 공간)
    // ------------------------------------------------------

    // 범례 스타일 (따로 설정 속성은 없으며, 주로 dataset의 legend와 chartConfig의 color/labelColor에 영향을 받습니다.)
    // 범례 위치는 paddingRight 값 등에 의해 자동 조절됩니다.

    // SVG 요소 자체에 적용될 스타일 (테두리 둥글게)
     style: {
       borderRadius: 16, // 컨테이너와 동일하게 둥글게
     },

  };


  return (
    // 차트 전체를 감싸는 컨테이너 (카드 모양 스타일)
    <View style={styles.chartContainer}>
        {/* 차트 제목 */}
        {/* 제목 색상은 기존 앱 스타일을 따르도록 COLORS.text 사용 */}
        <Text style={[styles.chartTitle, { color: COLORS.text }]}>{title}</Text>
        {/* 라인 차트 */}
        <LineChart
            data={data} // 차트 데이터
            width={chartWidth} // 계산된 차트 너비
            height={220} // 차트 높이 (필요시 조절)
            chartConfig={chartConfig} // 스타일 설정 객체
            bezier // 곡선 형태로 표시
            style={styles.chart} // 외부 마진 등 컨테이너 스타일과 별개로 적용될 스타일
            // onDataPointClick={(data) => { /* ... */ }}
        />
    </View>
  );
});

const styles = StyleSheet.create({
    // 차트 전체를 감싸는 컨테이너 (카드 스타일)
    chartContainer: {
        marginVertical: 16, // 위아래 여백
        borderRadius: 16, // 테두리 둥글게
        // --- 배경색을 어두운 차트 색상으로 변경 ---
        backgroundColor: CHART_COLORS.background,
        // -----------------------------------
        elevation: 2, // 안드로이드 그림자
        shadowColor: "#000", // iOS 그림자 색상 (어두운 배경에서도 그림자 효과는 유지)
        shadowOpacity: 0.3, // 그림자 투명도 증가 (어두운 배경에서 더 잘 보이게)
        shadowOffset: { width: 0, height: 4 }, // 그림자 위치 (아래쪽으로 더 길게)
        shadowRadius: 8, // 그림자 반경 증가 (더 부드럽게)
        alignItems: 'center', // 내부 컨텐츠(차트 SVG) 중앙 정렬
        width: '100%', // 부모 컨테이너 너비에 맞춤 (appMainStyles.ts의 scrollViewContent 패딩 고려)
    },
    // 차트 제목 스타일
    chartTitle: {
        fontSize: 18, // 폰트 크기
        fontWeight: '700', // 폰트 두께
        // color는 인라인 스타일로 COLORS.text 사용 (기존 앱 헤더 스타일 유지)
        marginTop: 10, // 제목 위 여백
        marginBottom: 0, // 제목 아래 여백 (chartConfig.paddingTop으로 조절)
    },
    // LineChart 컴포넌트 자체에 적용될 스타일
    // chartConfig에서 내부 패딩을 제어하므로 여기서는 추가적인 마진 등이 필요한 경우에만 사용
    chart: {
        // 마진이나 테두리 스타일 등이 필요한 경우 여기에 추가
    },
     // 데이터 없을 때 표시되는 컨테이너 스타일
     noDataContainer: {
       marginVertical: 16,
       padding: 20,
       alignItems: 'center',
       justifyContent: 'center',
       // --- 배경색을 어두운 차트 색상으로 변경 ---
       backgroundColor: CHART_COLORS.background,
       // ------------------------------------
       borderRadius: 12,
       elevation: 2,
       // 그림자 스타일은 chartContainer와 동일하게 적용 (선택 사항)
       shadowColor: "#000",
       shadowOpacity: 0.3,
       shadowOffset: { width: 0, height: 4 },
       shadowRadius: 8,
       width: '100%',
     },
     // 데이터 없을 때 표시되는 텍스트 스타일
     noDataText: {
       fontSize: 16,
       color: CHART_COLORS.text, // 어두운 배경에 맞는 밝은 색상
     }
});

export default TemperatureChart;