// NotificationSettings.tsx
import React, { useEffect, useState } from "react";
import {
  StatusBar,
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";
import { fetchNotification } from "services/notification"; // 푸시 알림 서비스 (필요시 추가)

/* ───── keys ───── */
const STORE_KEY = "weather-settings";
type Settings = {
  enabled: boolean;
  hour: number; // 0-23
  minute: number;
};

export default function NotificationSettings() {
  const nav = useNavigation();
  const [settings, setSettings] = useState<Settings>({
    enabled: false,
    hour: 8,
    minute: 0,
  });
  const [showPicker, setShowPicker] = useState(false);

  /* ─── 저장된 설정 불러오기 ─── */
  useEffect(() => {
    (async () => {
      const json = await AsyncStorage.getItem(STORE_KEY);
      if (json) setSettings(JSON.parse(json));
    })();
  }, []);

  /* ─── 상태 변경 시 저장 & (비)예약 ─── */
  useEffect(() => {
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(settings));
  }, [settings]);

  /* 권한 요청 */
  const requestPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") await Notifications.requestPermissionsAsync();
  };

  const toggleSwitch = () => {
    if (!settings.enabled) requestPermission();
    setSettings({ ...settings, enabled: !settings.enabled });
    fetchNotification({ hour: 8, minute: 0 }); // 푸시 알림 등록
  };

  const onTimeChange = (_: any, date?: Date) => {
    setShowPicker(Platform.OS === "ios"); // iOS는 계속 open
    if (date){
      setSettings({ ...settings, hour: date.getHours(), minute: date.getMinutes() });
      fetchNotification({ hour: date.getHours(), minute: date.getMinutes() }); // 푸시 알림 등록
    }

  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="#1B1F23">
            <Path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.title}>알림 설정</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 토글 */}
      <View style={styles.row}>
        <Text style={styles.label}>매일 알림 받기</Text>
        <Switch value={settings.enabled} onValueChange={toggleSwitch} />
      </View>

      {/* 시간 선택 */}
      {settings.enabled && (
        <>
          <TouchableOpacity
            style={styles.timeBtn}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.timeTxt}>
              {`${settings.hour.toString().padStart(2, "0")}:${settings.minute
                .toString()
                .padStart(2, "0")}`}
            </Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={new Date(
                0,
                0,
                0,
                settings.hour,
                settings.minute,
              )}
              mode="time"
              onChange={onTimeChange}
            />
          )}
        </>
      )}
    </View>
  );
}

/* ───── 스타일 ───── */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 24, 
    backgroundColor: "#fff", 
    paddingTop: StatusBar.currentHeight || 0
    
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  label: { fontSize: 16 },
  timeBtn: {
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  timeTxt: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
