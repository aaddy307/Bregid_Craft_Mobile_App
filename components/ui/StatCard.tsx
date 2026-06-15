import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  unit?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  trend?: 'up' | 'down' | 'neutral';
  accentLeft?: boolean;
  onPress?: () => void;
}

export function StatCard({ title, value, subtitle, unit, icon, trend, accentLeft = false, onPress }: StatCardProps) {
  const displayValue = unit ? `${value} ${unit}` : value;
  return (
    <TouchableOpacity
      style={[styles.container, accentLeft && styles.containerAccent, onPress && styles.containerPressable]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        {icon && (
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={colors.leatherTan}
            />
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{displayValue}</Text>
        {trend && (
          <View style={[
            styles.trendBadge,
            trend === 'up' ? styles.trendUp : trend === 'down' ? styles.trendDown : styles.trendNeutral
          ]}>
            <MaterialCommunityIcons
              name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'minus'}
              size={12}
              color={trend === 'up' ? colors.success : trend === 'down' ? colors.error : colors.mutedSage}
            />
          </View>
        )}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    flex: 1,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 3,
  },
  containerAccent: {
    borderLeftWidth: 4,
    borderLeftColor: colors.leatherTan,
  },
  containerPressable: {
    cursor: 'pointer',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.mutedSage,
    letterSpacing: 0.8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  value: {
    ...typography.numericData,
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
  },
  trendBadge: {
    padding: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendUp: {
    backgroundColor: '#E8F5E9',
  },
  trendDown: {
    backgroundColor: '#FFEBEE',
  },
  trendNeutral: {
    backgroundColor: colors.surfaceContainer,
  },
  subtitle: {
    ...typography.bodyMd,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
});