import "react-native-gesture-handler";
import React, {
  useEffect
} from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AppMain from "./main";                    // 기존 날씨 화면 (위 코드)
import NotificationSettings from "./NotificationSettings";
import mobileAds from 'react-native-google-mobile-ads';
import messaging from "@react-native-firebase/messaging"
import "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";

enableScreens(); // React Navigation의 성능 향상을 위해 스크린 최적화

const Stack = createStackNavigator();

const configureAdMob = async () => {
  await mobileAds().initialize();
};

messaging().setBackgroundMessageHandler(async remoteMessage => {

  // await reciveNotification(remoteMessage);
  console.log('Message handled in the background!', remoteMessage);
});


export default function App() {
  useEffect(() => {
    (async () => {
      // await configureAdMob();
      // const adapterStatuses = await mobileAds().initialize();
      // console.log(adapterStatuses);
    })();
  }, []);
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home"
        screenOptions={{ headerShown: false, gestureEnabled: true }}
      >
        <Stack.Screen name="Home" component={AppMain} />
        <Stack.Screen
          name="Settings"
          component={NotificationSettings}
          options={{ presentation: "modal" }} // iOS-style 모달
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
