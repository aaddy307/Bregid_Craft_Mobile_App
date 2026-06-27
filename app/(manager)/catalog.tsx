import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Platform, Modal } from 'react-native';
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

  // Filters State
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [activeSelector, setActiveSelector] = useState<'gender' | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    try {
      await getProducts();
    } catch {
      // Silently handle error
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

  const activeProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.isActive === false) return false;
      const matchesGender = genderFilter === 'all' || p.gender === genderFilter;
      return matchesGender;
    });
  }, [products, genderFilter]);

  const paginatedProducts = useMemo(() => {
    return activeProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [activeProducts, page]);

  const totalPages = useMemo(() => {
    return Math.ceil(activeProducts.length / PAGE_SIZE);
  }, [activeProducts]);

  useEffect(() => {
    setPage(1);
  }, [products, genderFilter]);

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

      {/* Scrollable Filters Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersStrip}
        contentContainerStyle={styles.filtersStripContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, genderFilter !== 'all' && styles.filterChipActive]}
          onPress={() => setActiveSelector('gender')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, genderFilter !== 'all' && styles.filterChipTextActive]}>
            Gender: {genderFilter === 'all' ? 'All' : genderFilter}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={genderFilter !== 'all' ? colors.onPrimary : colors.mutedSage} />
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.scrollContent}>
        <FadeInView duration={400}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Product Catalog</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
              <MaterialCommunityIcons name="plus" size={18} color={colors.onPrimary} />
              <Text style={styles.addButtonText}>ADD PRODUCT</Text>
            </TouchableOpacity>
          </View>

          {paginatedProducts.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>PRODUCTS LIST ({activeProducts.length})</Text>
              {paginatedProducts.map((product: Product) => (
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
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="package-variant" size={56} color={colors.mutedSage} />
              <Text style={styles.emptyStateText}>No products in catalog</Text>
              <Text style={styles.emptyStateSubtext}>Tap "Add Product" to create your first product</Text>
            </View>
          )}

          {totalPages > 1 && (
            <View style={styles.paginationRow}>
              <Text style={styles.paginationText}>
                Page {page} of {totalPages} ({activeProducts.length} products)
              </Text>
              <View style={styles.paginationButtons}>
                <TouchableOpacity
                  style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <Text style={[styles.pageBtnText, page === totalPages && styles.pageBtnTextDisabled]}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </FadeInView>
      </ScrollView>

      {/* activeSelector Bottom Sheet Modal */}
      {activeSelector && (
        <Modal visible={!!activeSelector} animationType="slide" transparent>
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.overlayBg} onPress={() => setActiveSelector(null)} />
            <View style={styles.modalSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.breakdownHeader}>
                <Text style={styles.exportTitle}>
                  SELECT {activeSelector.toUpperCase()}
                </Text>
                <TouchableOpacity onPress={() => setActiveSelector(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 300, marginBottom: 20 }}>
                {activeSelector === 'gender' && (
                  <>
                    {['all', 'Men', 'Women'].map(g => (
                      <TouchableOpacity key={g} style={[styles.exportOption, genderFilter === g && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setGenderFilter(g); setActiveSelector(null); }}>
                        <Text style={[styles.exportOptionText, genderFilter === g && { fontWeight: '700' }]}>{g === 'all' ? 'All Genders' : g}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

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
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  paginationText: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    fontSize: 12,
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.factoryWhite,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: BORDER_RADIUS.button,
  },
  pageBtnDisabled: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.surfaceVariant,
    opacity: 0.5,
  },
  pageBtnText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 12,
  },
  pageBtnTextDisabled: {
    color: colors.mutedSage,
  },
  filtersStrip: {
    flexGrow: 0,
    backgroundColor: colors.factoryWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  filtersStripContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.factoryWhite,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: BORDER_RADIUS.button,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  overlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: colors.factoryWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    textAlign: 'center',
    fontWeight: '700',
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  exportOptionText: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
});