import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../../constants';
import { AppHeader } from '../../../components/ui';
import { useAuthStore, useProductStore, Product } from '../../../store';
import { createProductionLog } from '../../../services/production';
import { formatEUSize } from '../../../utils';
import { calculateDeduction } from '../../../utils/stockCalculator';

export default function Step3Confirm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId: string; size: string; quantity: string }>();
  const user = useAuthStore((state) => state.user);
  const { getProductById } = useProductStore();

  const [product, setProduct] = useState<Product | null>(() => getProductById(params.productId || '') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.productId) {
      const p = getProductById(params.productId);
      setProduct(p || null);
    }
  }, [params.productId]);

  if (!product || !user) {
    return (
      <View style={styles.container}>
        <AppHeader title="Confirm Production" showBack />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Invalid entry data</Text>
        </View>
      </View>
    );
  }

  const size = parseInt(params.size || '0');
  const quantity = parseInt(params.quantity || '0');
  const deduction = calculateDeduction(product, size, quantity);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await createProductionLog({
        workerId: user._id,
        workerName: user.name,
        product,
        euSize: size,
        quantityPairs: quantity,
        updatedBy: user._id,
        updatedByName: user.name,
      });

      if (Platform.OS === 'web') {
        window.alert(`Success!\n\nYou logged ${quantity} pairs of ${product.name}.`);
        router.replace('/home');
      } else {
        Alert.alert(
          'Success',
          `You logged ${quantity} pairs of ${product.name}.`,
          [{ text: 'OK', onPress: () => router.replace('/home') }]
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to log production';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Confirm Production" showBack />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.progressDots}>
          <View style={[styles.dot, styles.dotComplete]} />
          <View style={[styles.dot, styles.dotComplete]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
        <Text style={styles.stepIndicator}>Final Step</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryBorder} />
          <View style={styles.summaryContent}>
            <Text style={styles.summaryPrimary}>
              {quantity} pairs of {product.name}
            </Text>
            <Text style={styles.summarySecondary}>
              {formatEUSize(size)} — {product.gender}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>MATERIALS TO DEDUCT</Text>
        <View style={styles.impactGrid}>
          <View style={styles.impactBox}>
            <MaterialCommunityIcons name="texture-box" size={28} color={colors.leatherTan} />
            <Text style={styles.impactLabel}>Leather</Text>
            <Text style={styles.impactValue}>{deduction.leatherDeducted.toFixed(2)}</Text>
            <Text style={styles.impactUnit}>sqf — {deduction.leatherType}</Text>
          </View>
          <View style={styles.impactBox}>
            <MaterialCommunityIcons name="circle-outline" size={28} color={colors.leatherTan} />
            <Text style={styles.impactLabel}>Buckles</Text>
            <Text style={styles.impactValue}>{deduction.buckleDeducted}</Text>
            <Text style={styles.impactUnit}>pcs — {deduction.buckleType}</Text>
          </View>
          <View style={styles.impactBox}>
            <MaterialCommunityIcons name="layers-triple" size={28} color={colors.leatherTan} />
            <Text style={styles.impactLabel}>Footbeds</Text>
            <Text style={styles.impactValue}>{deduction.footbedDeducted}</Text>
            <Text style={styles.impactUnit}>pcs — {deduction.footbedType}</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.back()}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Confirm Production</Text>
              <MaterialCommunityIcons name="check" size={20} color={colors.onPrimary} />
            </>
          )}
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
  progressDots: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.outlineVariant },
  dotComplete: { backgroundColor: colors.leatherTan },
  dotActive: { backgroundColor: colors.primary },
  stepIndicator: { ...typography.labelCaps, color: colors.leatherTan, marginBottom: SPACING.md, letterSpacing: 1 },

  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  summaryBorder: { width: 4, backgroundColor: colors.leatherTan },
  summaryContent: { flex: 1, padding: 18 },
  summaryPrimary: { ...typography.titleMd, fontWeight: '700', color: colors.onSurface },
  summarySecondary: { ...typography.bodyMd, color: colors.mutedSage, marginTop: 4 },

  // Section
  sectionTitle: { ...typography.labelCaps, color: colors.mutedSage, marginBottom: 12, letterSpacing: 1 },

  // Impact Grid
  impactGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  impactBox: {
    flex: 1,
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  impactLabel: { ...typography.labelCaps, fontSize: 9, color: colors.mutedSage, marginTop: 8, letterSpacing: 1 },
  impactValue: { ...typography.headlineMd, fontWeight: '700', color: colors.onSurface, marginTop: 4 },
  impactUnit: { ...typography.bodyMd, fontSize: 10, color: colors.mutedSage, textAlign: 'center' },

  // Error
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.errorContainer,
    padding: 14,
    borderRadius: BORDER_RADIUS.card
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
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  editBtn: {
    flex: 1,
    padding: 16,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center'
  },
  editBtnText: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  submitBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.button,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { ...typography.bodyLg, fontWeight: '600', color: colors.onPrimary, letterSpacing: 0.5 },
});