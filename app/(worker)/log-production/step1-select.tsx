import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../../constants';
import { AppHeader, Skeleton, FadeInView } from '../../../components/ui';
import { useProductStore, Product } from '../../../store';
import { getProducts } from '../../../services';

export default function Step1Select() {
  const router = useRouter();
  const products = useProductStore((state) => state.products);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSelectedProduct(null);
      setSearchQuery('');
    }, [])
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const startTime = Date.now();
    try {
      await getProducts();

      const elapsed = Date.now() - startTime;
      if (elapsed < 250) {
        await new Promise((resolve) => setTimeout(resolve, 250 - elapsed));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const menProducts = products.filter(
    (p) => p.gender === 'Men' && matchesSearch(p, searchQuery)
  );
  const womenProducts = products.filter(
    (p) => p.gender === 'Women' && matchesSearch(p, searchQuery)
  );

  function matchesSearch(product: Product, query: string): boolean {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      product.name.toLowerCase().includes(q) ||
      product.sku.toLowerCase().includes(q)
    );
  }

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleContinue = () => {
    if (selectedProduct) {
      router.push({
        pathname: '/log-production/step2-details',
        params: { productId: selectedProduct._id },
      });
    }
  };

  const renderProductCard = (product: Product) => {
    const isSelected = selectedProduct?._id === product._id;
    return (
      <TouchableOpacity
        key={product._id}
        style={[styles.productCard, isSelected && styles.productCardSelected]}
        onPress={() => handleSelect(product)}
        activeOpacity={0.7}
      >
        <View style={styles.productCardContent}>
          <View style={styles.productCardLeft}>
            <View style={[styles.genderBadge, { backgroundColor: product.gender === 'Men' ? colors.primary : colors.leatherTan }]}>
              <Text style={styles.genderBadgeText}>{product.gender.toUpperCase()}</Text>
            </View>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productSku}>SKU: {product.sku}</Text>
          </View>
          <View style={styles.productCardRight}>
            {isSelected ? (
              <MaterialCommunityIcons name="check-circle" size={28} color={colors.leatherTan} />
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.mutedSage} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Select Product" showBack />
        <View style={styles.scrollContent}>
          <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={48} borderRadius={4} style={{ marginBottom: 24 }} />

          <Skeleton width={150} height={18} borderRadius={4} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={74} borderRadius={4} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={74} borderRadius={4} style={{ marginBottom: 10 }} />

          <Skeleton width={150} height={18} borderRadius={4} style={{ marginTop: 20, marginBottom: 12 }} />
          <Skeleton width="100%" height={74} borderRadius={4} style={{ marginBottom: 10 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Select Product" showBack />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <FadeInView duration={400}>
          <Text style={styles.stepIndicator}>Step 1 of 3</Text>

          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={22} color={colors.mutedSage} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search product name or SKU..."
              placeholderTextColor={colors.mutedSage}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.mutedSage} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>MEN'S PRODUCTS</Text>
          {menProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No men's products found</Text>
            </View>
          ) : (
            menProducts.map(renderProductCard)
          )}

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>WOMEN'S PRODUCTS</Text>
          {womenProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No women's products found</Text>
            </View>
          ) : (
            womenProducts.map(renderProductCard)
          )}
        </FadeInView>
      </ScrollView>

      {selectedProduct && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleContinue} activeOpacity={0.8}>
            <Text style={styles.confirmBtnText}>Confirm Selection</Text>
            <MaterialCommunityIcons name="arrow-right" size={22} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 100 },
  stepIndicator: { ...typography.labelCaps, color: colors.leatherTan, marginBottom: SPACING.md, letterSpacing: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: 14,
    marginLeft: SPACING.sm,
  },
  sectionTitle: { ...typography.labelCaps, color: colors.mutedSage, marginBottom: 12, letterSpacing: 1 },
  emptyState: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  emptyText: { ...typography.bodyMd, color: colors.mutedSage },
  productCard: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  productCardSelected: {
    borderColor: colors.leatherTan,
    borderWidth: 2,
    backgroundColor: colors.surfaceContainerLow,
  },
  productCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productCardLeft: { flex: 1 },
  productCardRight: {
    paddingLeft: SPACING.sm,
  },
  genderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.pill,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  genderBadgeText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.onPrimary,
    letterSpacing: 1,
  },
  productName: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onSurface,
  },
  productSku: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    marginTop: 2,
  },
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
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.button,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  confirmBtnText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
});