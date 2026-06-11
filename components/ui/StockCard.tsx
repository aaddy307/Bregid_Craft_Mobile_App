import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';

interface StockCardProps {
  title: string;
  value: string | number;
  unit: string;
  isLow?: boolean;
  threshold?: number;
  subtitle?: string;
}

export function StockCard({ title, value, unit, isLow = false, threshold, subtitle }: StockCardProps) {
  return (
    <View style={[styles.container, isLow && styles.lowStockContainer]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        {isLow && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>LOW</Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, isLow && styles.lowValue]}>{value}</Text>
      <View style={styles.unitRow}>
        <Text style={styles.unit}>{unit}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {threshold !== undefined && (
        <Text style={styles.threshold}>Min: {threshold}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    minWidth: 100,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 3,
  },
  lowStockContainer: {
    borderColor: colors.error,
    backgroundColor: '#FFF5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.mutedSage,
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.pill,
  },
  badgeText: {
    ...typography.labelCaps,
    fontSize: 8,
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  value: {
    ...typography.numericData,
    fontSize: 24,
    fontWeight: '700',
    color: colors.onSurface,
  },
  lowValue: {
    color: colors.error,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unit: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  subtitle: {
    ...typography.bodyMd,
    fontSize: 11,
    color: colors.mutedSage,
    marginTop: 2,
  },
  threshold: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    marginTop: 8,
    fontSize: 11,
    fontStyle: 'italic',
  },
});