// src/components/weather/TemperatureChart.tsx
import React, { memo, useMemo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

const CHART_COLORS = {
  background: '#fff',
  text: '#000000',
  todayLine: '#4682B4',
  yesterdayLine: '#B91C1C',
  dotStroke: '#FFFFFF',
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
      [todayData, selectedHour]
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
      // <View style={styles.chartContainer}>
        <LineChart
          areaChart
          data={chartDataToday}
          data2={chartDataYesterday}
          isAnimated
          spacing={15}
          color1="#8a56ce"
          color2="#56acce"
          startFillColor1="#8a56ce"
          startFillColor2="#56acce"
          endFillColor1="#8a56ce"
          endFillColor2="#56acce"
          startOpacity={0.9}
          endOpacity={0.2}
          initialSpacing={0}
          noOfSections={4}
          yAxisColor="white"
          yAxisThickness={0}
          rulesType="solid"
          rulesColor="gray"
          yAxisTextStyle={{color: 'gray'}}
          yAxisLabelSuffix="℃"
          yAxisOffset={Math.min(...chartDataToday.map(d => d.value)) - 5}
          xAxisColor="lightgray"
          pointerConfig={{
            pointerStripUptoDataPoint: true,
            pointerStripColor: 'lightgray',
            pointerStripWidth: 2,
            strokeDashArray: [2, 5],
            pointerColor: 'lightgray',
            radius: 4,
            pointerLabelWidth: 100,
            pointerLabelHeight: 120,
            pointerLabelComponent: items => {
              console.log("Pointer items:", items);
              onSelectHour(items[0].date);
              return (
                <View
                  style={{
                    height: 90,
                    width: 100,
                    justifyContent: 'center',
                    marginTop: -30,
                    marginLeft: -40,
                  }}>
                  <Text style={{color: 'white', fontSize: 14, marginBottom:6,textAlign:'center'}}>
                    {items[0].date}
                  </Text>
  
                  <View style={{paddingHorizontal:14,paddingVertical:6, borderRadius:16, backgroundColor:'white'}}>
                    <Text style={{fontWeight: 'bold',textAlign:'center'}}>
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
});

export default TemperatureChart;
