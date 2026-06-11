import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';

interface LowStockBadgeProps {
  material: 'leather' | 'buckle' | 'footbed';
}

const MATERIAL_LABELS = {
  leather: 'Leather',
  buckle: 'Buckles',
  footbed: 'Footbeds',
};

export function LowStockBadge({ material }: LowStockBadgeProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="alert-circle" size={14} color={colors.error} />
      <Text style={styles.text}>Low Stock: {MATERIAL_LABELS[material]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: colors.errorContainer,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pill,
  },
  text: {
    ...typography.labelCaps,
    fontSize: 11,
    color: colors.error,
  },
});