import "react-native-gesture-handler";
import React, {
  useEffect
} from "react";
import { NavigationContainer } from "@react-navigation/native";
import { CardStyleInterpolators, createStackNavigator } from "@react-navigation/stack";
import messaging from "@react-native-firebase/messaging"
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";
import { AppRegistry } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './widgetHandler/TempWidgetHandler'; // 위젯 핸들러
import { expo } from '../app.json';
import { reciveNotification } from "../services/notification"; // 푸시 알림 서비스

import AppMain from "./screens/main";                    // 기존 날씨 화면 (위 코드)
import NotificationSettings from "./screens/NotificationSettings";
import ChartScreen from './screens/ChartScreen'; // 새로 생성한 파일 임포트
// import RenderWidget from "./screens/RenderWidget";

enableScreens(); // React Navigation의 성능 향상을 위해 스크린 최적화

const Stack = createStackNavigator();


messaging().setBackgroundMessageHandler(async remoteMessage => {

  await reciveNotification(remoteMessage);
  console.log('Message handled in the background!', remoteMessage);
});
// index.tsx

AppRegistry.registerComponent(expo.name, () => App);
registerWidgetTaskHandler(widgetTaskHandler);


export default function App() {
  return (
    <GestureHandlerRootView>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home"
          screenOptions={{ headerShown: false, gestureEnabled: true }}
        >
          {/* <Stack.Screen name="RenderWidget" component={RenderWidget} /> */}
          <Stack.Screen name="Home" component={AppMain} />
          <Stack.Screen
            name="Settings"
            component={NotificationSettings}
            options={{ presentation: "modal" }} // iOS-style 모달
          />
          <Stack.Screen
            name="ChartScreen"
            component={ChartScreen}
            options={{ 
              presentation: "modal",
              cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
              gestureEnabled: true,
              gestureDirection: 'vertical'

            }} // iOS-style 모달
            
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>

  );
}
