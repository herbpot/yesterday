import { View, Text } from "react-native";

interface Props {
  label: string;
  value: string;
  icon: React.ReactNode;
}
export default function EnvCard({ label, value, icon }: Props) {
  return (
    <View className="flex-row items-center justify-between p-4 rounded-2xl bg-white dark:bg-bgDark shadow-card mt-3">
      {icon}
      <Text className="text-base font-medium">{label}</Text>
      <Text className="text-lg font-bold">{value}</Text>
    </View>
  );
}
