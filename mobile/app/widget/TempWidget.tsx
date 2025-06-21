// TempWidget.tsx
import {
  FlexWidget,
  TextWidget,
  ImageWidget,
} from 'react-native-android-widget';
import type { ParsedWeather } from '../../services/weather_'; // 날씨 데이터 타입
import { WEATHER_IMAGES } from '../../services/weather_';     // 날씨 아이콘 매핑

// 색상 정의 (카드 배경을 반투명 흰색으로 변경)
const COLORS = {
  primary: '#f74f4f',
  text: '#FFFFFF', // 반투명 배경 위에서는 흰색 텍스트가 더 잘 보일 수 있습니다. 필요에 따라 조정하세요.
  subText: '#B0BEC5', // 흰색 계열의 부제목 텍스트 (조정 가능)
  cardBackground: "rgba(0, 0, 0, 0.3)", // 예시: 검은색 배경에 30% 투명도 (어두운 반투명)
                                         // 또는 "rgba(255, 255, 255, 0.7)" (흰색 배경에 70% 불투명도)
  // 위젯이 놓일 배경화면에 따라 cardBackground와 텍스트 색상을 적절히 조정해야 가독성이 확보됩니다.
};

export interface TempWidgetProps {
  data: ParsedWeather | null;
  loading?: boolean;
  error?: string;
}

export function TempWidget({ data, loading, error }: TempWidgetProps) {
  if (loading) {
    return (
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          padding: 16,
          backgroundColor: COLORS.cardBackground, // 반투명 배경 적용
          borderRadius: 24,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text="날씨 정보 로딩 중..." style={{ fontSize: 16, color: COLORS.text }} />
      </FlexWidget>
    );
  }

  if (error || !data) {
    return (
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          padding: 16,
          backgroundColor: COLORS.cardBackground, // 반투명 배경 적용
          borderRadius: 24,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text={error || "날씨 정보를 불러올 수 없습니다."} style={{ fontSize: 16, color: COLORS.primary }} />
        <TextWidget text="위젯을 다시 추가하거나 앱을 확인해주세요." style={{ fontSize: 12, color: COLORS.subText, marginTop: 4 }} />
      </FlexWidget>
    );
  }

  const diff = Math.round(data.todayTemp - data.yesterdayTemp);
  const diffPrefix = diff > 0 ? '+' : '';
  // 반투명 배경에서는 텍스트 색상 대비가 중요합니다.
  const diffColor = diff > 0 ? '#FF8A80' : '#80D8FF'; // 예시: 밝은 빨강, 밝은 파랑
  const diffArrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '▪';
  const weatherIconResource = WEATHER_IMAGES[data.imageKey] || 'ic_default_weather';

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
        backgroundColor: COLORS.cardBackground, // 반투명 배경 적용
        borderRadius: 24,
      }}
    >
      {/* ◀︎ 좌측 : 날씨 아이콘 */}
      <FlexWidget
        style={{
          width: 80,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}
      >
        <ImageWidget
          image={weatherIconResource}
          imageWidth={64}
          imageHeight={64}
          style={{ width: 64, height: 64 }}
        />
        <TextWidget
          text={data.description}
          style={{ fontSize: 13, color: COLORS.subText, marginTop: 4 }} // 텍스트 색상 확인
          maxLines={1}
        />
      </FlexWidget>

      {/* ▶︎ 우측 : 현재 기온 + 어제와 비교 */}
      <FlexWidget
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <TextWidget
          text={`${data.todayTemp}°C`}
          style={{
            fontSize: 36,
            color: COLORS.text, // 텍스트 색상 확인
            fontWeight: 'bold',
          }}
        />
        <TextWidget
          text={`${diffArrow} ${diffPrefix}${Math.abs(diff)}° 어제보다`}
          style={{
            fontSize: 14,
            color: diffColor, // 텍스트 색상 확인
            marginTop: 2,
          }}
          maxLines={1}
        />
      </FlexWidget>
    </FlexWidget>
  );
}