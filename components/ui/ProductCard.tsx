import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { Product } from '../../store';
import { formatEUSize } from '../../utils';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  showEdit?: boolean;
  onEdit?: () => void;
  showDelete?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function ProductCard({ product, onPress, showEdit = false, onEdit, showDelete = false, onDelete, isDeleting = false }: ProductCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress || isDeleting}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.genderBadge, { backgroundColor: product.gender === 'Men' ? colors.primary : colors.leatherTan }]}>
          <Text style={styles.genderText}>{product.gender}</Text>
        </View>
        <View style={styles.headerActions}>
          {showEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn} disabled={isDeleting} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="pencil" size={18} color={colors.mutedSage} />
            </TouchableOpacity>
          )}
          {showDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionBtn} disabled={isDeleting} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.sku}>SKU: {product.sku}</Text>

      <View style={styles.sizesContainer}>
        {product.sizes.map((size) => (
          <View key={size} style={styles.sizePill}>
            <Text style={styles.sizeText}>{formatEUSize(size)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.materialsContainer}>
        <View style={styles.materialItem}>
          <MaterialCommunityIcons name="texture-box" size={14} color={colors.mutedSage} />
          <Text style={styles.materialText}>
            {product.leatherSqfPerPair > 0 ? `${product.leatherSqfPerPair} sqf` : '—'}
          </Text>
        </View>
        <View style={styles.materialItem}>
          <MaterialCommunityIcons name="circle-outline" size={14} color={colors.mutedSage} />
          <Text style={styles.materialText}>
            {product.bucklePerPair > 0 ? `${product.bucklePerPair} pcs` : '—'}
          </Text>
        </View>
        <View style={styles.materialItem}>
          <MaterialCommunityIcons name="layers-triple" size={14} color={colors.mutedSage} />
          <Text style={styles.materialText}>
            {product.footbedType || '—'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
    alignItems: 'center',
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  genderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.pill,
  },
  genderText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  name: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 4,
  },
  sku: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    marginBottom: 12,
  },
  sizesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  sizePill: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sizeText: {
    ...typography.bodyMd,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  materialsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  materialText: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.mutedSage,
  },
});