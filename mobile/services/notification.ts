import { getCoords } from "./weather_";
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as Notifications from "expo-notifications";
import { getMessaging } from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shuoldSetBedge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE
const messaging = getMessaging();

async function getUid(): Promise<string> {
  const KEY = 'user_uid';
  let uid = await SecureStore.getItemAsync(KEY);
  if (!uid) {
    uid = uuidv4();
    await SecureStore.setItemAsync(KEY, uid);
  }
  return uid;
}

const getToken = async () => {
  const storedToken = await AsyncStorage.getItem('fcm_token');
  if (storedToken) {
    return storedToken;
  }
  const token = await messaging.getToken();
  AsyncStorage.setItem('fcm_token', token);
  console.log("FCM Token:", token);
  return token;
}

export async function fetchNotification({ hour, minute }: { hour: number; minute: number }) {
    const { lat, lon } = await getCoords();
    const data = JSON.stringify({
            uid: await getUid(),
            fcm_token: await getToken(),
            lat, lon,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            hour, minute,
        })
    console.log("Registering notification with data(API "+ API_BASE + "register):", data);
    await fetch(API_BASE + "register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
    });
} 

export async function reciveNotification(remoteMessage: any) {
    console.log('Notification received:', remoteMessage);
    const { title, body } = remoteMessage.notification || remoteMessage.data;
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
        },
        trigger: {
          type: 'timeInterval',
          seconds: 1,
          repeats: false,
        } as Notifications.TimeIntervalNotificationTrigger as Notifications.NotificationTriggerInput,
    });
}