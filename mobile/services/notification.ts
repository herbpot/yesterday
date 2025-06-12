import { getCoords } from "./weather";
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as Notifications from "expo-notifications";

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

async function getUid(): Promise<string> {
  const KEY = 'user_uid';
  let uid = await SecureStore.getItemAsync(KEY);
  if (!uid) {
    uid = uuidv4();
    await SecureStore.setItemAsync(KEY, uid);
  }
  return uid;
}


export async function fetchNotification(fcm_token: string, { hour, minute }: { hour: number; minute: number }) {
    const { lat, lon } = await getCoords();
    const data = JSON.stringify({
            uid: await getUid(),
            fcm_token,
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