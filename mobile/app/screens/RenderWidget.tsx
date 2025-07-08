import { View, Text } from "react-native";
import { WidgetPreview } from "react-native-android-widget";
import { TempWidget } from "../widget/TempWidget";

export default function RenderWidget() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {/* <Text>위젯을 렌더링하는 컴포넌트입니다.</Text> */}
      <WidgetPreview
        renderWidget={() => <TempWidget data={{"feels": 16.6, "feelsY": 19.8, "humidity": 68, "humidityY": 55, "imageKey": "clear_night", "imageURL": "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f319.png", "todayTemp": 17.3, "uv": 0, "uvY": 0, "yesterdayTemp": 20.4}}/>}
        height={100}
        width={170}
      />
    </View>
  );
}