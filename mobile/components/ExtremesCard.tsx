import { View, Text } from "react-native";

interface Props {
  todayMax: number;
  todayMin: number;
  yestMax: number;
  yestMin: number;
  deltaMax: number;
  deltaMin: number;
}
export default function ExtremesCard({
  todayMax,
  todayMin,
  yestMax,
  yestMin,
  deltaMax,
  deltaMin,
}: Props) {
  return (
    <View className="p-5 mt-4 rounded-2xl bg-white dark:bg-bgDark shadow-card">
      {/* 최고 */}
      <View className="flex-row justify-between items-end">
        <Text className="font-medium dark:text-textDark">최고기온</Text>
        <Text className="text-xl font-bold tabular-nums dark:text-textDark">
          {todayMax.toFixed(1)}℃
          <Text className="text-[#9A9A9A] dark:text-textDarkSub mt-1">
            {"  ("}
            {deltaMax >= 0 ? "+" : ""}
            {deltaMax.toFixed(1)}℃
            {")"}
          </Text>
        </Text>
      </View>
      <Text className="text-[#9A9A9A] mt-1">
        어제 {yestMax.toFixed(1)}℃
      </Text>

      {/* 구분선 */}
      <View className="h-px bg-[#E5E5E5] dark:bg-borderDark my-4" />

      {/* 최저 */}
      <View className="flex-row justify-between items-end">
        <Text className="font-medium dark:text-textDark">최저기온</Text>
        <Text className="text-xl font-bold tabular-nums dark:text-textDark">
          {todayMin.toFixed(1)}℃
          <Text className="text-[#9A9A9A] dark:text-textDarkSub mt-1">
            {"  ("}
            {deltaMin >= 0 ? "+" : ""}
            {deltaMin.toFixed(1)}℃
            {")"}
          </Text>
        </Text>
      </View>
      <Text className="text-[#9A9A9A] mt-1">
        어제 {yestMin.toFixed(1)}℃
      </Text>
    </View>
  );
}
