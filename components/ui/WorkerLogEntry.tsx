import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { ProductionLog } from '../../services/production';
import { formatEUSize, formatDateTime } from '../../utils';

interface WorkerLogEntryProps {
  log: ProductionLog;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

export function WorkerLogEntry({ log, onEdit, onDelete, canEdit = false }: WorkerLogEntryProps) {
  const isToday = log.logDate === new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{log.productName}</Text>
          <Text style={styles.sku}>SKU: {log.sku}</Text>
        </View>
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityValue}>{log.quantityPairs}</Text>
          <Text style={styles.quantityLabel}>pairs</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="ruler" size={14} color={colors.mutedSage} />
          <Text style={styles.detailText}>{formatEUSize(log.euSize)}</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="texture-box" size={14} color={colors.mutedSage} />
          <Text style={styles.detailText}>{(log.leatherDeductedSqf ?? 0).toFixed(2)} sqf</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.timestamp}>{formatDateTime(log.timestamp)}</Text>
        {canEdit && isToday && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={onEdit} style={styles.actionButton} activeOpacity={0.7}>
              <MaterialCommunityIcons name="pencil" size={18} color={colors.leatherTan} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.actionButton} activeOpacity={0.7}>
              <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onSurface,
  },
  sku: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    marginTop: 2,
  },
  quantityBadge: {
    backgroundColor: colors.leatherTan,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.card,
    alignItems: 'center',
    minWidth: 60,
  },
  quantityValue: {
    ...typography.numericData,
    fontSize: 18,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  quantityLabel: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.onPrimary,
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  details: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timestamp: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 6,
  },
});