import { getCoords } from "./weather";

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE

export async function fetchNotification(uid: string, fcm_token: string, { hour, minute }: { hour: number; minute: number }) {
    const { lat, lon } = await getCoords();
    await fetch(API_BASE + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            uid,
            fcm_token,
            lat, lon,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            hour, minute,
        }),
    });
} 