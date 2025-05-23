import { useEffect, useState, useRef } from "react";
import {
  Platform,
  ScrollView,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Provider as PaperProvider, Snackbar } from "react-native-paper";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePickerModal from "react-native-modal-datetime-picker";

/* 🔸 AdMob */
import mobileAds, {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import messaging from "@react-native-firebase/messaging"

import DiffCard from "../components/DiffCard";
import ExtremesCard from "../components/ExtremesCard";
import {
  fetchCompare,
  fetchExtremes,
  CompareResult,
  ExtremesResult,
} from "../services/weather";
import { 
  fetchNotification,
  reciveNotification,
} from "../services/notification";

/* ─── 상수 ─────────────────────────────────────────────── */
const STORAGE_KEY = "alarmTime";
const BANNER_ID = "ca-app-pub-4388792395765448/9451868044"; // 👉 실제 배포 시 실 광고 단위 ID로 교체

/* ─── Firebase 초기화 ────────────────────────────────── */
const app = initializeApp()
const analytics = getAnalytics(app);

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  await reciveNotification(remoteMessage);
});


/* ─── 유틸: 알람 저장/로드/스케줄 ────────────────────── */
async function saveAlarmTime(h: number, m: number) {
  await AsyncStorage.setItem(STORAGE_KEY, `${h}:${m}`);
}
async function loadAlarmTime(): Promise<[number, number] | null> {
  const v = await AsyncStorage.getItem(STORAGE_KEY);
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  return [h, m];
}

const configureAdMob = async () => {
  await mobileAds().initialize();
};


/* ─── Home ───────────────────────────────────────────── */
export default function Home() {
  const [cmp, setCmp] = useState<CompareResult | null>(null);
  const [ext, setExt] = useState<ExtremesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [snack, setSnack] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [alarmTime, setAlarmTime] = useState<Date>(new Date());
  const [token, setToken] = useState<string | null>(null);

  /* 초기 로딩 */
  useEffect(() => {
    (async () => {
      try {
        await configureAdMob();
        const adapterStatuses = await mobileAds().initialize();
        console.log(adapterStatuses);
        const { status } = await Notifications.requestPermissionsAsync();
        if (status == "granted") {
          const t = await messaging().getToken();
          setToken(t);
        }
        const [c, e] = await Promise.all([fetchCompare(), fetchExtremes()]);
        setCmp(c);
        setExt(e);

        const saved = await loadAlarmTime();
        if (saved) {
          const d = new Date();
          d.setHours(saved[0], saved[1], 0, 0);
          setAlarmTime(d);
        }

      } catch (e: any) {
        setErr(e.message || "데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!token || !alarmTime) return;
    fetchNotification(token, { hour: alarmTime.getHours(), minute: alarmTime.getMinutes() })
      .catch(err => console.warn('register failed', err));
  }, [token, alarmTime]);

  const onConfirm = (d: Date) => {
    setShowPicker(false);
    setAlarmTime(d);
    saveAlarmTime(d.getHours(), d.getMinutes());
    fetchNotification(token!, { hour: d.getHours(), minute: d.getMinutes()});
    setSnack(true);
  };

  /* 상태별 뷰 */
  if (loading) return <ActivityIndicator size="large" className="flex-1" />;
  if (err)
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-center text-lg">{err}</Text>
      </View>
    );
  if (!cmp || !ext) return null;

  /* ─── UI ──────────────────────────────────────────── */
  return (
    <PaperProvider>
      <SafeAreaView className="flex-1 bg-bgLight dark:bg-bgDark">
        {/* ⬇ 2 px 아래로 전체 이동 */}
        <ScrollView
          className="flex-1 mt-[2px] px-4 pt-6 space-y-6"
          showsVerticalScrollIndicator={false}
        >
          <DiffCard
            now={cmp.now}
            yesterday={cmp.yesterday}
            delta={cmp.delta}
          />

          <ExtremesCard
            todayMax={ext.today_max}
            todayMin={ext.today_min}
            yestMax={ext.yest_max}
            yestMin={ext.yest_min}
            deltaMax={ext.delta_max}
            deltaMin={ext.delta_min}
          />

          {/* 알림 카드 */}
          <View className="rounded-2xl bg-cardDark p-6">
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              activeOpacity={0.9}
              className="rounded-xl py-3 items-center bg-primary/20 border border-primary/40"
            >
              <Text className="text-primary font-medium">알림 시간 설정</Text>
            </TouchableOpacity>

            <DateTimePickerModal
              isVisible={showPicker}
              mode="time"
              is24Hour
              date={alarmTime}
              onConfirm={onConfirm}
              onCancel={() => setShowPicker(false)}
            />

            <Text className="text-center mt-4 text-textDark tabular-nums">
              현재 예약 |{" "}
              {alarmTime.getHours().toString().padStart(2, "0")}:
              {alarmTime.getMinutes().toString().padStart(2, "0")}
            </Text>
          </View>
        </ScrollView>

        {/* 📢 AdMob 하단 배너 */}
        <BannerAd
          unitId={BANNER_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        />
      </SafeAreaView>

      {/* 저장 알림 */}
      <Snackbar
        visible={snack}
        onDismiss={() => setSnack(false)}
        duration={2500}
        theme={{ colors: { accent: "#4A90E2" } }}
        action={{ label: "확인", onPress: () => {} }}
      >
        알림 시간이 저장되었습니다!
      </Snackbar>
    </PaperProvider>
  );
}
