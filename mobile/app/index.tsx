import { useEffect, useState } from "react";
import { ScrollView, ActivityIndicator, View, Text } from "react-native";
import DiffCard from "../components/DiffCard";
import ExtremesCard from "../components/ExtremesCard";
import {
  fetchCompare,
  fetchExtremes,
  CompareResult,
  ExtremesResult,
} from "../services/weather";

export default function Home() {
  const [cmp, setCmp] = useState<CompareResult | null>(null);
  const [ext, setExt] = useState<ExtremesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, e] = await Promise.all([
          fetchCompare(),
          fetchExtremes(),
        ]);
        setCmp(c);
        setExt(e);
      } catch (e: any) {
        setErr(e.message || "데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ActivityIndicator size="large" className="flex-1" />;
  if (err)
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-center text-lg">{err}</Text>
      </View>
    );

  if (!cmp || !ext) return null;

  return (
    <ScrollView className="flex-1 px-4 pt-6 bg-white dark:bg-bgDark">
      {/* Δ 카드 */}
      <DiffCard
        now={cmp.now}
        yesterday={cmp.yesterday}
        delta={cmp.delta}
      />

      {/* 최고·최저 카드 */}
      <ExtremesCard
        todayMax={ext.today_max}
        todayMin={ext.today_min}
        yestMax={ext.yest_max}
        yestMin={ext.yest_min}
        deltaMax={ext.delta_max}
        deltaMin={ext.delta_min}
      />

      {/* 환경 카드 예시 (API 연동 전) */}
      {/* <EnvCard label="미세먼지" value="30 ㎍/㎥" icon={<></>} /> */}
    </ScrollView>
  );
}
