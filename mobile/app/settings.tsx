import { View, Switch, Text } from "react-native";
import { useState } from "react";

export default function Settings() {
  const [push, setPush] = useState(true);

  return (
    <View className="flex-1 px-4 pt-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-medium">푸시 알림</Text>
        <Switch value={push} onValueChange={setPush} />
      </View>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-medium">단위 (℃/℉)</Text>
        {/* 단위 토글 구현 */}
      </View>
    </View>
  );
}
