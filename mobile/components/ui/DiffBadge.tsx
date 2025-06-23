// src/components/ui/DiffBadge.tsx
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../constants/colors'; // COLORS import

type DiffProps = { diff: number; unit?: string };

const DiffBadge = memo(({ diff, unit = "" }: DiffProps) => {
  const up = diff >= 0;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: up ? COLORS.positiveBg : COLORS.negativeBg },
      ]}
    >
      <Svg width={12} height={12} viewBox="0 0 24 24" fill={up ? COLORS.positive : COLORS.negative}>
        <Path d={up ? "M12 4l6 8H6z" : "M12 20l-6-8h12z"} />
      </Svg>
      <Text
        style={[
          styles.badgeText,
          { color: up ? COLORS.positive : COLORS.negative },
        ]}
      >
        {up ? "+" : ""}
        {Math.abs(diff).toFixed(1)}
        {unit}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 4,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
});

export default DiffBadge;