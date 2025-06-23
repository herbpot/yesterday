// src/components/ui/InfoCard.tsx
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DiffBadge from './DiffBadge'; // DiffBadge import
import { COLORS } from '../../constants/colors'; // COLORS import
import { FONTS } from '../../constants/fonts'; // FONTS import

type CardProps = { label: string; value: string; diff?: number; unit?: string };

const InfoCard = memo(({ label, value, diff, unit = "" }: CardProps) => (
  <View style={styles.card}>
    <Text style={styles.cardLabel}>{label}</Text>
    <Text style={styles.cardValue}>{value}</Text>
    {diff !== undefined && <DiffBadge diff={diff} unit={unit} />}
  </View>
));

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: "600", color: COLORS.text },
  // DiffBadge 스타일은 DiffBadge.tsx에 있습니다.
});

export default InfoCard;