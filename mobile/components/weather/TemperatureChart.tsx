// src/components/weather/TemperatureChart.tsx
import React, { memo, useMemo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

const CHART_COLORS = {
  background: COLORS.cardBackground,
  text: COLORS.text,
  todayLine: COLORS.positive,
  yesterdayLine: COLORS.negative,
  dotStroke: COLORS.cardBackground,
};

interface ChartDataPoint {
  hour: string;
  temp: number;
}

interface TemperatureChartProps {
  todayData: ChartDataPoint[];
  yesterdayData: ChartDataPoint[];
  title: string;
  onSelectHour: (hour: string) => void;
  selectedHour: string | null;
}

const screenWidth = Dimensions.get('window').width;
const parentPaddingHorizontal = 16;
const chartWidth = screenWidth - parentPaddingHorizontal * 2;

const TemperatureChart = memo(
  ({ title, todayData, yesterdayData, onSelectHour, selectedHour }: TemperatureChartProps) => {
    if (
      !todayData.length ||
      !yesterdayData.length ||
      todayData.length !== yesterdayData.length
    ) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>기온 데이터를 불러올 수 없습니다.</Text>
        </View>
      );
    }

    const chartDataToday = useMemo(
      () =>
        todayData.map(d => ({
          value: d.temp,
          date: d.hour
        })),
      [todayData]
    );

    const chartDataYesterday = useMemo(
      () =>
        yesterdayData.map(d => ({
          value: d.temp,
          date: d.hour,
        })),
      [yesterdayData]
    );

    return (
      <View>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: CHART_COLORS.todayLine }]} />
            <Text style={styles.legendText}>오늘</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: CHART_COLORS.yesterdayLine }]} />
            <Text style={styles.legendText}>어제</Text>
          </View>
        </View>
        <LineChart
          areaChart
          data={chartDataToday}
          data2={chartDataYesterday}
          isAnimated
          spacing={15}
          color1={CHART_COLORS.todayLine}
          color2={CHART_COLORS.yesterdayLine}
          startFillColor1={CHART_COLORS.todayLine}
          startFillColor2={CHART_COLORS.yesterdayLine}
          endFillColor1={CHART_COLORS.todayLine}
          endFillColor2={CHART_COLORS.yesterdayLine}
          startOpacity={0.9}
          endOpacity={0.2}
          initialSpacing={0}
          noOfSections={4}
          yAxisColor={COLORS.text}
          yAxisThickness={0}
          rulesType="solid"
          rulesColor={COLORS.border}
          yAxisTextStyle={{color: COLORS.text}}
          yAxisLabelSuffix="℃"
          yAxisOffset={Math.min(...chartDataToday.map(d => d.value), ...chartDataYesterday.map(d=> d.value)) - 5}
          xAxisColor={COLORS.border}
          pointerConfig={{
            pointerStripUptoDataPoint: true,
            pointerStripColor: COLORS.border,
            pointerStripWidth: 2,
            strokeDashArray: [2, 5],
            pointerColor: COLORS.border,
            radius: 4,
            pointerLabelWidth: 100,
            pointerLabelHeight: 120,
            pointerLabelComponent: items => {
              onSelectHour(items[0].date);
              return (
                <View
                  style={chartStyles.pointerLabelContainer}>
                  <Text style={chartStyles.pointerLabelDate}>
                    {items[0].date}
                  </Text>
  
                  <View style={chartStyles.pointerLabelDiffWrapper}>
                    <Text style={chartStyles.pointerLabelDiffText}>
                      {(items[0].value - items[1].value).toFixed(1)}℃
                    </Text>
                  </View>
                </View>
              );
            },
          }}
        />
      // </View>
    );
  }
);

const styles = StyleSheet.create({
  chartContainer: {
    marginVertical: 16,
    borderRadius: 16,
    backgroundColor: CHART_COLORS.background,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    width: '100%',
  },
  noDataContainer: {
    padding: 20,
    backgroundColor: CHART_COLORS.background,
    borderRadius: 12,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: CHART_COLORS.text,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  legendColorBox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 14,
    color: CHART_COLORS.text,
    fontFamily: FONTS.regular,
  },
});

const chartStyles = StyleSheet.create({
  pointerLabelContainer: {
    height: 90,
    width: 100,
    justifyContent: 'center',
    marginTop: -30,
    marginLeft: -40,
  },
  pointerLabelDate: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  pointerLabelDiffWrapper: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
  },
  pointerLabelDiffText: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.text,
  },
});

export default TemperatureChart;
