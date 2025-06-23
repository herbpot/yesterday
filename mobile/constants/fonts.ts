// src/constants/fonts.ts
import { TextStyle } from 'react-native';

export const FONTS: { [key: string]: TextStyle } = {
  display: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  body: { fontSize: 16, lineHeight: 24 },
  // 필요에 따라 다른 폰트 스타일 추가
};