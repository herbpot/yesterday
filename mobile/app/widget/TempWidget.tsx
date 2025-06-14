import {
  FlexWidget,
  TextWidget,
  ImageWidget,
} from 'react-native-android-widget';
import type { ParsedWeather } from '../../services/weather_';
import { WEATHER_IMAGES } from '../../services/weather_';

const COLORS = {
  primary: '#f74f4f',
  text: '#222222',
  subText: '#4FC3F7',
  card: '#FFFFFFFF',     // 8자리 → 알파 고정
};

export function TempWidget({ data }: { data: ParsedWeather }) {
  const diff = data.todayTemp - data.yesterdayTemp;
  const diffPrefix = diff > 0 ? '+' : '';      // 양수 기호
  const diffColor = diff > 0 ? COLORS.primary : COLORS.subText;
  const diffArrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '▪';

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        width: 'match_parent',
        height: 'match_parent',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        borderRadius: 24,
        elevation: 2,         // 일부 런처에서 그림자
      }}
    >
      {/* ◀︎ 좌측 : 아이콘 + 설명 */}
      <FlexWidget
        style={{
          width: 88,           // 고정 폭 : 아이콘 + 텍스트
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ImageWidget
          image={WEATHER_IMAGES[data.imageKey]}
          imageWidth={72}
          imageHeight={72}
          style={{ width: 72, height: 72, marginBottom: 4 }}
        />
        {/* <TextWidget
          text={data.description}        // 예: '맑음'
          style={{ fontSize: 14, color: COLORS.subText }}
          maxLines={1}
        /> */}
      </FlexWidget>

      {/* ▶︎ 우측 : 현재 기온 + 전일 대비 */}
      <FlexWidget
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingLeft: 12,
        }}
      >
        <TextWidget
          text={`${data.todayTemp}°C`}
          style={{ fontSize: 32, color: COLORS.text, fontWeight: '700' }}
        />
        <TextWidget
          text={`${diffArrow} ${diffPrefix}${Math.abs(diff)}°C 어제보다`}
          style={{ fontSize: 14, color: diffColor }}
          maxLines={1}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
