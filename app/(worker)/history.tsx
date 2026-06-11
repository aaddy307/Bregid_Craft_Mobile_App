import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, WorkerLogEntry, Skeleton, FadeInView } from '../../components/ui';
import { EditEntryModal } from '../../components/modals';
import { useAuthStore } from '../../store';
import { getWorkerLogs, ProductionLog } from '../../services/production';

export default function WorkerHistory() {
  const user = useAuthStore((state) => state.user);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [editingLog, setEditingLog] = useState<ProductionLog | null>(null);

  const loadData = useCallback(async (showSkeleton = true) => {
    if (!user) return;
    if (showSkeleton) setIsLoading(true);
    const startTime = Date.now();
    try {
      const workerLogs = await getWorkerLogs(user._id, 50);
      setLogs(workerLogs);

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
  }, [user]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

  const handleDelete = (log: ProductionLog) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? Stock will be restored.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { deleteProductionLog } = await import('../../services/production');
            if (user) {
              await deleteProductionLog(log._id, user._id, user.name);
              await loadData();
            }
          },
        },
      ]
    );
  };

  const canEdit = (log: ProductionLog) => {
    const today = new Date().toISOString().split('T')[0];
    return log.logDate === today;
  };

  const groupedLogs = logs.reduce((acc, log) => {
    const date = log.logDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, ProductionLog[]>);

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="My Production History" />
        <View style={styles.scrollContent}>
          <View style={styles.dateGroup}>
            <View style={styles.dateHeader}>
              <Skeleton width={100} height={18} borderRadius={4} />
              <Skeleton width={60} height={18} borderRadius={4} />
            </View>
            <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
          </View>
          <View style={styles.dateGroup}>
            <View style={styles.dateHeader}>
              <Skeleton width={100} height={18} borderRadius={4} />
              <Skeleton width={60} height={18} borderRadius={4} />
            </View>
            <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="My Production History" />

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.scrollContent}>
        <FadeInView duration={400}>
          {sortedDates.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={56} color={colors.mutedSage} />
              <Text style={styles.emptyText}>No production entries yet</Text>
              <Text style={styles.emptySubtext}>Your logged entries will appear here</Text>
            </View>
          ) : (
            sortedDates.map((date) => (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateText}>{date}</Text>
                  <Text style={styles.dateSummary}>
                    {groupedLogs[date].reduce((sum, l) => sum + l.quantityPairs, 0)} pairs
                  </Text>
                </View>
                {groupedLogs[date].map((log) => (
                  <WorkerLogEntry
                    key={log._id}
                    log={log}
                    canEdit={canEdit(log)}
                    onEdit={() => setEditingLog(log)}
                    onDelete={() => handleDelete(log)}
                  />
                ))}
              </View>
            ))
          )}
        </FadeInView>
      </ScrollView>

      <EditEntryModal
        visible={!!editingLog}
        onClose={() => setEditingLog(null)}
        log={editingLog}
        onSuccess={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 32 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64
  },
  emptyText: { ...typography.bodyLg, color: colors.mutedSage, marginTop: 16 },
  emptySubtext: { ...typography.bodyMd, color: colors.mutedSage, marginTop: 8 },
  dateGroup: { marginBottom: 24 },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant
  },
  dateText: { ...typography.labelCaps, color: colors.mutedSage, letterSpacing: 1 },
  dateSummary: { ...typography.bodyMd, color: colors.leatherTan, fontWeight: '600' },
});