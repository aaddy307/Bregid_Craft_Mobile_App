import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, FlatList, TouchableOpacity, Share, Platform, TextInput, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, WorkerLogEntry, Skeleton, FadeInView } from '../../components/ui';
import { getProductionLogs, ProductionLog } from '../../services/production';
import { getUsers } from '../../services/users';
import { getProducts } from '../../services/products';
import { formatEUSize, formatDateTime } from '../../utils';

export default function ProductionScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Filters
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [workers, setWorkers] = useState<{ _id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ _id: string; name: string; gender?: string; sizes?: number[] }[]>([]);
  const [activeSelector, setActiveSelector] = useState<'worker' | 'product' | 'gender' | 'size' | null>(null);

  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    const startTime = Date.now();
    try {
      const [allLogs, allUsers, allProducts] = await Promise.all([
        getProductionLogs({}, 200),
        getUsers(),
        getProducts()
      ]);
      setWorkers(allUsers.filter((u: { role: string }) => u.role === 'worker'));
      setProducts(allProducts);
      setLogs(allLogs.filter((l) => l.logDate === dateFilter));

      if (showSkeleton) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 250) {
          await new Promise((resolve) => setTimeout(resolve, 250 - elapsed));
        }
      }
    } catch {
      // Silently handle error
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

  // Client-side filtering of logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesWorker = workerFilter === 'all' || log.workerId === workerFilter;
      const matchesProduct = productFilter === 'all' || log.productId === productFilter;
      const matchesGender = genderFilter === 'all' || log.gender === genderFilter;
      const matchesSize = sizeFilter === 'all' || log.euSize.toString() === sizeFilter;
      return matchesWorker && matchesProduct && matchesGender && matchesSize;
    });
  }, [logs, workerFilter, productFilter, genderFilter, sizeFilter]);

  const exportProduction = async () => {
    const report = `BREGID FACTORY - Production Log\nDate: ${dateFilter}\nTotal Entries: ${filteredLogs.length}\nTotal Pairs: ${filteredLogs.reduce((sum, l) => sum + l.quantityPairs, 0)}\n\n${filteredLogs.map((l) => `${l.workerName} | ${l.productName} | ${l.quantityPairs} pairs | EU ${l.euSize}`).join('\n')}`;
    await Share.share({ message: report });
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setDateFilter(dateString);
    }
  };

  const safeDate = React.useMemo(() => {
    const parsed = Date.parse(dateFilter);
    return isNaN(parsed) ? new Date() : new Date(parsed);
  }, [dateFilter]);

  // Extract unique EU sizes from products to display in the size filter, fallback to logs
  const availableSizes = useMemo(() => {
    const extracted = Array.from(
      new Set(
        products
          .filter((p) => genderFilter === 'all' || p.gender === genderFilter)
          .flatMap((p) => (p as any).sizes || [])
      )
    ).sort((a, b) => a - b);
    if (extracted.length > 0) return extracted;
    return Array.from(
      new Set(
        logs
          .filter((l) => genderFilter === 'all' || l.gender === genderFilter)
          .map((l) => l.euSize)
      )
    ).sort((a, b) => a - b);
  }, [products, logs, genderFilter]);

  // Reset size filter if the currently selected size is not available for the selected gender
  useEffect(() => {
    if (sizeFilter !== 'all' && !availableSizes.includes(Number(sizeFilter))) {
      setSizeFilter('all');
    }
  }, [genderFilter, availableSizes, sizeFilter]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Production Log" rightAction={{ icon: 'share-variant', onPress: exportProduction }} />
        <View style={styles.dateSelector}>
          <Skeleton width="100%" height={48} borderRadius={4} />
        </View>
        <View style={styles.content}>
          <View style={[styles.summaryRow, { paddingHorizontal: 0 }]}>
            <Skeleton width="30%" height={50} borderRadius={4} style={{ marginHorizontal: '1.5%' }} />
            <Skeleton width="30%" height={50} borderRadius={4} style={{ marginHorizontal: '1.5%' }} />
            <Skeleton width="30%" height={50} borderRadius={4} style={{ marginHorizontal: '1.5%' }} />
          </View>
          <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Production Log" rightAction={{ icon: 'share-variant', onPress: exportProduction }} />

      <View style={styles.dateSelector}>
        {Platform.OS === 'web' ? (
          <TextInput
            style={styles.dateFieldInput}
            value={dateFilter}
            onChangeText={setDateFilter}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.mutedSage}
          />
        ) : (
          <>
            <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <Text style={styles.dateText}>{dateFilter}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={safeDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={onDateChange}
              />
            )}
          </>
        )}
      </View>

      {/* Scrollable Filters Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersStrip}
        contentContainerStyle={styles.filtersStripContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, workerFilter !== 'all' && styles.filterChipActive]}
          onPress={() => setActiveSelector('worker')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, workerFilter !== 'all' && styles.filterChipTextActive]}>
            Worker: {workerFilter === 'all' ? 'All' : workers.find(w => w._id === workerFilter)?.name || 'Selected'}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={workerFilter !== 'all' ? colors.onPrimary : colors.mutedSage} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, productFilter !== 'all' && styles.filterChipActive]}
          onPress={() => setActiveSelector('product')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, productFilter !== 'all' && styles.filterChipTextActive]}>
            Product: {productFilter === 'all' ? 'All' : products.find(p => p._id === productFilter)?.name || 'Selected'}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={productFilter !== 'all' ? colors.onPrimary : colors.mutedSage} />
        </TouchableOpacity>

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

        <TouchableOpacity
          style={[styles.filterChip, sizeFilter !== 'all' && styles.filterChipActive]}
          onPress={() => setActiveSelector('size')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, sizeFilter !== 'all' && styles.filterChipTextActive]}>
            Size: {sizeFilter === 'all' ? 'All' : `EU ${sizeFilter}`}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={sizeFilter !== 'all' ? colors.onPrimary : colors.mutedSage} />
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <FadeInView duration={400}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{filteredLogs.length}</Text>
              <Text style={styles.summaryLabel}>Entries</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{filteredLogs.reduce((s, l) => s + l.quantityPairs, 0)}</Text>
              <Text style={styles.summaryLabel}>Total Pairs</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{filteredLogs.reduce((s, l) => s + (l.leatherDeductedSqf ?? 0), 0).toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Leather (sqf)</Text>
            </View>
          </View>

          {filteredLogs.map((log) => (
            <View key={log._id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.workerName}>{log.workerName}</Text>
                <Text style={styles.logTime}>{formatDateTime(log.timestamp)}</Text>
              </View>
              <Text style={styles.productName}>{log.productName}</Text>
              <View style={styles.logDetails}>
                <Text style={styles.detailText}>{log.quantityPairs} pairs</Text>
                <Text style={styles.detailText}>{formatEUSize(log.euSize)}</Text>
                <Text style={styles.detailText}>{(log.leatherDeductedSqf ?? 0).toFixed(2)} sqf leather</Text>
              </View>
            </View>
          ))}

          {filteredLogs.length === 0 && <Text style={styles.emptyText}>No production logs found matching the filters</Text>}
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
                {activeSelector === 'worker' && (
                  <>
                    <TouchableOpacity style={[styles.exportOption, workerFilter === 'all' && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setWorkerFilter('all'); setActiveSelector(null); }}>
                      <Text style={[styles.exportOptionText, workerFilter === 'all' && { fontWeight: '700' }]}>All Workers</Text>
                    </TouchableOpacity>
                    {workers.map(w => (
                      <TouchableOpacity key={w._id} style={[styles.exportOption, workerFilter === w._id && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setWorkerFilter(w._id); setActiveSelector(null); }}>
                        <Text style={[styles.exportOptionText, workerFilter === w._id && { fontWeight: '700' }]}>{w.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {activeSelector === 'product' && (
                  <>
                    <TouchableOpacity style={[styles.exportOption, productFilter === 'all' && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setProductFilter('all'); setActiveSelector(null); }}>
                      <Text style={[styles.exportOptionText, productFilter === 'all' && { fontWeight: '700' }]}>All Products</Text>
                    </TouchableOpacity>
                    {products.map(p => (
                      <TouchableOpacity key={p._id} style={[styles.exportOption, productFilter === p._id && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setProductFilter(p._id); setActiveSelector(null); }}>
                        <Text style={[styles.exportOptionText, productFilter === p._id && { fontWeight: '700' }]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {activeSelector === 'gender' && (
                  <>
                    {['all', 'Men', 'Women'].map(g => (
                      <TouchableOpacity key={g} style={[styles.exportOption, genderFilter === g && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setGenderFilter(g); setActiveSelector(null); }}>
                        <Text style={[styles.exportOptionText, genderFilter === g && { fontWeight: '700' }]}>{g === 'all' ? 'All Genders' : g}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {activeSelector === 'size' && (
                  <>
                    <TouchableOpacity style={[styles.exportOption, sizeFilter === 'all' && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setSizeFilter('all'); setActiveSelector(null); }}>
                      <Text style={[styles.exportOptionText, sizeFilter === 'all' && { fontWeight: '700' }]}>All Sizes</Text>
                    </TouchableOpacity>
                    {availableSizes.map(s => (
                      <TouchableOpacity key={s} style={[styles.exportOption, sizeFilter === s.toString() && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setSizeFilter(s.toString()); setActiveSelector(null); }}>
                        <Text style={[styles.exportOptionText, sizeFilter === s.toString() && { fontWeight: '700' }]}>EU {s}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  dateSelector: { padding: SPACING.md, backgroundColor: colors.factoryWhite, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  dateInput: { backgroundColor: colors.surfaceContainer, borderRadius: BORDER_RADIUS.card, padding: SPACING.md, borderWidth: 1, borderColor: colors.outline },
  dateText: { ...typography.bodyLg, color: colors.onSurface, textAlign: 'center' },
  dateFieldInput: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...typography.bodyLg,
    color: colors.onSurface,
    textAlign: 'center',
  },
  content: { flex: 1, padding: SPACING.md },
  summaryRow: { flexDirection: 'row', backgroundColor: colors.factoryWhite, borderRadius: 4, padding: SPACING.md, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: SPACING.md },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { ...typography.numericData, color: colors.onSurface },
  summaryLabel: { ...typography.bodyMd, color: colors.mutedSage, fontSize: 12 },
  logCard: { backgroundColor: colors.factoryWhite, borderRadius: 4, padding: SPACING.md, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: SPACING.sm },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  workerName: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  logTime: { ...typography.bodyMd, color: colors.mutedSage, fontSize: 12 },
  productName: { ...typography.bodyMd, color: colors.leatherTan, marginBottom: SPACING.xs },
  logDetails: { flexDirection: 'row', gap: SPACING.md },
  detailText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  emptyText: { ...typography.bodyMd, color: colors.mutedSage, textAlign: 'center', paddingVertical: SPACING.lg },
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
    paddingVertical: 6,
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