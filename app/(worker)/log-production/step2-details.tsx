import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../../constants';
import { AppHeader } from '../../../components/ui';
import { useProductStore, useStockStore, Product } from '../../../store';
import { formatEUSize } from '../../../utils';
import { calculateDeduction, validateStock } from '../../../utils/stockCalculator';

export default function Step2Details() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId: string }>();
  const { getProductById } = useProductStore();
  const stock = useStockStore((state) => state.stock);

  const [product, setProduct] = useState<Product | null>(() => getProductById(params.productId || '') || null);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSelectedSize(null);
      setQuantity('1');
      setError(null);
    }, [])
  );

  useEffect(() => {
    if (params.productId) {
      const p = getProductById(params.productId);
      setProduct(p || null);
    }
  }, [params.productId]);

  const qty = parseInt(quantity) || 0;
  const deduction = product && qty > 0 && selectedSize ? calculateDeduction(product, selectedSize, qty) : null;
  const validation = deduction && stock ? validateStock(stock, deduction) : null;

  const handleContinue = () => {
    if (!selectedSize || !product) {
      setError('Please select a size');
      return;
    }
    if (qty < 1) {
      setError('Quantity must be at least 1');
      return;
    }
    if (validation && !validation.valid) {
      setError(validation.message || 'Insufficient stock');
      return;
    }

    setError(null);
    router.push({
      pathname: '/log-production/step3-confirm',
      params: {
        productId: product._id,
        size: selectedSize.toString(),
        quantity,
      },
    });
  };

  if (!product) {
    return (
      <View style={styles.container}>
        <AppHeader title="Confirm Details" showBack />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Product not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Select Size & Quantity" showBack />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.stepIndicator}>Step 2 of 3</Text>

        <View style={styles.productPreview}>
          <View style={styles.productPreviewContent}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productSku}>SKU: {product.sku}</Text>
            </View>
            <View style={[styles.genderBadge, { backgroundColor: product.gender === 'Men' ? colors.primary : colors.leatherTan }]}>
              <Text style={styles.genderBadgeText}>{product.gender.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>SELECT EU SIZE</Text>
        <View style={styles.sizesGrid}>
          {product.sizes.map((size) => {
            const isSelected = selectedSize === size;
            return (
              <TouchableOpacity
                key={size}
                style={[styles.sizeOption, isSelected && styles.sizeOptionActive]}
                onPress={() => setSelectedSize(size)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sizeText, isSelected && styles.sizeTextActive]}>
                  {formatEUSize(size)}
                </Text>
                {isSelected && <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} style={styles.sizeCheck} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>ENTER QUANTITY</Text>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity(String(Math.max(1, qty - 1)))}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="minus" size={28} color={colors.onSurface} />
          </TouchableOpacity>
          <TextInput
            style={styles.qtyInput}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            textAlign="center"
          />
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity(String(qty + 1))}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="plus" size={28} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        {deduction && (
          <View style={styles.deductionCard}>
            <View style={styles.deductionHeader}>
              <MaterialCommunityIcons name="package-variant" size={20} color={colors.leatherTan} />
              <Text style={styles.deductionTitle}>MATERIALS TO DEDUCT</Text>
            </View>
            <View style={styles.deductionList}>
              <View style={styles.deductionRow}>
                <View style={styles.deductionLabelRow}>
                  <MaterialCommunityIcons name="texture-box" size={16} color={colors.mutedSage} />
                  <Text style={styles.deductionLabel}>Leather</Text>
                </View>
                <Text style={styles.deductionValue}>{deduction.leatherDeducted.toFixed(2)} sqf</Text>
              </View>
              <View style={styles.deductionRow}>
                <View style={styles.deductionLabelRow}>
                  <MaterialCommunityIcons name="circle-outline" size={16} color={colors.mutedSage} />
                  <Text style={styles.deductionLabel}>Buckles</Text>
                </View>
                <Text style={styles.deductionValue}>{deduction.buckleDeducted} pcs</Text>
              </View>
              <View style={[styles.deductionRow, styles.deductionRowLast]}>
                <View style={styles.deductionLabelRow}>
                  <MaterialCommunityIcons name="layers-triple" size={16} color={colors.mutedSage} />
                  <Text style={styles.deductionLabel}>Footbeds</Text>
                </View>
                <Text style={styles.deductionValue}>{deduction.footbedDeducted} pcs</Text>
              </View>
            </View>
          </View>
        )}

        {validation && !validation.valid && (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.errorText}>{validation.message}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, (!selectedSize || qty < 1) && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!selectedSize || qty < 1}
          activeOpacity={0.8}
        >
          <Text style={styles.continueBtnText}>Review & Submit</Text>
          <MaterialCommunityIcons name="arrow-right" size={22} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...typography.bodyLg, color: colors.mutedSage },
  stepIndicator: { ...typography.labelCaps, color: colors.leatherTan, marginBottom: SPACING.md, letterSpacing: 1 },

  // Product Preview
  productPreview: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.md,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  productPreviewContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  productInfo: { flex: 1 },
  productName: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  productSku: { ...typography.bodyMd, color: colors.mutedSage, marginTop: 4 },
  genderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.pill
  },
  genderBadgeText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.onPrimary,
    letterSpacing: 1,
  },

  // Section
  sectionTitle: { ...typography.labelCaps, color: colors.mutedSage, marginBottom: 12, letterSpacing: 1 },

  // Sizes Grid
  sizesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24
  },
  sizeOption: {
    minWidth: 64,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.factoryWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sizeOptionActive: {
    backgroundColor: colors.leatherTan,
    borderColor: colors.leatherTan
  },
  sizeText: {
    ...typography.titleMd,
    fontWeight: '600',
    color: colors.onSurface
  },
  sizeTextActive: { color: colors.onPrimary },
  sizeCheck: { marginLeft: 4 },

  // Quantity Row
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24
  },
  qtyBtn: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outline,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    ...typography.displaySm,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
    fontWeight: '700',
  },

  // Deduction Card
  deductionCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: 16,
  },
  deductionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14
  },
  deductionTitle: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    letterSpacing: 1,
  },
  deductionList: {},
  deductionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  deductionRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  deductionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  deductionLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  deductionValue: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },

  // Error
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.errorContainer,
    padding: 14,
    borderRadius: BORDER_RADIUS.card,
    marginBottom: 16
  },
  errorText: { ...typography.bodyMd, color: colors.error, flex: 1 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    backgroundColor: colors.factoryWhite,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.button,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
});