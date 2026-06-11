import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, FlatList, TouchableOpacity, Share, Platform, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, WorkerLogEntry, Skeleton, FadeInView } from '../../components/ui';
import { getProductionLogs, ProductionLog } from '../../services/production';
import { formatEUSize, formatDateTime } from '../../utils';

export default function ProductionScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    const startTime = Date.now();
    try {
      const allLogs = await getProductionLogs({}, 100);
      setLogs(allLogs.filter((l) => l.logDate === dateFilter));

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
  }, [dateFilter]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

  const exportProduction = async () => {
    const report = `BREGID FACTORY - Production Log\nDate: ${dateFilter}\nTotal Entries: ${logs.length}\nTotal Pairs: ${logs.reduce((sum, l) => sum + l.quantityPairs, 0)}\n\n${logs.map((l) => `${l.workerName} | ${l.productName} | ${l.quantityPairs} pairs | EU ${l.euSize}`).join('\n')}`;
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

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <FadeInView duration={400}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{logs.length}</Text>
              <Text style={styles.summaryLabel}>Entries</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{logs.reduce((s, l) => s + l.quantityPairs, 0)}</Text>
              <Text style={styles.summaryLabel}>Total Pairs</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{logs.reduce((s, l) => s + (l.leatherDeductedSqf ?? 0), 0).toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Leather (sqf)</Text>
            </View>
          </View>

          {logs.map((log) => (
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

          {logs.length === 0 && <Text style={styles.emptyText}>No production logs for this date</Text>}
        </FadeInView>
      </ScrollView>
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
});