import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, FlatList, Modal, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, StockCard, Skeleton, FadeInView } from '../../components/ui';
import { AddStockModal, ManageCategoriesModal } from '../../components/modals';
import { useStockStore, FootbedEntry } from '../../store';
import { getStock, updateThresholds, getStockLogs, getMaterialCategories, MaterialCategory } from '../../services';
import { exportStockLogsToExcel, exportStockLogsToPDF } from '../../services/export';
import { formatDate, formatTime } from '../../utils';

interface StockLog {
  _id: string;
  type: 'add' | 'deduct';
  material: string;
  materialType?: string;
  quantity: number;
  unit: string;
  reason: string;
  referenceId: string;
  updatedBy: string;
  updatedByName: string;
  timestamp: string;
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  supplierContact?: string;
  footbedGender?: string;
  footbedEuSize?: number;
  purchasePrice?: number;
  totalCost?: number;
}

export default function StockScreen() {
  const stock = useStockStore((state) => state.stock);
  const isLowLeather = useStockStore((state) => state.isLowStock('leather'));
  const isLowBuckle = useStockStore((state) => state.isLowStock('buckle'));
  const isLowFootbed = useStockStore((state) => state.isLowStock('footbed'));
  const totalFootbedQty = useStockStore((state) => state.getTotalFootbedQty());

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [editingThresholds, setEditingThresholds] = useState(false);
  const [thresholdValues, setThresholdValues] = useState({ leather: '', buckle: '', footbed: '' });
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<StockLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [activeMaterial, setActiveMaterial] = useState<'leather' | 'buckle' | 'footbed'>('leather');
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [materialCategories, setMaterialCategories] = useState<{ leather: MaterialCategory[]; buckle: MaterialCategory[]; footbed: MaterialCategory[] }>({
    leather: [],
    buckle: [],
    footbed: [],
  });
  const [historyDateFilter, setHistoryDateFilter] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    const startTime = Date.now();
    try {
      await getStock();
      const logs = await getStockLogs(50);
      setStockLogs(logs as StockLog[]);

      const [leatherCats, buckleCats, footbedCats] = await Promise.all([
        getMaterialCategories('leather'),
        getMaterialCategories('buckle'),
        getMaterialCategories('footbed'),
      ]);
      setMaterialCategories({
        leather: leatherCats,
        buckle: buckleCats,
        footbed: footbedCats,
      });

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
  }, []);

  const handleTabChange = (tab: 'details' | 'history') => {
    setIsTransitioning(true);
    setActiveTab(tab);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 250);
  };

  const handleMaterialChange = (material: 'leather' | 'buckle' | 'footbed') => {
    setIsTransitioning(true);
    setActiveMaterial(material);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 250);
  };

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Sync threshold input values when stock data changes (without re-fetching)
  useEffect(() => {
    if (stock) {
      setThresholdValues({
        leather: stock.thresholds.leatherSqf.toString(),
        buckle: stock.thresholds.buckleQty.toString(),
        footbed: stock.thresholds.footbedQty.toString(),
      });
    }
  }, [stock]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

  const handleSaveThresholds = async () => {
    const thresholds = {
      leatherSqf: parseFloat(thresholdValues.leather) || 0,
      buckleQty: parseInt(thresholdValues.buckle) || 0,
      footbedQty: parseInt(thresholdValues.footbed) || 0,
    };
    await updateThresholds(thresholds);
    setEditingThresholds(false);
    await loadData();
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    try {
      setExporting(true);
      const logsToExport = filteredLogs;
      if (type === 'excel') {
        await exportStockLogsToExcel(logsToExport);
      } else {
        await exportStockLogsToPDF(logsToExport);
      }
    } catch {
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    } finally {
      setExporting(false);
      setShowExportSheet(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      worker_entry: 'Worker Entry',
      manual_add: 'Manual Add',
      entry_edit: 'Entry Edit',
      entry_delete: 'Entry Delete',
    };
    return labels[reason] || reason;
  };

  const handleViewDetails = (log: StockLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const filteredLogs = stockLogs.filter((log) => {
    if (log.material !== activeMaterial) return false;
    if (historyDateFilter) {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      if (logDate !== historyDateFilter) return false;
    }
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (log.supplierName?.toLowerCase().includes(query)) ||
      (log.invoiceNumber?.toLowerCase().includes(query))
    );
  });

  const displayedLogs = showAllLogs ? filteredLogs : filteredLogs.slice(0, 10);

  // Get categories for display (already sorted from DB)
  const currentCategories = materialCategories[activeMaterial] || [];

  const renderLogItem = ({ item }: { item: StockLog }) => {
    const isManualAdd = item.reason === 'manual_add';
    return (
      <TouchableOpacity
        style={styles.logRow}
        onPress={() => isManualAdd && handleViewDetails(item)}
        activeOpacity={isManualAdd ? 0.7 : 1}
        disabled={!isManualAdd}
      >
        <View style={styles.logDateCol}>
          <Text style={styles.logDate}>{formatDate(item.timestamp)}</Text>
          <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
        </View>
        <View style={styles.logMaterialCol}>
          <Text style={styles.logMaterial}>{item.material.charAt(0).toUpperCase() + item.material.slice(1)}</Text>
          {item.materialType && <Text style={styles.logTypeSmall}>{item.materialType}</Text>}
        </View>
        <View style={[styles.logTypeCol, item.type === 'add' ? styles.logTypeAdd : styles.logTypeDeduct]}>
          <Text style={[styles.logType, item.type === 'add' ? styles.logTypeTextAdd : styles.logTypeTextDeduct]}>
            {item.type === 'add' ? '+' : '−'}{(item.quantity ?? 0).toFixed(item.unit === 'sqf' ? 2 : 0)}
          </Text>
        </View>
        <View style={styles.logSupplierCol}>
          <Text style={styles.logSupplier} numberOfLines={1}>
            {isManualAdd ? (item.supplierName || '—') : '—'}
          </Text>
        </View>
        <View style={styles.logInvoiceCol}>
          <Text style={styles.logInvoice} numberOfLines={1}>
            {isManualAdd ? (item.invoiceNumber || '—') : '—'}
          </Text>
        </View>
        <View style={styles.logActionsCol}>
          {isManualAdd && (
            <TouchableOpacity onPress={() => handleViewDetails(item)} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
              <MaterialCommunityIcons name="eye-outline" size={16} color={colors.leatherTan} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFootbedRow = (category: MaterialCategory, index: number) => {
    const stockEntry = stock?.footbeds?.find(f => f.gender === category.gender && f.euSize === category.size && f.type === category.name);
    const qty = stockEntry?.qty ?? 0;
    const isLow = qty <= (stock?.thresholds?.footbedQty || 50);
    return (
      <View key={`${category.gender}-${category.size}-${category.name}-${index}`} style={[styles.footbedRow, index % 2 === 1 && styles.footbedRowAlt]}>
        <View style={styles.footbedGenderCol}>
          <Text style={styles.footbedGender}>{category.gender}</Text>
        </View>
        <View style={styles.footbedSizeCol}>
          <Text style={styles.footbedSize}>EU {category.size}</Text>
        </View>
        <View style={styles.footbedTypeCol}>
          <Text style={styles.footbedType} numberOfLines={1}>{category.name}</Text>
        </View>
        <View style={styles.footbedQtyCol}>
          <Text style={[styles.footbedQty, isLow && styles.footbedQtyLow]}>{qty}</Text>
          {isLow && (
            <View style={styles.lowBadge}>
              <Text style={styles.lowBadgeText}>LOW</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderLeatherRow = (category: MaterialCategory, index: number) => {
    const stockEntry = stock?.leathers?.find(l => l.type === category.name);
    const qty = stockEntry?.qty ?? 0;
    const isLow = qty <= (stock?.thresholds?.leatherSqf || 100);
    return (
      <View key={`${category.name}-${index}`} style={[styles.footbedRow, index % 2 === 1 && styles.footbedRowAlt]}>
        <View style={{ flex: 6 }}>
          <Text style={styles.footbedGender}>{category.name}</Text>
        </View>
        <View style={[styles.footbedQtyCol, { flex: 4 }]}>
          <Text style={[styles.footbedQty, isLow && styles.footbedQtyLow]}>{(qty ?? 0).toFixed(2)} sqf</Text>
          {isLow && (
            <View style={styles.lowBadge}>
              <Text style={styles.lowBadgeText}>LOW</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderBuckleRow = (category: MaterialCategory, index: number) => {
    const prefix = category.color ? `${category.name} (${category.color})` : category.name;
    const stockEntries = stock?.buckles?.filter(b => b.type === prefix || b.type.startsWith(`${prefix} - `)) || [];
    const qty = stockEntries.reduce((sum, b) => sum + (b.qty ?? 0), 0);
    const isLow = qty <= (stock?.thresholds?.buckleQty || 50);
    return (
      <View key={`${category.name}-${index}`} style={[styles.footbedRow, index % 2 === 1 && styles.footbedRowAlt]}>
        <View style={{ flex: 6 }}>
          <Text style={styles.footbedGender}>{prefix}</Text>
        </View>
        <View style={[styles.footbedQtyCol, { flex: 4 }]}>
          <Text style={[styles.footbedQty, isLow && styles.footbedQtyLow]}>{qty} pcs</Text>
          {isLow && (
            <View style={styles.lowBadge}>
              <Text style={styles.lowBadgeText}>LOW</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderDetailsModal = () => {
    if (!selectedLog) return null;
    return (
      <Modal visible={showDetailsModal} animationType="slide" transparent>
        <View style={styles.detailsOverlay}>
          <TouchableOpacity style={styles.detailsBackdrop} activeOpacity={1} onPress={() => setShowDetailsModal(false)} />
          <View style={styles.detailsContainer}>
            <View style={styles.detailsHandle} />
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>STOCK ENTRY DETAILS</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={styles.detailsContent}>
              {selectedLog.supplierName && (
                <>
                  <Text style={styles.detailsSectionTitle}>SUPPLIER DETAILS</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Supplier Name</Text>
                    <Text style={styles.detailValue}>{selectedLog.supplierName || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice Number</Text>
                    <Text style={styles.detailValue}>{selectedLog.invoiceNumber || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice Date</Text>
                    <Text style={styles.detailValue}>{selectedLog.invoiceDate ? formatDate(selectedLog.invoiceDate) : '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Contact</Text>
                    <Text style={styles.detailValue}>{selectedLog.supplierContact || '—'}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                </>
              )}

              <Text style={styles.detailsSectionTitle}>STOCK DETAILS</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Material</Text>
                <Text style={styles.detailValue}>
                  {selectedLog.material.charAt(0).toUpperCase() + selectedLog.material.slice(1)}
                  {selectedLog.materialType && ` — ${selectedLog.materialType}`}
                </Text>
              </View>
              {selectedLog.material === 'footbed' && selectedLog.footbedGender && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Size</Text>
                  <Text style={styles.detailValue}>
                    {selectedLog.footbedGender} EU {selectedLog.footbedEuSize}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>{(selectedLog.quantity ?? 0).toFixed(selectedLog.unit === 'sqf' ? 2 : 0)} {selectedLog.unit}</Text>
              </View>
              {selectedLog.purchasePrice !== undefined && selectedLog.purchasePrice !== null && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Price per Unit</Text>
                    <Text style={styles.detailValue}>₹{selectedLog.purchasePrice.toFixed(2)}</Text>
                  </View>
                  {selectedLog.totalCost !== undefined && selectedLog.totalCost !== null && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Cost</Text>
                      <Text style={styles.detailValue}>₹{selectedLog.totalCost.toFixed(2)}</Text>
                    </View>
                  )}
                </>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>{selectedLog.type === 'add' ? 'Added' : 'Deducted'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reason</Text>
                <Text style={styles.detailValue}>{getReasonLabel(selectedLog.reason)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Added By</Text>
                <Text style={styles.detailValue}>{selectedLog.updatedByName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formatDate(selectedLog.timestamp)}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Stock Management" />
        <View style={styles.scrollContent}>
          {/* Tabs skeleton */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <Skeleton width="48%" height={40} borderRadius={8} />
            <Skeleton width="48%" height={40} borderRadius={8} />
          </View>
          {/* Material Sub-Tabs skeleton */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            <Skeleton width="30%" height={36} borderRadius={18} />
            <Skeleton width="30%" height={36} borderRadius={18} />
            <Skeleton width="30%" height={36} borderRadius={18} />
          </View>
          {/* Action buttons skeleton */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <Skeleton width="65%" height={44} borderRadius={8} />
            <Skeleton width="30%" height={44} borderRadius={8} />
          </View>
          {/* Total stock header skeleton */}
          <Skeleton width={150} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
          {/* Card skeleton */}
          <Skeleton width="100%" height={120} borderRadius={12} style={{ marginBottom: 24 }} />
          {/* Category title skeleton */}
          <Skeleton width={150} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
          {/* Category table rows skeleton */}
          <Skeleton width="100%" height={50} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={50} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={50} borderRadius={4} style={{ marginBottom: 8 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Stock Management" />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        <FadeInView duration={400}>
          {/* Tab Buttons */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'details' && styles.tabBtnActive]}
              onPress={() => handleTabChange('details')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, activeTab === 'details' && styles.tabBtnTextActive]}>
                STOCK DETAILS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
              onPress={() => handleTabChange('history')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
                STOCK HISTORY
              </Text>
            </TouchableOpacity>
          </View>

          {/* Material Sub-Tabs */}
          <View style={styles.subTabRow}>
            {(['leather', 'buckle', 'footbed'] as const).map((material) => (
              <TouchableOpacity
                key={material}
                style={[
                  styles.subTabBtn,
                  activeMaterial === material && styles.subTabBtnActive,
                ]}
                onPress={() => handleMaterialChange(material)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.subTabBtnText,
                    activeMaterial === material && styles.subTabBtnTextActive,
                  ]}
                >
                  {material === 'leather' ? 'LEATHER' : material === 'buckle' ? 'BUCKLES' : 'FOOTBEDS'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isTransitioning ? (
            <View style={{ marginTop: 20 }}>
              {/* Action buttons skeleton */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <Skeleton width="65%" height={44} borderRadius={8} />
                <Skeleton width="30%" height={44} borderRadius={8} />
              </View>
              {/* Total stock header skeleton */}
              <Skeleton width={150} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
              {/* Card skeleton */}
              <Skeleton width="100%" height={120} borderRadius={12} style={{ marginBottom: 24 }} />
              {/* Category title skeleton */}
              <Skeleton width={150} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
              {/* Category table rows skeleton */}
              <Skeleton width="100%" height={50} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width="100%" height={50} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width="100%" height={50} borderRadius={4} style={{ marginBottom: 8 }} />
            </View>
          ) : activeTab === 'details' ? (
            <>
              {/* 1 Row, 2 Columns for Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.actionRowButton} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="plus" size={18} color={colors.onPrimary} />
                  <Text style={styles.actionRowButtonText}>Add {activeMaterial === 'leather' ? 'Leather' : activeMaterial === 'buckle' ? 'Buckles' : 'Footbeds'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionRowButtonSecondary} onPress={() => setShowCategoriesModal(true)} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="tag-multiple-outline" size={16} color={colors.leatherTan} />
                  <Text style={styles.actionRowButtonTextSecondary}>Categories</Text>
                </TouchableOpacity>
              </View>

              {activeMaterial === 'leather' && (
                <>
                  <Text style={styles.sectionHeader}>TOTAL LEATHER STOCK</Text>
                  <View style={styles.stockGrid}>
                    <StockCard
                      title="Leather Total"
                      value={(stock?.leatherSqf ?? 0).toFixed(2)}
                      unit="sqf"
                      isLow={isLowLeather}
                      threshold={stock?.thresholds?.leatherSqf}
                    />
                  </View>

                  <Text style={styles.sectionHeader}>LEATHER BY CATEGORY</Text>
                  <View style={styles.footbedTable}>
                    <View style={styles.footbedHeader}>
                      <View style={{ flex: 6 }}>
                        <Text style={styles.footbedHeaderText}>Category / Leather Type</Text>
                      </View>
                      <View style={[styles.footbedQtyCol, { flex: 4 }]}>
                        <Text style={[styles.footbedHeaderText, { textAlign: 'right' }]}>Quantity</Text>
                      </View>
                    </View>
                    {currentCategories.length === 0 ? (
                      <View style={styles.footbedEmpty}>
                        <Text style={styles.footbedEmptyText}>No leather categories defined</Text>
                      </View>
                    ) : (
                      currentCategories.map((category, index) => renderLeatherRow(category, index))
                    )}
                  </View>
                </>
              )}

              {activeMaterial === 'buckle' && (
                <>
                  <Text style={styles.sectionHeader}>TOTAL BUCKLE STOCK</Text>
                  <View style={styles.stockGrid}>
                    <StockCard
                      title="Buckles Total"
                      value={stock?.buckleQty || 0}
                      unit="pcs"
                      isLow={isLowBuckle}
                      threshold={stock?.thresholds.buckleQty}
                    />
                  </View>

                  <Text style={styles.sectionHeader}>BUCKLES BY CATEGORY</Text>
                  <View style={styles.footbedTable}>
                    <View style={styles.footbedHeader}>
                      <View style={{ flex: 6 }}>
                        <Text style={styles.footbedHeaderText}>Category / Buckle Type</Text>
                      </View>
                      <View style={[styles.footbedQtyCol, { flex: 4 }]}>
                        <Text style={[styles.footbedHeaderText, { textAlign: 'right' }]}>Quantity</Text>
                      </View>
                    </View>
                    {currentCategories.length === 0 ? (
                      <View style={styles.footbedEmpty}>
                        <Text style={styles.footbedEmptyText}>No buckle categories defined</Text>
                      </View>
                    ) : (
                      currentCategories.map((category, index) => renderBuckleRow(category, index))
                    )}
                  </View>
                </>
              )}

              {activeMaterial === 'footbed' && (
                <>
                  <Text style={styles.sectionHeader}>TOTAL FOOTBED STOCK</Text>
                  <View style={styles.stockGrid}>
                    <StockCard
                      title="Footbeds Total"
                      value={totalFootbedQty}
                      unit="pcs"
                      isLow={isLowFootbed}
                      threshold={stock?.thresholds.footbedQty}
                    />
                  </View>

                  <Text style={styles.sectionHeader}>FOOTBEDS BY CATEGORY</Text>
                  <View style={styles.footbedTable}>
                    <View style={styles.footbedHeader}>
                      <View style={styles.footbedGenderCol}>
                        <Text style={styles.footbedHeaderText}>Gender</Text>
                      </View>
                      <View style={styles.footbedSizeCol}>
                        <Text style={styles.footbedHeaderText}>EU Size</Text>
                      </View>
                      <View style={styles.footbedTypeCol}>
                        <Text style={styles.footbedHeaderText}>Type</Text>
                      </View>
                      <View style={styles.footbedQtyCol}>
                        <Text style={styles.footbedHeaderText}>Qty</Text>
                      </View>
                    </View>
                    {currentCategories.length === 0 ? (
                      <View style={styles.footbedEmpty}>
                        <Text style={styles.footbedEmptyText}>No footbed categories defined</Text>
                      </View>
                    ) : (
                      currentCategories.map((category, index) => renderFootbedRow(category, index))
                    )}
                  </View>
                </>
              )}

              <View style={styles.thresholdSection}>
                <Text style={styles.sectionHeader}>LOW STOCK THRESHOLDS</Text>
                {editingThresholds ? (
                  <View style={styles.thresholdEdit}>
                    {activeMaterial === 'leather' && (
                      <View style={styles.thresholdRow}>
                        <Text style={styles.thresholdLabel}>Leather (sqf):</Text>
                        <TextInput
                          style={styles.thresholdInput}
                          value={thresholdValues.leather}
                          onChangeText={(v) => setThresholdValues({ ...thresholdValues, leather: v })}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={colors.mutedSage}
                        />
                      </View>
                    )}
                    {activeMaterial === 'buckle' && (
                      <View style={styles.thresholdRow}>
                        <Text style={styles.thresholdLabel}>Buckles (pcs):</Text>
                        <TextInput
                          style={styles.thresholdInput}
                          value={thresholdValues.buckle}
                          onChangeText={(v) => setThresholdValues({ ...thresholdValues, buckle: v })}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={colors.mutedSage}
                        />
                      </View>
                    )}
                    {activeMaterial === 'footbed' && (
                      <View style={styles.thresholdRow}>
                        <Text style={styles.thresholdLabel}>Footbeds per size (pcs):</Text>
                        <TextInput
                          style={styles.thresholdInput}
                          value={thresholdValues.footbed}
                          onChangeText={(v) => setThresholdValues({ ...thresholdValues, footbed: v })}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={colors.mutedSage}
                        />
                      </View>
                    )}
                    <View style={styles.thresholdActions}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingThresholds(false)} activeOpacity={0.7}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveThresholds} activeOpacity={0.8}>
                        <Text style={styles.saveBtnText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.setThresholdsBtn} onPress={() => setEditingThresholds(true)} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="tune" size={20} color={colors.leatherTan} />
                    <Text style={styles.setThresholdsText}>
                      Set {activeMaterial === 'leather' ? 'Leather' : activeMaterial === 'buckle' ? 'Buckle' : 'Footbed'} Threshold
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.mutedSage} style={styles.setThresholdsChevron} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionHeader}>
                  {activeMaterial === 'leather' ? 'LEATHER' : activeMaterial === 'buckle' ? 'BUCKLE' : 'FOOTBED'} HISTORY
                </Text>
                <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExportSheet(true)} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="export-variant" size={18} color={colors.leatherTan} />
                  <Text style={styles.exportBtnText}>Export</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateFilterRow}>
                <Text style={styles.dateFilterLabel}>Filter by Date:</Text>
                <TouchableOpacity
                  style={[styles.dateFilterBtn, historyDateFilter && styles.dateFilterBtnActive]}
                  onPress={() => {
                    if (historyDateFilter) {
                      setTempDate(new Date(historyDateFilter));
                    } else {
                      setTempDate(new Date());
                    }
                    setShowDatePicker(true);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="calendar" size={16} color={historyDateFilter ? colors.onPrimary : colors.mutedSage} />
                  <Text style={[styles.dateFilterBtnText, historyDateFilter && styles.dateFilterBtnTextActive]}>
                    {historyDateFilter ? historyDateFilter : 'Select Date'}
                  </Text>
                  {historyDateFilter && (
                    <TouchableOpacity onPress={() => setHistoryDateFilter(null)} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
                      <MaterialCommunityIcons name="close" size={14} color={historyDateFilter ? colors.onPrimary : colors.mutedSage} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(_event: any, selectedDate?: Date) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setHistoryDateFilter(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}

              <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.mutedSage} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by supplier name or invoice number..."
                  placeholderTextColor={colors.mutedSage}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.mutedSage} />
                  </TouchableOpacity>
                )}
              </View>

              {showExportSheet && (
                <View style={styles.exportSheet}>
                  <TouchableOpacity style={styles.overlayBg} onPress={() => setShowExportSheet(false)} />
                  <View style={styles.exportSheetContent}>
                    <Text style={styles.exportSheetTitle}>Export Stock Data</Text>
                    <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('excel')} disabled={exporting} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="file-excel" size={22} color={colors.success} />
                      <Text style={styles.exportOptionText}>Export as Excel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('pdf')} disabled={exporting} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="file-pdf-box" size={22} color={colors.error} />
                      <Text style={styles.exportOptionText}>Export as PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exportCancel} onPress={() => setShowExportSheet(false)} activeOpacity={0.7}>
                      <Text style={styles.exportCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.logTableHeader}>
                <View style={styles.logDateCol}>
                  <Text style={styles.logTableHeaderText}>Date</Text>
                </View>
                <View style={styles.logMaterialCol}>
                  <Text style={styles.logTableHeaderText}>Material</Text>
                </View>
                <View style={[styles.logTypeCol]}>
                  <Text style={styles.logTableHeaderText}>Qty</Text>
                </View>
                <View style={styles.logSupplierCol}>
                  <Text style={styles.logTableHeaderText}>Supplier</Text>
                </View>
                <View style={styles.logInvoiceCol}>
                  <Text style={styles.logTableHeaderText}>Inv No.</Text>
                </View>
                <View style={styles.logActionsCol}>
                  <Text style={styles.logTableHeaderText}>Actions</Text>
                </View>
              </View>

              {displayedLogs.length === 0 ? (
                <View style={styles.emptyLogs}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={32} color={colors.mutedSage} />
                  <Text style={styles.emptyLogsText}>
                    {searchQuery ? 'No entries found for this supplier' : `No ${activeMaterial} history yet`}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={displayedLogs}
                  renderItem={renderLogItem}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                />
              )}

              {filteredLogs.length > 10 && (
                <TouchableOpacity style={styles.viewAllBtn} onPress={() => setShowAllLogs(!showAllLogs)} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>{showAllLogs ? 'Show Less' : `View All (${filteredLogs.length})`}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </FadeInView>
      </ScrollView>

      {renderDetailsModal()}
      <AddStockModal visible={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={loadData} initialMaterial={activeMaterial} />
      <ManageCategoriesModal visible={showCategoriesModal} onClose={() => setShowCategoriesModal(false)} initialMaterial={activeMaterial} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 32 },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.factoryWhite,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabBtnText: {
    ...typography.labelCaps,
    fontSize: 11,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  tabBtnTextActive: {
    color: colors.onPrimary,
  },
  subTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
    justifyContent: 'center',
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.factoryWhite,
  },
  subTabBtnActive: {
    backgroundColor: colors.leatherTan,
    borderColor: colors.leatherTan,
  },
  subTabBtnText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.mutedSage,
    letterSpacing: 0.5,
  },
  subTabBtnTextActive: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  sectionHeader: { ...typography.labelCaps, color: colors.mutedSage, marginBottom: 12, marginTop: 20, letterSpacing: 1 },
  stockGrid: { flexDirection: 'row', gap: 10 },
  footbedSection: { marginTop: 20 },
  footbedTable: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  footbedHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  footbedHeaderText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.mutedSage,
    letterSpacing: 0.5,
  },
  footbedRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    alignItems: 'center',
  },
  footbedRowAlt: {
    backgroundColor: colors.surfaceContainer,
  },
  footbedGenderCol: { flex: 1.5 },
  footbedSizeCol: { flex: 1.5 },
  footbedTypeCol: { flex: 3.5, paddingRight: 8 },
  footbedQtyCol: { flex: 2.5, alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  footbedGender: { ...typography.bodyMd, fontSize: 11, fontWeight: '600', color: colors.onSurface },
  footbedSize: { ...typography.bodyMd, fontSize: 11, fontWeight: '600', color: colors.onSurface },
  footbedType: { ...typography.bodyMd, fontSize: 10, color: colors.onSurface },
  footbedQty: { ...typography.bodyMd, fontSize: 12, fontWeight: '600', color: colors.onSurface },
  footbedQtyLow: { color: colors.error },
  lowBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowBadgeText: {
    ...typography.labelCaps,
    fontSize: 8,
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  footbedEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  footbedEmptyText: {
    ...typography.bodyMd,
    color: colors.mutedSage,
  },
  addButton: {
    backgroundColor: colors.leatherTan,
    borderRadius: BORDER_RADIUS.button,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16
  },
  addButtonText: { ...typography.bodyLg, fontWeight: '600', color: colors.onPrimary },
  categoriesButton: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  categoriesButtonText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  thresholdSection: { marginTop: 8 },
  thresholdEdit: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  thresholdLabel: { ...typography.bodyMd, color: colors.onSurface },
  thresholdInput: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    padding: 12,
    width: 90,
    textAlign: 'center',
    ...typography.bodyMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline
  },
  thresholdActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center'
  },
  cancelBtnText: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: colors.leatherTan,
    alignItems: 'center'
  },
  saveBtnText: { ...typography.bodyLg, fontWeight: '600', color: colors.onPrimary },
  setThresholdsBtn: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  setThresholdsText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  setThresholdsChevron: { marginLeft: 'auto' },
  historySection: { marginTop: 8 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.factoryWhite,
  },
  exportBtnText: {
    ...typography.bodyMd,
    color: colors.leatherTan,
    fontWeight: '500',
  },
  exportSheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  exportSheetContent: {
    backgroundColor: colors.factoryWhite,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  exportSheetTitle: {
    ...typography.titleSm,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 20,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.card,
    backgroundColor: colors.surfaceContainer,
    marginBottom: 10,
  },
  exportOptionText: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '500',
  },
  exportCancel: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  exportCancelText: {
    ...typography.bodyMd,
    color: colors.mutedSage,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: 8,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    padding: 0,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dateFilterLabel: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    fontWeight: '600',
  },
  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  dateFilterBtnActive: {
    backgroundColor: colors.leatherTan,
    borderColor: colors.leatherTan,
  },
  dateFilterBtnText: {
    ...typography.bodyMd,
    color: colors.mutedSage,
  },
  dateFilterBtnTextActive: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  logTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.card,
    marginBottom: 4
  },
  logTableHeaderText: { ...typography.labelCaps, fontSize: 9, color: colors.mutedSage, letterSpacing: 0.5 },
  logRow: {
    flexDirection: 'row',
    backgroundColor: colors.factoryWhite,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    alignItems: 'center'
  },
  logDateCol: { flex: 1.8 },
  logMaterialCol: { flex: 2 },
  logTypeCol: { flex: 1.3, alignItems: 'center' },
  logSupplierCol: { flex: 1.8 },
  logInvoiceCol: { flex: 1.6 },
  logActionsCol: { flex: 1, alignItems: 'center' },
  logDate: { ...typography.bodyMd, fontSize: 11, color: colors.onSurface },
  logTime: { ...typography.bodyMd, fontSize: 9, color: colors.mutedSage },
  logMaterial: { ...typography.bodyMd, fontSize: 11, color: colors.onSurface },
  logTypeSmall: { ...typography.bodyMd, fontSize: 8, color: colors.mutedSage },
  logType: { ...typography.bodyMd, fontWeight: '600' },
  logTypeAdd: {},
  logTypeDeduct: {},
  logTypeTextAdd: { color: colors.success },
  logTypeTextDeduct: { color: colors.error },
  logSupplier: { ...typography.bodyMd, fontSize: 9, color: colors.onSurface },
  logInvoice: { ...typography.bodyMd, fontSize: 9, color: colors.mutedSage },
  emptyLogs: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  emptyLogsText: { ...typography.bodyMd, color: colors.mutedSage, marginTop: 12 },
  viewAllBtn: {
    padding: 16,
    alignItems: 'center'
  },
  viewAllText: { ...typography.bodyMd, color: colors.leatherTan, fontWeight: '600' },
  detailsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  detailsContainer: {
    backgroundColor: colors.factoryWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  detailsHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  detailsTitle: {
    ...typography.labelCaps,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  detailsContent: {
    padding: 20,
  },
  detailsSectionTitle: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  detailLabel: {
    width: 140,
    ...typography.bodyMd,
    color: colors.mutedSage,
  },
  detailValue: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  actionRowButton: {
    flex: 1,
    backgroundColor: colors.leatherTan,
    borderRadius: BORDER_RADIUS.button,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionRowButtonText: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  actionRowButtonSecondary: {
    flex: 1,
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionRowButtonTextSecondary: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.leatherTan,
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  datePickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerContainer: {
    backgroundColor: colors.factoryWhite,
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  datePickerTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  datePickerContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  datePickerClearBtn: {
    flex: 1,
    padding: 14,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
  },
  datePickerClearBtnText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onSurface,
  },
  datePickerConfirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: colors.leatherTan,
    alignItems: 'center',
  },
  datePickerConfirmBtnText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});