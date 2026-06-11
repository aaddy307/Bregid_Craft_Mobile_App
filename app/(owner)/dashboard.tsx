import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, Skeleton, FadeInView } from '../../components/ui';
import { useAuthStore, useStockStore } from '../../store';
import { getStock } from '../../services';
import { getProductionLogs, ProductionLog, getDailyStats } from '../../services/production';
import { getUsers } from '../../services/users';

export default function OwnerDashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const stock = useStockStore((state) => state.stock);
  const isLowLeather = useStockStore((state) => state.isLowStock('leather'));
  const isLowBuckle = useStockStore((state) => state.isLowStock('buckle'));
  const isLowFootbed = useStockStore((state) => state.isLowStock('footbed'));

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayLogs, setTodayLogs] = useState<ProductionLog[]>([]);
  const [weekLogs, setWeekLogs] = useState<ProductionLog[]>([]);
  const [monthLogs, setMonthLogs] = useState<ProductionLog[]>([]);
  const [workerStats, setWorkerStats] = useState<{ workerId: string; name: string; pairs: number }[]>([]);
  const [activeWorkers, setActiveWorkers] = useState(0);

  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    const startTime = Date.now();
    try {
      await getStock();
      const allLogs = await getProductionLogs({}, 500);
      const users = await getUsers();

      setActiveWorkers(users.filter((u: { role: string; isActive?: boolean }) => u.role === 'worker' && u.isActive !== false).length);

      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - 1);

      const weekStr = weekStart.toISOString().split('T')[0];
      const monthStr = monthStart.toISOString().split('T')[0];

      setTodayLogs(allLogs.filter((l: ProductionLog) => l.logDate === today));
      setWeekLogs(allLogs.filter((l: ProductionLog) => l.logDate >= weekStr && l.logDate <= today));
      setMonthLogs(allLogs.filter((l: ProductionLog) => l.logDate >= monthStr && l.logDate <= today));

      const workerMap: Record<string, { name: string; pairs: number }> = {};
      allLogs.filter((l: ProductionLog) => l.logDate === today).forEach((log: ProductionLog) => {
        if (!workerMap[log.workerId]) {
          workerMap[log.workerId] = { name: log.workerName, pairs: 0 };
        }
        workerMap[log.workerId].pairs += log.quantityPairs;
      });
      setWorkerStats(
        Object.entries(workerMap)
          .map(([id, data]) => ({ workerId: id, ...data }))
          .sort((a, b) => b.pairs - a.pairs)
      );

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

  const todayPairs = todayLogs.reduce((sum, l) => sum + l.quantityPairs, 0);
  const weekPairs = weekLogs.reduce((sum, l) => sum + l.quantityPairs, 0);
  const monthPairs = monthLogs.reduce((sum, l) => sum + l.quantityPairs, 0);

  const menPairs = todayLogs.filter((l) => l.gender === 'Men').reduce((sum, l) => sum + l.quantityPairs, 0);
  const womenPairs = todayLogs.filter((l) => l.gender === 'Women').reduce((sum, l) => sum + l.quantityPairs, 0);
  const totalTodayPairs = menPairs + womenPairs;

  const productBreakdown = todayLogs.reduce((acc, log) => {
    if (!acc[log.productName]) acc[log.productName] = 0;
    acc[log.productName] += log.quantityPairs;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Owner Dashboard" rightAction={{ icon: 'logout', onPress: handleLogout }} />
        <View style={styles.scrollContent}>
          {/* Hero Row */}
          <View style={styles.heroRow}>
            <Skeleton width="48%" height={100} borderRadius={12} />
            <Skeleton width="48%" height={100} borderRadius={12} />
          </View>
          {/* Production Summary Title */}
          <Skeleton width={180} height={16} borderRadius={4} style={{ marginTop: 20, marginBottom: 12 }} />
          {/* Production grid cell skeletons */}
          <View style={styles.productionGrid}>
            <Skeleton width="30%" height={90} borderRadius={12} style={{ marginHorizontal: '1.5%' }} />
            <Skeleton width="30%" height={90} borderRadius={12} style={{ marginHorizontal: '1.5%' }} />
            <Skeleton width="30%" height={90} borderRadius={12} style={{ marginHorizontal: '1.5%' }} />
          </View>
          {/* Current Stock */}
          <Skeleton width={150} height={16} borderRadius={4} style={{ marginTop: 20, marginBottom: 12 }} />
          <Skeleton width="100%" height={150} borderRadius={12} style={{ marginBottom: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Owner Dashboard" rightAction={{ icon: 'logout', onPress: handleLogout }} />

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.scrollContent}>
        <FadeInView duration={400}>
          {/* Hero Section */}
          <View style={styles.heroRow}>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>FACTORY STATUS</Text>
              <Text style={styles.heroValue}>Floor Operations</Text>
              <MaterialCommunityIcons name="factory" size={28} color={colors.onSurface} style={styles.heroIcon} />
            </View>
            <View style={[styles.heroCard, styles.heroCardAccent]}>
              <Text style={styles.heroLabelDark}>ACTIVE WORKERS</Text>
              <Text style={styles.heroValueDark}>{activeWorkers}</Text>
            </View>
          </View>

          {/* Production Summary */}
          <Text style={styles.sectionLabel}>PRODUCTION SUMMARY</Text>
          <View style={styles.productionGrid}>
            <View style={styles.productionCell}>
              <Text style={styles.productionPeriod}>TODAY</Text>
              <Text style={styles.productionValue}>{todayPairs}</Text>
              <Text style={styles.productionUnit}>pairs</Text>
            </View>
            <View style={styles.productionCell}>
              <Text style={styles.productionPeriod}>THIS WEEK</Text>
              <Text style={styles.productionValue}>{weekPairs}</Text>
              <Text style={styles.productionUnit}>pairs</Text>
            </View>
            <View style={styles.productionCell}>
              <Text style={styles.productionPeriod}>THIS MONTH</Text>
              <Text style={styles.productionValue}>{monthPairs}</Text>
              <Text style={styles.productionUnit}>pairs</Text>
            </View>
          </View>

          {/* Product Breakdown */}
          {Object.keys(productBreakdown).length > 0 && (
            <>
              <Text style={styles.sectionLabel}>PRODUCT BREAKDOWN</Text>
              <View style={styles.breakdownCard}>
                {Object.entries(productBreakdown).sort((a, b) => b[1] - a[1]).map(([name, pairs]) => (
                  <View key={name} style={styles.breakdownRow}>
                    <Text style={styles.breakdownName}>{name}</Text>
                    <Text style={styles.breakdownValue}>{pairs} pairs</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Gender Distribution */}
          {totalTodayPairs > 0 && (
            <>
              <Text style={styles.sectionLabel}>GENDER DISTRIBUTION</Text>
              <View style={styles.genderCard}>
                <View style={styles.genderRow}>
                  <Text style={styles.genderLabel}>Men</Text>
                  <Text style={styles.genderValue}>{menPairs} pairs</Text>
                </View>
                <View style={styles.genderBar}>
                  <View style={[styles.genderBarFill, styles.genderBarMen, { width: `${(menPairs / totalTodayPairs) * 100}%` }]} />
                </View>
                <View style={[styles.genderRow, { marginTop: 12 }]}>
                  <Text style={styles.genderLabel}>Women</Text>
                  <Text style={styles.genderValue}>{womenPairs} pairs</Text>
                </View>
                <View style={styles.genderBar}>
                  <View style={[styles.genderBarFill, styles.genderBarWomen, { width: `${(womenPairs / totalTodayPairs) * 100}%` }]} />
                </View>
              </View>
            </>
          )}

          {/* Stock Levels */}
          <Text style={styles.sectionLabel}>CURRENT STOCK</Text>
          <View style={styles.stockCard}>
            <View style={styles.stockHeader}>
              <Text style={[styles.stockHeaderText, styles.flex1]}>MATERIAL</Text>
              <Text style={[styles.stockHeaderText, styles.width80]}>QTY</Text>
              <Text style={[styles.stockHeaderText, styles.width60]}>STATUS</Text>
            </View>
            <View style={styles.stockRow}>
              <Text style={[styles.stockCell, styles.flex1]}>Leather</Text>
              <Text style={[styles.stockCell, styles.width80]}>{(stock?.leatherSqf ?? 0).toFixed(1)} sqf</Text>
              <Text style={[styles.stockCell, styles.width60]}>{isLowLeather ? 'Low' : 'OK'}</Text>
            </View>
            <View style={styles.stockRow}>
              <Text style={[styles.stockCell, styles.flex1]}>Buckle</Text>
              <Text style={[styles.stockCell, styles.width80]}>{stock?.buckleQty || 0} pcs</Text>
              <Text style={[styles.stockCell, styles.width60]}>{isLowBuckle ? 'Low' : 'OK'}</Text>
            </View>
            <View style={[styles.stockRow, styles.lastRow]}>
              <Text style={[styles.stockCell, styles.flex1]}>Footbed</Text>
              <Text style={[styles.stockCell, styles.width80]}>{stock?.footbeds?.reduce((sum, f) => sum + f.qty, 0) || 0} pcs</Text>
              <Text style={[styles.stockCell, styles.width60]}>{isLowFootbed ? 'Low' : 'OK'}</Text>
            </View>
          </View>

          {/* Worker Performance */}
          {workerStats.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>WORKER PERFORMANCE</Text>
              {workerStats.map((worker, index) => (
                <View key={worker.workerId} style={[styles.workerCard, index === 0 && styles.topWorker]}>
                  <View style={styles.workerInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{worker.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</Text>
                    </View>
                    <Text style={styles.workerName}>{worker.name}</Text>
                  </View>
                  <Text style={styles.workerPairs}>{worker.pairs} pairs</Text>
                </View>
              ))}
            </>
          )}
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 32 },
  heroRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  heroCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    justifyContent: 'space-between',
  },
  heroCardAccent: {
    backgroundColor: colors.leatherTan,
  },
  heroLabel: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.mutedSage,
    letterSpacing: 1,
  },
  heroLabelDark: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.onPrimary,
    opacity: 0.8,
    letterSpacing: 1,
  },
  heroValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    marginTop: 4,
  },
  heroValueDark: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.onPrimary,
    marginTop: 4,
  },
  heroIcon: { marginTop: 8 },
  sectionLabel: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    marginBottom: 12,
    marginTop: 20,
    letterSpacing: 1,
  },
  productionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  productionCell: {
    flex: 1,
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  productionPeriod: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.mutedSage,
    letterSpacing: 1,
  },
  productionValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 8,
  },
  productionUnit: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    marginTop: 2,
  },
  breakdownCard: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  breakdownName: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  breakdownValue: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.leatherTan,
  },
  genderCard: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  genderValue: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.onSurface,
  },
  genderBar: {
    height: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
  },
  genderBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  genderBarMen: {
    backgroundColor: colors.primary,
  },
  genderBarWomen: {
    backgroundColor: colors.leatherTan,
  },
  stockCard: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  stockHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  stockHeaderText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.mutedSage,
    letterSpacing: 1,
  },
  stockRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  stockCell: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurface,
  },
  flex1: { flex: 1 },
  width80: { width: 80, textAlign: 'right' },
  width60: { width: 60, textAlign: 'right' },
  workerCard: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  topWorker: {
    borderLeftWidth: 4,
    borderLeftColor: colors.leatherTan,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.labelCaps,
    fontSize: 12,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  workerName: {
    ...typography.bodyMd,
    fontWeight: '500',
    color: colors.onSurface,
  },
  workerPairs: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.leatherTan,
  },
});