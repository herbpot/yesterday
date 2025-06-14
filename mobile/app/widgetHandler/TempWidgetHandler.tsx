// widget-task-handler.tsx
import { TempWidget } from '../widget/TempWidget';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getCoords, fetchWeather, parseWeather, WEATHER_IMAGES } from "../../services/weather_"; // 날씨 서비스 (필요시 추가)

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  // const coords = await getCoords() 
  // const raw = await fetchWeather(coords) 
  // const data = await parseWeather(raw)
  const data = {
    imageKey: 'clear_day',
    todayTemp: 25,
    yesterdayTemp: 22,
    humidity: 60,
    humidityY: 55,
    uv: 5,
    uvY: 4,
    feels: 26,
    feelsY: 23,
  };
  console.log("위젯 데이터:", data);
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
      props.renderWidget(<TempWidget data={data} />);
      break;
    case 'WIDGET_UPDATE':
      // 30분 주기 자동 호출 시 데이터 새로고침
      props.renderWidget(<TempWidget data={data} />);
      break;
    case 'WIDGET_CLICK':
      if (props.clickAction === 'OPEN_APP') {
        // 추가 로직 필요 시 작성
      }
      break;
  }
}
