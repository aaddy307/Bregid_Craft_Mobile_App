import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, ProductCard, Skeleton, FadeInView } from '../../components/ui';
import { AddProductModal } from '../../components/modals';
import { useProductStore, Product } from '../../store';
import { getProducts, deleteProduct } from '../../services';

export default function CatalogScreen() {
  const products = useProductStore((state) => state.products);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    try {
      await getProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

  const handleDelete = (product: Product) => {
    const title = 'Delete Product';
    const message = `Are you sure you want to delete "${product.name}"? Existing production logs will be preserved, but this product won't appear for new entries.`;
    const onConfirm = async () => {
      setDeletingId(product._id);
      await deleteProduct(product._id);
      setDeletingId(null);
      await loadData();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm },
      ]);
    }
  };


  const menProducts = products.filter((p) => p.gender === 'Men' && p.isActive !== false);
  const womenProducts = products.filter((p) => p.gender === 'Women' && p.isActive !== false);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Product Catalog" />
        <View style={styles.scrollContent}>
          <View style={styles.headerRow}>
            <Skeleton width={160} height={32} borderRadius={6} />
            <Skeleton width={120} height={36} borderRadius={4} />
          </View>
          <Skeleton width={150} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={90} borderRadius={12} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={90} borderRadius={12} style={{ marginBottom: 10 }} />
          <Skeleton width={150} height={16} borderRadius={4} style={{ marginTop: 24, marginBottom: 12 }} />
          <Skeleton width="100%" height={90} borderRadius={12} style={{ marginBottom: 10 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Product Catalog" />

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.scrollContent}>
        <FadeInView duration={400}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Product Catalog</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
              <MaterialCommunityIcons name="plus" size={18} color={colors.onPrimary} />
              <Text style={styles.addButtonText}>ADD PRODUCT</Text>
            </TouchableOpacity>
          </View>

          {menProducts.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>MEN'S COLLECTION ({menProducts.length})</Text>
              {menProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showEdit
                  showDelete
                  onEdit={() => setEditingProduct(product)}
                  onDelete={() => handleDelete(product)}
                  isDeleting={deletingId === product._id}
                />
              ))}
            </>
          )}

          {womenProducts.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>WOMEN'S COLLECTION ({womenProducts.length})</Text>
              {womenProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showEdit
                  showDelete
                  onEdit={() => setEditingProduct(product)}
                  onDelete={() => handleDelete(product)}
                  isDeleting={deletingId === product._id}
                />
              ))}
            </>
          )}

          {menProducts.length === 0 && womenProducts.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="package-variant" size={56} color={colors.mutedSage} />
              <Text style={styles.emptyStateText}>No products in catalog</Text>
              <Text style={styles.emptyStateSubtext}>Tap "Add Product" to create your first product</Text>
            </View>
          )}
        </FadeInView>
      </ScrollView>

      <AddProductModal
        visible={showAddModal || !!editingProduct}
        onClose={() => { setShowAddModal(false); setEditingProduct(null); }}
        product={editingProduct}
        onSuccess={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface },
  addButton: {
    backgroundColor: colors.leatherTan,
    borderRadius: BORDER_RADIUS.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  addButtonText: { ...typography.labelCaps, fontSize: 11, color: colors.onPrimary, letterSpacing: 0.5 },
  sectionTitle: { ...typography.labelCaps, color: colors.mutedSage, marginBottom: 12, letterSpacing: 1 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48
  },
  emptyStateText: { ...typography.bodyLg, color: colors.mutedSage, marginTop: 16 },
  emptyStateSubtext: { ...typography.bodyMd, color: colors.mutedSage, marginTop: 8, textAlign: 'center' },
});