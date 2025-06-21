// widget-task-handler.tsx
import { TempWidget } from '../widget/TempWidget'; // 경로 확인 필요
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getCoords, fetchWeather, ParsedWeather } from "../../services/weather_"; // 경로 및 타입 확인 필요

// 위젯 이름 정의 (AndroidManifest.xml 및 위젯 설정 파일과 일치해야 함)
const WIDGET_NAME = "WeatherWidget"; // 예시 이름, 실제 사용하는 이름으로 변경

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo } = props;

  // 특정 위젯에 대한 핸들러인지 확인 (여러 종류의 위젯을 사용할 경우)
  // if (widgetName !== WIDGET_NAME) {
  //   return;
  // }

  switch (widgetAction) {
    case 'WIDGET_ADDED': // 위젯이 처음 추가될 때
    case 'WIDGET_UPDATE': // 위젯 업데이트 요청 시 (주기적 또는 명시적)
      // 로딩 상태 먼저 렌더링
      props.renderWidget(<TempWidget loading={true} data={null} />);
      try {
        console.log(`[WidgetTaskHandler] Action: ${widgetAction}, WidgetInfo: ${widgetInfo}`);
        const coords = await getCoords();
        if (!coords) {
          throw new Error("위치 정보를 가져올 수 없습니다.");
        }
        const weatherData: ParsedWeather = await fetchWeather(coords);
        console.log("[WidgetTaskHandler] Weather data fetched:", weatherData);

        // 성공적으로 날씨 데이터 가져오면 위젯 업데이트
        props.renderWidget(<TempWidget data={weatherData} loading={false} />);
      } catch (error) {
        console.error("[WidgetTaskHandler] Error updating widget:", error);
        const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류 발생";
        // 에러 상태 렌더링
        props.renderWidget(<TempWidget error={errorMessage} data={null} loading={false} />);
      }
      break;

    case 'WIDGET_RESIZED':
      // 위젯 크기가 변경되었을 때 필요한 작업 (예: 레이아웃 재계산)
      console.log(`[WidgetTaskHandler] Widget Resized: ${widgetInfo}`, props.widgetInfo);
      // 필요하다면 현재 저장된 데이터로 다시 렌더링하거나, 새 데이터를 가져올 수 있습니다.
      // 예: 이전에 저장된 날씨 데이터가 있다면 그것으로 다시 렌더링
      // const lastKnownData = await getLastKnownWeatherData(widgetId);
      // props.renderWidget(<TempWidget data={lastKnownData} />);
      break;

    case 'WIDGET_DELETED':
      // 위젯이 삭제되었을 때 필요한 작업 (예: 관련 데이터 정리)
      console.log(`[WidgetTaskHandler] Widget Deleted: ${widgetInfo}`);
      break;

    case 'WIDGET_CLICK':
      // 위젯 내 특정 요소에 'clickAction'으로 커스텀 액션을 지정했을 때 호출됩니다.
      // TempWidget의 최상위 FlexWidget에는 'OPEN_APP'이 지정되어 있어,
      // 이 케이스는 해당 clickAction에 대한 추가 로직이 필요할 때 사용합니다.
      // (예: props.clickAction === 'REFRESH_WEATHER' 등)
      console.log(`[WidgetTaskHandler] Widget Clicked: ${widgetInfo}`, props.clickAction);
      if (props.clickAction === 'REFRESH_WEATHER_MANUALLY') { // 예시 커스텀 액션
        props.renderWidget(<TempWidget loading={true} data={null} />);
        try {
          const coords = await getCoords();
          const weatherData = await fetchWeather(coords);
          props.renderWidget(<TempWidget data={weatherData} loading={false} />);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류 발생";
          props.renderWidget(<TempWidget error={errorMessage} data={null} loading={false} />);
        }
      }
      break;

    default:
      console.log(`[WidgetTaskHandler] Unknown action: ${widgetAction}`);
      break;
  }
}