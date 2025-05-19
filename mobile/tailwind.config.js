/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* 브랜드 - 부드러운 파란색 */
        primary: "#4A90E2",

        /* 라이트모드 */
        bgLight: "#FFFFFF",

        /* 다크모드 */
        bgDark: "#121212",
        cardDark: "#1E293B",      // 네이비에 가까운 진한 파란색
        borderDark: "#2E4A76",    // 카드 테두리용 조금 밝은 파랑
        textDark: "#D8E6FF",      // 밝은 하늘색 텍스트
        textDarkSub: "#8CA2C6",   // 서브 텍스트용 연한 하늘색
      },
      borderRadius: { "2xl": "16px" },
      boxShadow: { card: "0 4px 8px rgba(0,0,0,0.06)" },
    },
  },
  plugins: [],
};
