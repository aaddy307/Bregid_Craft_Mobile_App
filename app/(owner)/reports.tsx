import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList, Alert, Platform, TextInput, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, Skeleton, FadeInView } from '../../components/ui';
import { getProductionLogs, ProductionLog } from '../../services/production';
import { getUsers } from '../../services/users';
import { getProducts } from '../../services/products';
import { formatEUSize, formatDate, formatTime } from '../../utils';
import { exportToExcel, exportToPDF } from '../../services/export';

type DateFilter = 'today' | 'week' | 'month' | 'custom';

export default function ReportsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Filters
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [workers, setWorkers] = useState<{ _id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ _id: string; name: string; gender?: string; sizes?: number[] }[]>([]);
  const [activeSelector, setActiveSelector] = useState<'worker' | 'product' | 'gender' | 'size' | null>(null);

  const onFromChange = (_event: any, selectedDate?: Date) => {
    setShowFromPicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setCustomFrom(dateString);
    }
  };

  const onToChange = (_event: any, selectedDate?: Date) => {
    setShowToPicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setCustomTo(dateString);
    }
  };

  const getDateRange = useCallback(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    switch (dateFilter) {
      case 'today':
        return { from: today, to: today };
      case 'week': {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return { from: start.toISOString().split('T')[0], to: today };
      }
      case 'month': {
        const start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        return { from: start.toISOString().split('T')[0], to: today };
      }
      case 'custom':
        return { from: customFrom || today, to: customTo || today };
    }
  }, [dateFilter, customFrom, customTo]);

  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    const startTime = Date.now();
    try {
      const [allLogs, allUsers, allProducts] = await Promise.all([
        getProductionLogs({}, 500),
        getUsers(),
        getProducts()
      ]);
      setWorkers(allUsers.filter((u: { role: string }) => u.role === 'worker'));
      setProducts(allProducts);

      const range = getDateRange();
      const filtered = allLogs.filter((log: ProductionLog) =>
        log.logDate >= range.from && log.logDate <= range.to
      );
      setLogs(filtered);

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
  }, [getDateRange]);

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

  const handleExport = async (type: 'excel' | 'pdf') => {
    if (filteredLogs.length === 0) {
      Alert.alert('No Data', 'No production logs to export for the selected period.');
      return;
    }

    setExporting(true);
    try {
      if (type === 'excel') {
        await exportToExcel(filteredLogs);
        Alert.alert('Success', 'Production data exported to Excel file.');
      } else {
        await exportToPDF(filteredLogs);
        Alert.alert('Success', 'Production data exported to PDF file.');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    } finally {
      setExporting(false);
      setShowExportSheet(false);
    }
  };

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

  const stats = useMemo(() => {
    return filteredLogs.reduce(
      (acc, log) => ({
        totalPairs: acc.totalPairs + log.quantityPairs,
        totalLeather: acc.totalLeather + (log.leatherDeductedSqf ?? 0),
        totalBuckles: acc.totalBuckles + log.buckleDeducted,
        totalFootbeds: acc.totalFootbeds + log.footbedDeducted,
        logCount: acc.logCount + 1,
      }),
      { totalPairs: 0, totalLeather: 0, totalBuckles: 0, totalFootbeds: 0, logCount: 0 }
    );
  }, [filteredLogs]);

  const renderLogItem = ({ item }: { item: ProductionLog }) => (
    <View style={styles.logRow}>
      <Text style={[styles.logCell, styles.logCellWorker]}>{item.workerName}</Text>
      <Text style={[styles.logCell, styles.logCellProduct]}>{item.productName}</Text>
      <Text style={[styles.logCell, styles.logCellSku]}>{item.sku}</Text>
      <Text style={[styles.logCell, styles.logCellGender]}>{item.gender}</Text>
      <Text style={[styles.logCell, styles.logCellSize]}>{formatEUSize(item.euSize)}</Text>
      <Text style={[styles.logCell, styles.logCellQty]}>{item.quantityPairs}</Text>
      <Text style={[styles.logCell, styles.logCellDate]}>{item.logDate}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Production Reports" />

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Date Filters (stays showing) */}
        <View style={styles.filterRow}>
          {(['today', 'week', 'month'] as DateFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterBtn, dateFilter === filter && styles.filterBtnActive]}
              onPress={() => setDateFilter(filter)}
            >
              <Text style={[styles.filterBtnText, dateFilter === filter && styles.filterBtnTextActive]}>
                {filter.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.filterBtn, dateFilter === 'custom' && styles.filterBtnActive]}
            onPress={() => setDateFilter('custom')}
          >
            <Text style={[styles.filterBtnText, dateFilter === 'custom' && styles.filterBtnTextActive]}>
              CUSTOM
            </Text>
          </TouchableOpacity>
        </View>

        {dateFilter === 'custom' && (
          <View style={styles.customDateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>From:</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.dateFieldInput}
                  value={customFrom}
                  onChangeText={setCustomFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedSage}
                />
              ) : (
                <>
                  <TouchableOpacity style={styles.dateField} onPress={() => setShowFromPicker(true)} activeOpacity={0.7}>
                    <Text style={styles.dateFieldText}>{customFrom || 'Select date'}</Text>
                  </TouchableOpacity>
                  {showFromPicker && (
                    <DateTimePicker
                      value={customFrom ? new Date(customFrom) : new Date()}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={onFromChange}
                    />
                  )}
                </>
              )}
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>To:</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.dateFieldInput}
                  value={customTo}
                  onChangeText={setCustomTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedSage}
                />
              ) : (
                <>
                  <TouchableOpacity style={styles.dateField} onPress={() => setShowToPicker(true)} activeOpacity={0.7}>
                    <Text style={styles.dateFieldText}>{customTo || 'Select date'}</Text>
                  </TouchableOpacity>
                  {showToPicker && (
                    <DateTimePicker
                      value={customTo ? new Date(customTo) : new Date()}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={onToChange}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        )}

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

        {isLoading ? (
          <View style={{ marginTop: 10 }}>
            {/* Summary Grid */}
            <View style={styles.summaryGrid}>
              <Skeleton width="30%" height={74} borderRadius={12} style={{ marginHorizontal: '1.5%' }} />
              <Skeleton width="30%" height={74} borderRadius={12} style={{ marginHorizontal: '1.5%' }} />
              <Skeleton width="30%" height={74} borderRadius={12} style={{ marginHorizontal: '1.5%' }} />
            </View>
            {/* Table Section */}
            <View style={styles.tableSection}>
              <View style={[styles.tableHeader, { justifyContent: 'space-between', flexDirection: 'row' }]}>
                <Skeleton width={130} height={20} borderRadius={4} />
                <Skeleton width={60} height={20} borderRadius={4} />
              </View>
              <Skeleton width="100%" height={40} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width="100%" height={40} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width="100%" height={40} borderRadius={4} style={{ marginBottom: 8 }} />
            </View>
          </View>
        ) : (
          <FadeInView duration={400}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{stats.logCount}</Text>
                <Text style={styles.summaryLabel}>Entries</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{stats.totalPairs}</Text>
                <Text style={styles.summaryLabel}>Total Pairs</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{stats.totalLeather.toFixed(1)}</Text>
                <Text style={styles.summaryLabel}>Leather (sqf)</Text>
              </View>
            </View>

            <View style={styles.tableSection}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableTitle}>PRODUCTION LOG ({filteredLogs.length})</Text>
                <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExportSheet(true)}>
                  <MaterialCommunityIcons name="export" size={16} color={colors.leatherTan} />
                  <Text style={styles.exportBtnText}>Export</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  <View style={styles.tableHeadRow}>
                    <Text style={[styles.tableHead, styles.logCellWorker]}>Worker</Text>
                    <Text style={[styles.tableHead, styles.logCellProduct]}>Product</Text>
                    <Text style={[styles.tableHead, styles.logCellSku]}>SKU</Text>
                    <Text style={[styles.tableHead, styles.logCellGender]}>Gender</Text>
                    <Text style={[styles.tableHead, styles.logCellSize]}>Size</Text>
                    <Text style={[styles.tableHead, styles.logCellQty]}>Qty</Text>
                    <Text style={[styles.tableHead, styles.logCellDate]}>Date</Text>
                  </View>

                  <FlatList
                    data={filteredLogs.slice(0, 100)}
                    renderItem={renderLogItem}
                    keyExtractor={(item) => item._id}
                    scrollEnabled={false}
                    ListEmptyComponent={<Text style={styles.emptyText}>No production logs found</Text>}
                  />
                </View>
              </ScrollView>
            </View>
          </FadeInView>
        )}
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

      {showExportSheet && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setShowExportSheet(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.exportSheetTitle}>Export Production Data</Text>
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('excel')} disabled={exporting}>
              <MaterialCommunityIcons name="file-excel" size={24} color={colors.success} />
              <Text style={styles.exportOptionText}>Export as Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('pdf')} disabled={exporting}>
              <MaterialCommunityIcons name="file-pdf-box" size={24} color={colors.error} />
              <Text style={styles.exportOptionText}>Export as PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportCancel} onPress={() => setShowExportSheet(false)}>
              <Text style={styles.exportCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: SPACING.md },
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  filterBtn: { flex: 1, padding: SPACING.sm, borderRadius: BORDER_RADIUS.button, borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { ...typography.labelCaps, fontSize: 10, color: colors.onSurface },
  filterBtnTextActive: { color: colors.onPrimary },
  customDateRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  dateInput: { flex: 1 },
  dateLabel: { ...typography.labelCaps, fontSize: 10, color: colors.mutedSage, marginBottom: SPACING.xs },
  dateField: { backgroundColor: colors.factoryWhite, borderRadius: BORDER_RADIUS.button, padding: SPACING.sm, borderWidth: 1, borderColor: colors.outline },
  dateFieldText: { ...typography.bodyMd, color: colors.onSurface },
  dateFieldInput: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.button,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  summaryGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  summaryCard: { flex: 1, backgroundColor: colors.factoryWhite, borderRadius: BORDER_RADIUS.card, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant },
  summaryValue: { ...typography.headlineMd, color: colors.onSurface },
  summaryLabel: { ...typography.labelCaps, fontSize: 10, color: colors.mutedSage, marginTop: 2 },
  tableSection: { backgroundColor: colors.factoryWhite, borderRadius: BORDER_RADIUS.card, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  tableTitle: { ...typography.labelCaps, color: colors.mutedSage },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  exportBtnText: { ...typography.labelCaps, fontSize: 11, color: colors.leatherTan },
  tableHeadRow: { flexDirection: 'row', backgroundColor: colors.surfaceContainerLow, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm },
  tableHead: { ...typography.labelCaps, fontSize: 9, color: colors.mutedSage },
  logRow: { flexDirection: 'row', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant },
  logCell: { ...typography.bodyMd, fontSize: 10, color: colors.onSurface },
  logCellWorker: { width: 90 },
  logCellProduct: { width: 140 },
  logCellSku: { width: 85 },
  logCellGender: { width: 65 },
  logCellSize: { width: 55 },
  logCellQty: { width: 45, textAlign: 'center' },
  logCellDate: { width: 85 },
  emptyText: { ...typography.bodyMd, color: colors.mutedSage, textAlign: 'center', paddingVertical: SPACING.lg },
  exportSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surfaceContainerHigh, padding: SPACING.lg },
  exportSheetContent: { backgroundColor: colors.factoryWhite, borderRadius: BORDER_RADIUS.card, padding: SPACING.md },
  exportSheetTitle: { ...typography.titleSm, color: colors.onSurface, marginBottom: SPACING.md, textAlign: 'center' },
  exportOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant },
  exportOptionText: { ...typography.bodyLg, color: colors.onSurface },
  exportCancel: { padding: SPACING.md, alignItems: 'center' },
  exportCancelText: { ...typography.bodyLg, color: colors.mutedSage },
  filtersStrip: {
    marginBottom: SPACING.md,
  },
  filtersStripContent: {
    gap: 8,
    paddingRight: 16,
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
});