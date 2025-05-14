import { View, Text } from "react-native";

interface Props {
  now: number;
  yesterday: number;
  delta: number;
}
export default function DiffCard({ now, yesterday, delta }: Props) {
  const positive = delta >= 0;
  return (
    <View className="rounded-2xl p-6 bg-primary shadow-card">
      {/* Δ 온도 */}
      <Text className="text-white text-6xl font-bold tabular-nums">
        {positive ? "+" : ""}
        {delta.toFixed(1)}℃
      </Text>
      <Text className="text-white/80 mt-1">
        어제 같은 시간 대비
      </Text>

      {/* 현재·어제 절대값 */}
      <View className="flex-row justify-between mt-4">
        <Text className="text-white text-base">
          지금 {now.toFixed(1)}℃
        </Text>
        <Text className="text-white/70 text-base">
          어제 {yesterday.toFixed(1)}℃
        </Text>
      </View>
    </View>
  );
}
