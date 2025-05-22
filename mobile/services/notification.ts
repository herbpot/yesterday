import { getCoords } from "./weather";
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';

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
    await fetch(API_BASE + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            uid: await getUid(),
            fcm_token,
            lat, lon,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            hour, minute,
        }),
    });
} 