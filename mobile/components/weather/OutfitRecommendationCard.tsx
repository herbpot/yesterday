import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

interface OutfitRecommendationCardProps {
  content: string;
}

const OutfitRecommendationCard: React.FC<OutfitRecommendationCardProps> = ({content}: {content: string}) => {
  return (
    <View style={styles.cardContainer}>
      {/* <Text style={styles.cardHeader}>오늘의 추천 옷차림</Text> */}
      <Text style={styles.recommendationText}>
        {content}
      </Text>
      {/* TODO: 코디 이미지 영역 추가 예정 */}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.cardBackground, // 연한 배경색 (COLORS에 추가 필요)
    borderRadius: 12,
    marginHorizontal: 16, // 좌우 여백
    padding: 16,
    marginTop: 20, // 핵심 날씨 정보 아래에 배치되므로 상단 여백
    marginBottom: 10, // 상세 날씨 정보 카드 위에 배치되므로 하단 여백
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3, // Android 그림자
  },
  cardHeader: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});

export default OutfitRecommendationCard;
