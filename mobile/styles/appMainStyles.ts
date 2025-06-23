// src/styles/appMainStyles.ts
import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors'; // COLORS import
import { FONTS } from '../constants/fonts'; // FONTS import

const styles = StyleSheet.create({
  container: {
		flex: 1, // SafeAreaView가 남은 공간을 모두 차지 (헤더 아래, 배너 위)
		backgroundColor: COLORS.background,
        // paddingTop는 전체 View에서 이미 처리
	},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  iconBtn: { width: 48, alignItems: "flex-end" },
  iconBtnl: { width: 48, alignItems: "flex-start" },

  centerBox: {
     flex: 1, // 로딩/에러 상태일 때 전체 SafeAreaView 공간 차지
     justifyContent: "center",
     alignItems: "center",
     // 헤더 높이만큼 상단 패딩 추가하여 헤더 영역을 피함 (대략적인 값)
     paddingTop: 50, // 실제 헤더 높이에 따라 조절 필요
  },
  errText: { color: "red" },

  // ScrollView 내부 콘텐츠 컨테이너 스타일
  scrollViewContent: {
      alignItems: 'center', // ScrollView 내 모든 자식 요소를 가로 중앙 정렬
      paddingHorizontal: 16,
      paddingBottom: 20, // ScrollView 끝에 여유 공간 추가
      flexGrow: 1, // ScrollView 내에서 컨텐츠가 최소한 화면 높이를 차지하도록 함
  },
  // 초기 표시되는 날씨 정보 그룹 스타일
  bodyContent: {
      alignItems: "center",
      width: "100%", // 부모(scrollViewContent)의 패딩 고려하여 100% 너비
      // marginVertical 등을 이곳에 적용
  },
  imgWrapper: {
    width: "30%",
    maxWidth: 400,
    aspectRatio: 16 / 16,
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 24,
  },

  infoGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },
  // card, cardLabel, cardValue 스타일은 InfoCard.tsx로 이동했습니다.
  // badge, badgeText 스타일은 DiffBadge.tsx로 이동했습니다.

  cta: { // 사용되지 않는 스타일? 필요시 활용
    backgroundColor: COLORS.accent,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  ctaTxt: { color: "#fff", fontWeight: "700" },

  // 아래쪽 화살표 버튼 스타일
  scrollDownButton: {
       position: 'absolute', // 절대 위치
       left: 0,
       right: 0,
       alignItems: 'center', // 가로 중앙 정렬
       zIndex: 1, // 다른 콘텐츠 위에 표시
       padding: 10, // 터치 영역 확보
       // bottom 위치는 AppMainScreen.tsx에서 계산하여 인라인 스타일로 적용합니다.
  },
});

export default styles;