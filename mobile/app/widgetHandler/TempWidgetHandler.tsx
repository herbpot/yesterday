// widget-task-handler.tsx
import { TempWidget } from '../widget/TempWidget';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getCoords, fetchWeather, WEATHER_IMAGES } from "../../services/weather_"; // 날씨 서비스 (필요시 추가)

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_CLICK':
      const coords = await getCoords() 
      const data = await fetchWeather(coords) 
      console.log("위젯 데이터:", data, props.widgetAction);

      props.renderWidget(<TempWidget data={data} />);
      break;
  }
}
