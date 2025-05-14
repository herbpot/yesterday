import { VictoryLine, VictoryChart, VictoryAxis } from "victory-native";
import { HourlyWeather } from "../services/weather";

interface Props {
  dataToday: HourlyWeather;
  dataYesterday: HourlyWeather;
}

const parse = (arr: HourlyWeather) =>
  arr.time.map((t, i) => ({ x: i, y: arr.temperature_2m[i] }));

export default function HourlyChart({ dataToday, dataYesterday }: Props) {
  return (
    <VictoryChart height={200} padding={20}>
      <VictoryAxis
        tickValues={[0, 6, 12, 18, 23]}
        tickFormat={["0h", "6h", "12h", "18h", "24h"]}
        style={{ tickLabels: { fontSize: 12 } }}
      />
      <VictoryLine data={parse(dataYesterday)} style={{ data: { stroke: "#9A9A9A" } }} />
      <VictoryLine data={parse(dataToday)} style={{ data: { stroke: "#FF6501" } }} />
    </VictoryChart>
  );
}
