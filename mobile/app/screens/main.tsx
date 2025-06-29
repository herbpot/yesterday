// src/screens/AppMainScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  StatusBar,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet // StyleSheet import 필요
} from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';
import { Gesture, GestureDetector, Directions, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';

import { COLORS } from '../../constants/colors';

import DiffView from '../../components/ui/DiffView';

import styles from '../../styles/appMainStyles'; // 기존 스타일 시트
import { FONTS } from "~/constants/fonts";

const BANNER_ID = "ca-app-pub-4388792395765448/9451868044"; // 👉 실제 배포 시 실 광고 단위 ID로 교체 (상수로 이동 고려)

// ⭐ 최상단 View 스타일을 StyleSheet.create로 관리
const mainContainerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: StatusBar.currentHeight || 0,
  },
  // 하단 광고 배너 래퍼 스타일 (기존 인라인 스타일을 옮김)
  bannerWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // ⭐ 위 방향 화살표 컨테이너 스타일 추가
  swipeIndicatorContainer: {
    alignItems: 'center', // 가운데 정렬
    // paddingVertical: 8, // 위아래 여백
    justifyContent: 'flex-end'
    // backgroundColor: 'rgba(0,255,0,0.1)' // 레이아웃 확인용 임시 배경색
  }
});


export default function AppMain({ navigation }: { navigation: any }) { // AppMainScreenProps
  const [diffViewKey, setDiffViewKey] = useState(0);

  // ⭐ key 값을 증가시켜 DiffView를 강제로 새로고침(언마운트/마운트)하는 함수
  const refreshDiffView = useCallback(() => {
    console.log("DiffView 새로고침 트리거");
    setDiffViewKey(prevKey => prevKey + 1);
  }, []);

  const handlePressSettings = useCallback(() => {
    navigation.navigate("Settings");
  }, [navigation]); // navigation 의존성 추가

  const handleAdFailedToLoad = useCallback(() => {
    console.error('광고 로드 실패');
  }, []); // 빈 의존성 배열

  const handleAdLoaded = useCallback(() => {
    console.log('광고 로드 성공');
  }, []); // 빈 의존성 배열

  // JS 스레드에서 내비게이션을 수행하는 함수
  const navigateToChart = useCallback(() => {
      console.log('JS 스레드에서 navigate 호출');
      navigation.navigate('ChartScreen');
  }, [navigation]); // navigation 사용하므로 의존성 추가

  // Swipe UP 제스처 감지
  const swipeUpGesture = useMemo(() => {
    console.log('Swipe Up 제스처 객체 생성');
    return Gesture.Fling()
      .direction(Directions.UP) // UP 방향
      .onEnd(() => {
        console.log('Swipe Up detected');
        runOnJS(navigateToChart)();
      });
  }, [navigateToChart]); // navigateToChart 함수가 변경될 때만 제스처 객체 재생성 (useCallback으로 안정화됨)


  return (
    // ⭐ StyleSheet로 정의된 최상단 컨테이너 스타일 사용
    <View style={mainContainerStyles.container}>
          <SafeAreaView style={styles.container}> {/* styles.container는 flex: 1 */}
          <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
              <TouchableOpacity
                style={styles.iconBtnl}
                accessibilityLabel="알림설정"
                onPress={() => runOnJS(handlePressSettings)()}
              >
                <Svg width={22} height={22} viewBox="0 0 48 48" fill={COLORS.text}>
                  <Path d="M40.62,28.34l-.87-.7A2,2,0,0,1,39,26.08V18A15,15,0,0,0,26.91,3.29a3,3,0,0,0-5.81,0A15,15,0,0,0,9,18v8.08a2,2,0,0,1-.75,1.56l-.87.7a9,9,0,0,0-3.38,7V37a4,4,0,0,0,4,4h8.26a8,8,0,0,0,15.47,0H40a4,4,0,0,0,4-4V35.36A9,9,0,0,0,40.62,28.34ZM24,43a4,4,0,0,1-3.44-2h6.89A4,4,0,0,1,24,43Zm16-6H8V35.36a5,5,0,0,1,1.88-3.9l.87-.7A6,6,0,0,0,13,26.08V18a11,11,0,0,1,22,0v8.08a6,6,0,0,0,2.25,4.69l.87.7A5,5,0,0,1,40,35.36Z"/>
                </Svg>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>살짝더</Text>
              <TouchableOpacity
                style={styles.iconBtn}
                accessibilityLabel="현재 위치로 새로고침"
                onPress={refreshDiffView}
              >
                <Svg width={22} height={22} viewBox="0 0 150 150" fill={COLORS.text}>
                  <Path d="M16.08,59.26A8,8,0,0,1,0,59.26a59,59,0,0,1,97.13-45V8a8,8,0,1,1,16.08,0V33.35a8,8,0,0,1-8,8L80.82,43.62a8,8,0,1,1-1.44-15.95l8-.73A43,43,0,0,0,16.08,59.26Zm22.77,19.6a8,8,0,0,1,1.44,16l-10.08.91A42.95,42.95,0,0,0,102,63.86a8,8,0,0,1,16.08,0A59,59,0,0,1,22.3,110v4.18a8,8,0,0,1-16.08,0V89.14h0a8,8,0,0,1,7.29-8l25.31-2.3Z"/>
                </Svg>
              </TouchableOpacity>
            </View>

            <GestureDetector gesture={swipeUpGesture}>
              <Animated.View style={{ flex: 1 }}>
                <DiffView key={diffViewKey}/>

                <View style={mainContainerStyles.swipeIndicatorContainer}>
                    <Svg width={30} height={30} viewBox="0 0 24 24" fill={COLORS.text}>
                        <Path d="M7 14l5-5 5 5z"/>
                    </Svg>
                </View>
              </Animated.View>
            </GestureDetector>

          </SafeAreaView>

      <View style={mainContainerStyles.bannerWrapper}>
        <BannerAd
          unitId={BANNER_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdFailedToLoad={handleAdFailedToLoad}
          onAdLoaded={handleAdLoaded}
        />
      </View>
    </View>
  );
}