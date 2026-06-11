import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList, Alert, Platform, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, Skeleton, FadeInView } from '../../components/ui';
import { getProductionLogs, ProductionLog } from '../../services/production';
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
      const range = getDateRange();
      const allLogs = await getProductionLogs({}, 500);
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
    } catch (err) {
      console.error(err);
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


  const handleExport = async (type: 'excel' | 'pdf') => {
    if (logs.length === 0) {
      Alert.alert('No Data', 'No production logs to export for the selected period.');
      return;
    }

    setExporting(true);
    try {
      if (type === 'excel') {
        await exportToExcel(logs);
        Alert.alert('Success', 'Production data exported to Excel file.');
      } else {
        await exportToPDF(logs);
        Alert.alert('Success', 'Production data exported to PDF file.');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    } finally {
      setExporting(false);
      setShowExportSheet(false);
    }
  };

  const stats = logs.reduce(
    (acc, log) => ({
      totalPairs: acc.totalPairs + log.quantityPairs,
      totalLeather: acc.totalLeather + (log.leatherDeductedSqf ?? 0),
      totalBuckles: acc.totalBuckles + log.buckleDeducted,
      totalFootbeds: acc.totalFootbeds + log.footbedDeducted,
      logCount: acc.logCount + 1,
    }),
    { totalPairs: 0, totalLeather: 0, totalBuckles: 0, totalFootbeds: 0, logCount: 0 }
  );

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
                <Text style={styles.tableTitle}>PRODUCTION LOG</Text>
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
                    data={logs.slice(0, 100)}
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

      {showExportSheet && (
        <View style={styles.exportSheet}>
          <View style={styles.exportSheetContent}>
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
  filterBtn: { flex: 1, padding: SPACING.sm, borderRadius: BORDER_RADIUS.button, borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center' },
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
});