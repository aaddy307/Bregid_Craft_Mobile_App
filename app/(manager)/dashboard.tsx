import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList, Alert, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, StatCard, Skeleton, FadeInView } from '../../components/ui';
import { useAuthStore, useStockStore } from '../../store';
import { getStock, getProducts } from '../../services';
import { getProductionLogs, ProductionLog, getDailyStats } from '../../services/production';
import { getUsers } from '../../services/users';
import { formatEUSize } from '../../utils';
import { exportToExcel, exportToPDF } from '../../services/export';

type DateFilter = 'today' | 'week' | 'month' | 'custom';
type MaterialType = 'leather' | 'buckle' | 'footbed';

export default function ManagerDashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const stock = useStockStore((state) => state.stock);
  const isLowLeather = useStockStore((state) => state.isLowStock('leather'));
  const isLowBuckle = useStockStore((state) => state.isLowStock('buckle'));
  const isLowFootbed = useStockStore((state) => state.isLowStock('footbed'));

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [workers, setWorkers] = useState<{ _id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ _id: string; name: string; gender?: string; sizes?: number[] }[]>([]);
  const [activeSelector, setActiveSelector] = useState<'worker' | 'product' | 'gender' | 'size' | null>(null);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [breakdownModal, setBreakdownModal] = useState<{ visible: boolean; material: MaterialType | null }>({ visible: false, material: null });

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
        return { from: customDate, to: customDate };
      default:
        return { from: today, to: today };
    }
  }, [dateFilter, customDate]);

  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    const startTime = Date.now();
    try {
      await getStock();
      const [allUsers, allProducts, allLogs] = await Promise.all([
        getUsers(),
        getProducts(),
        getProductionLogs({}, 200)
      ]);
      setWorkers(allUsers.filter((u: { role: string }) => u.role === 'worker'));
      setProducts(allProducts);

      const range = getDateRange();
      const filtered = allLogs.filter((log: ProductionLog) => {
        const inRange = log.logDate >= range.from && log.logDate <= range.to;
        return inRange;
      });

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

  const handleLogout = async () => {
    const { logout } = await import('../../services/auth');
    await logout();
    router.replace('/login');
  };

  // Pagination State
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setPage(1);
  }, [dateFilter, workerFilter, productFilter, genderFilter, sizeFilter]);

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

  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredLogs, page]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredLogs.length / PAGE_SIZE);
  }, [filteredLogs]);

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
      }),
      { totalPairs: 0, totalLeather: 0, totalBuckles: 0, totalFootbeds: 0 }
    );
  }, [filteredLogs]);

  const leatherBreakdown = useMemo(() => {
    return filteredLogs.reduce((acc: Record<string, number>, log) => {
      const type = log.leatherType || 'Unknown';
      acc[type] = (acc[type] || 0) + (log.leatherDeductedSqf ?? 0);
      return acc;
    }, {});
  }, [filteredLogs]);

  const buckleBreakdown = useMemo(() => {
    return filteredLogs.reduce((acc: Record<string, number>, log) => {
      const type = log.buckleType || 'Unknown';
      acc[type] = (acc[type] || 0) + log.buckleDeducted;
      return acc;
    }, {});
  }, [filteredLogs]);

  const footbedBreakdown = useMemo(() => {
    return filteredLogs.reduce((acc: Record<string, number>, log) => {
      const key = `${log.footbedGender} EU ${log.footbedEuSize} - ${log.footbedType}`;
      acc[key] = (acc[key] || 0) + log.footbedDeducted;
      return acc;
    }, {});
  }, [filteredLogs]);

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  };

  const renderLogItem = ({ item }: { item: ProductionLog }) => (
    <View style={styles.logCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.workerName)}</Text>
      </View>
      <View style={styles.logInfo}>
        <Text style={styles.logWorker}>{item.workerName}</Text>
        <Text style={styles.logProduct} numberOfLines={1}>{item.productName}</Text>
        <Text style={styles.logDetails}>EU {formatEUSize(item.euSize)} • {item.gender}</Text>
      </View>
      <View style={styles.logQtyBadge}>
        <Text style={styles.logQtyText}>+{item.quantityPairs}</Text>
        <Text style={styles.logQtySub}>PAIRS</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Manager Dashboard" rightAction={{ icon: 'logout', onPress: handleLogout }} />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Buttons */}
        <View style={styles.filterRow}>
          {(['today', 'week', 'month'] as DateFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterBtn, dateFilter === filter && styles.filterBtnActive]}
              onPress={() => setDateFilter(filter)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterBtnText, dateFilter === filter && styles.filterBtnTextActive]}>
                {filter.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.filterBtn, dateFilter === 'custom' && styles.filterBtnActive]}
            onPress={() => {
              if (dateFilter === 'custom') {
                setShowDatePicker(true);
              } else {
                setDateFilter('custom');
                setShowDatePicker(true);
              }
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="calendar"
              size={14}
              color={dateFilter === 'custom' ? colors.onPrimary : colors.mutedSage}
            />
            <Text style={[styles.filterBtnText, dateFilter === 'custom' && styles.filterBtnTextActive]}>
              {dateFilter === 'custom' ? customDate : 'DATE'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(customDate)}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(_event: any, selectedDate?: Date) => {
              setShowDatePicker(false);
              if (selectedDate) {
                const dateStr = selectedDate.toISOString().split('T')[0];
                setCustomDate(dateStr);
                setDateFilter('custom');
              }
            }}
          />
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
            {/* Stats grid skeleton */}
            <View style={{ gap: 10, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Skeleton width="48%" height={100} borderRadius={12} style={{ flex: 1 }} />
                <Skeleton width="48%" height={100} borderRadius={12} style={{ flex: 1 }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Skeleton width="48%" height={100} borderRadius={12} style={{ flex: 1 }} />
                <Skeleton width="48%" height={100} borderRadius={12} style={{ flex: 1 }} />
              </View>
            </View>
            {/* Log header skeleton */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Skeleton width={140} height={20} borderRadius={4} />
              <Skeleton width={60} height={28} borderRadius={8} />
            </View>
            {/* Log list item skeletons */}
            <Skeleton width="100%" height={68} borderRadius={12} style={{ marginBottom: 10 }} />
            <Skeleton width="100%" height={68} borderRadius={12} style={{ marginBottom: 10 }} />
            <Skeleton width="100%" height={68} borderRadius={12} style={{ marginBottom: 10 }} />
            <Skeleton width="100%" height={68} borderRadius={12} style={{ marginBottom: 10 }} />
          </View>
        ) : (
          <FadeInView duration={400}>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatCard title="TOTAL PAIRS" value={stats.totalPairs} icon="shoe-formal" accentLeft />
                <StatCard title="LEATHER" value={stats.totalLeather.toFixed(1)} unit="sqf" icon="texture-box" accentLeft onPress={() => setBreakdownModal({ visible: true, material: 'leather' })} />
              </View>
              <View style={styles.statsRow}>
                <StatCard title="BUCKLES" value={stats.totalBuckles} unit="pcs" icon="circle-outline" accentLeft onPress={() => setBreakdownModal({ visible: true, material: 'buckle' })} />
                <StatCard title="FOOTBEDS" value={stats.totalFootbeds} unit="pcs" icon="layers-triple" accentLeft onPress={() => setBreakdownModal({ visible: true, material: 'footbed' })} />
              </View>
            </View>

            {/* Production Logs Section */}
            <View style={styles.logsSection}>
              <View style={styles.logsHeader}>
                <View style={styles.logsTitleRow}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={18} color={colors.mutedSage} />
                  <Text style={styles.logsTitle}>PRODUCTION LOGS ({filteredLogs.length})</Text>
                </View>
                <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExportSheet(true)} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="export-variant" size={16} color={colors.leatherTan} />
                  <Text style={styles.exportBtnText}>Export</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={paginatedLogs}
                renderItem={renderLogItem}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="inbox-outline" size={36} color={colors.mutedSage} style={{ alignSelf: 'center' }} />
                    <Text style={styles.emptyText}>No production logs found</Text>
                  </View>
                }
              />

              {totalPages > 1 && (
                <View style={styles.paginationRow}>
                  <Text style={styles.paginationText}>
                    Page {page} of {totalPages} ({filteredLogs.length} entries)
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
            </View>
          </FadeInView>
        )}
      </ScrollView>

      {/* activeSelector Bottom Sheet Modal */}
      {activeSelector && (
        <Modal visible={!!activeSelector} animationType="slide" transparent>
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.overlayBg} onPress={() => setActiveSelector(null)} />
            <View style={styles.exportSheet}>
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
                      <Text style={[styles.exportText, workerFilter === 'all' && { fontWeight: '700' }]}>All Workers</Text>
                    </TouchableOpacity>
                    {workers.map(w => (
                      <TouchableOpacity key={w._id} style={[styles.exportOption, workerFilter === w._id && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setWorkerFilter(w._id); setActiveSelector(null); }}>
                        <Text style={[styles.exportText, workerFilter === w._id && { fontWeight: '700' }]}>{w.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {activeSelector === 'product' && (
                  <>
                    <TouchableOpacity style={[styles.exportOption, productFilter === 'all' && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setProductFilter('all'); setActiveSelector(null); }}>
                      <Text style={[styles.exportText, productFilter === 'all' && { fontWeight: '700' }]}>All Products</Text>
                    </TouchableOpacity>
                    {products.map(p => (
                      <TouchableOpacity key={p._id} style={[styles.exportOption, productFilter === p._id && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setProductFilter(p._id); setActiveSelector(null); }}>
                        <Text style={[styles.exportText, productFilter === p._id && { fontWeight: '700' }]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {activeSelector === 'gender' && (
                  <>
                    {['all', 'Men', 'Women'].map(g => (
                      <TouchableOpacity key={g} style={[styles.exportOption, genderFilter === g && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setGenderFilter(g); setActiveSelector(null); }}>
                        <Text style={[styles.exportText, genderFilter === g && { fontWeight: '700' }]}>{g === 'all' ? 'All Genders' : g}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {activeSelector === 'size' && (
                  <>
                    <TouchableOpacity style={[styles.exportOption, sizeFilter === 'all' && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setSizeFilter('all'); setActiveSelector(null); }}>
                      <Text style={[styles.exportText, sizeFilter === 'all' && { fontWeight: '700' }]}>All Sizes</Text>
                    </TouchableOpacity>
                    {availableSizes.map(s => (
                      <TouchableOpacity key={s} style={[styles.exportOption, sizeFilter === s.toString() && { backgroundColor: colors.surfaceContainer }]} onPress={() => { setSizeFilter(s.toString()); setActiveSelector(null); }}>
                        <Text style={[styles.exportText, sizeFilter === s.toString() && { fontWeight: '700' }]}>EU {s}</Text>
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
          <View style={styles.exportSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.exportTitle}>Export Production Data</Text>
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('excel')} disabled={exporting} activeOpacity={0.7}>
              <MaterialCommunityIcons name="file-excel" size={24} color={colors.success} />
              <Text style={styles.exportText}>Export as Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('pdf')} disabled={exporting} activeOpacity={0.7}>
              <MaterialCommunityIcons name="file-pdf-box" size={24} color={colors.error} />
              <Text style={styles.exportText}>Export as PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportCancel} onPress={() => setShowExportSheet(false)} activeOpacity={0.7}>
              <Text style={styles.exportCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {breakdownModal.visible && breakdownModal.material && (
        <Modal visible={breakdownModal.visible} animationType="slide" transparent>
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.overlayBg} onPress={() => setBreakdownModal({ visible: false, material: null })} />
            <View style={styles.exportSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.breakdownHeader}>
                <Text style={styles.exportTitle}>
                  {breakdownModal.material === 'leather' ? 'LEATHER' : breakdownModal.material === 'buckle' ? 'BUCKLES' : 'FOOTBEDS'} USAGE BREAKDOWN
                </Text>
                <TouchableOpacity onPress={() => setBreakdownModal({ visible: false, material: null })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.breakdownContent}>
                {breakdownModal.material === 'leather' && (
                  Object.keys(leatherBreakdown).length > 0 ? (
                    Object.entries(leatherBreakdown).map(([type, qty]) => (
                      <View key={type} style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{type}</Text>
                        <Text style={styles.breakdownValue}>{qty.toFixed(2)} sqf</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.breakdownEmpty}>No leather usage for this period</Text>
                  )
                )}
                {breakdownModal.material === 'buckle' && (
                  Object.keys(buckleBreakdown).length > 0 ? (
                    Object.entries(buckleBreakdown).map(([type, qty]) => (
                      <View key={type} style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{type}</Text>
                        <Text style={styles.breakdownValue}>{qty} pcs</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.breakdownEmpty}>No buckle usage for this period</Text>
                  )
                )}
                {breakdownModal.material === 'footbed' && (
                  Object.keys(footbedBreakdown).length > 0 ? (
                    Object.entries(footbedBreakdown).map(([key, qty]) => (
                      <View key={key} style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{key}</Text>
                        <Text style={styles.breakdownValue}>{qty} pcs</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.breakdownEmpty}>No footbed usage for this period</Text>
                  )
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
  content: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.factoryWhite,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: {
    ...typography.labelCaps,
    fontSize: 11,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  filterBtnTextActive: {
    color: colors.onPrimary,
  },
  statsGrid: {
    gap: 10,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Logs Section
  logsSection: {
    marginTop: 8,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logsTitle: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    letterSpacing: 1,
    fontSize: 10,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 0.5,
    borderColor: colors.outlineVariant,
  },
  exportBtnText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.leatherTan,
    letterSpacing: 0.5,
  },
  listContainer: {
    gap: 10,
  },

  // Log Card Item
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    ...typography.labelCaps,
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  logInfo: {
    flex: 1,
  },
  logWorker: {
    ...typography.bodyLg,
    fontWeight: '700',
    color: colors.onSurface,
  },
  logProduct: {
    ...typography.bodyMd,
    color: colors.leatherTan,
    fontSize: 12,
    marginTop: 1,
  },
  logDetails: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    fontSize: 10,
    marginTop: 2,
  },
  logQtyBadge: {
    backgroundColor: colors.successContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.card,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  logQtyText: {
    ...typography.bodyLg,
    color: colors.success,
    fontWeight: '800',
  },
  logQtySub: {
    ...typography.labelCaps,
    fontSize: 7,
    color: colors.success,
    opacity: 0.8,
    marginTop: 1,
  },

  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.factoryWhite,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: BORDER_RADIUS.card,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Overlay & Export Sheet
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
  exportSheet: {
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
  exportTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginBottom: 16,
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
  exportText: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  exportCancel: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  exportCancelText: {
    ...typography.bodyLg,
    color: colors.mutedSage,
    fontWeight: '600',
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  breakdownContent: {
    maxHeight: 300,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  breakdownLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  breakdownValue: {
    ...typography.bodyLg,
    color: colors.leatherTan,
    fontWeight: '700',
  },
  breakdownEmpty: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    textAlign: 'center',
    paddingVertical: 24,
  },
  filtersStrip: {
    marginBottom: 16,
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
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
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
});