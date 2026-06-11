import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, Skeleton } from '../../components/ui';
import { useAuthStore } from '../../store';
import { getStock, getProducts } from '../../services';
import { getTodayLogs, getDailyStats } from '../../services/production';
import { formatEUSize, formatTime } from '../../utils';
import { ProductionLog } from '../../services/production';

export default function WorkerHome() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayPairs, setTodayPairs] = useState(0);
  const [dailyTarget, setDailyTarget] = useState(user?.dailyTarget || 0);
  const [progress, setProgress] = useState(0);
  const [todayLogs, setTodayLogs] = useState<ProductionLog[]>([]);
  const [targetReached, setTargetReached] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await Promise.all([getStock(), getProducts()]);
      const stats = await getDailyStats();
      setTodayPairs(stats.totalPairs);

      const logs = await getTodayLogs();
      setTodayLogs(logs.filter((l) => l.workerId === user?._id));

      if (dailyTarget > 0) {
        const newProgress = Math.min((stats.totalPairs / dailyTarget) * 100, 100);
        setProgress(newProgress);
        if (newProgress >= 100 && !targetReached) {
          setTargetReached(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [dailyTarget, targetReached, user?._id]);

  useEffect(() => {
    loadData();
    registerPushToken();
  }, [loadData]);

  const registerPushToken = async () => {
    try {
      const { getExpoPushToken } = await import('../../services/notifications');
      const token = await getExpoPushToken();
      if (token) {
        const { updateExpoPushToken } = await import('../../services/auth');
        await updateExpoPushToken(token);
      }
    } catch {
      // Silently handle push token errors
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    const { logout } = await import('../../services/auth');
    await logout();
    router.replace('/login');
  };

  const progressColor = progress >= 100 ? colors.success : progress >= 50 ? colors.leatherTan : '#FF8F00';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Worker Home" rightAction={{ icon: 'logout', onPress: handleLogout }} />
        <View style={styles.scrollContent}>
          {/* Date skeleton */}
          <Skeleton width={120} height={20} borderRadius={10} style={{ marginBottom: 12 }} />
          {/* Greeting skeleton */}
          <Skeleton width={180} height={32} borderRadius={6} style={{ marginBottom: 20 }} />
          {/* Target card skeleton */}
          <Skeleton width="100%" height={160} borderRadius={12} style={{ marginBottom: 16 }} />
          {/* Log button skeleton */}
          <Skeleton width="100%" height={68} borderRadius={12} style={{ marginBottom: 24 }} />
          {/* Section header skeleton */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            <Skeleton width={130} height={16} borderRadius={4} />
            <Skeleton width={50} height={16} borderRadius={4} />
          </View>
          {/* Log list item skeletons */}
          <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 10 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Worker Home" rightAction={{ icon: 'logout', onPress: handleLogout }} />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Display */}
        <View style={styles.dateBadge}>
          <MaterialCommunityIcons name="calendar" size={12} color={colors.mutedSage} />
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
          </Text>
        </View>

        {/* Greeting */}
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingSub}>WELCOME BACK</Text>
          <Text style={styles.greeting}>{user?.name}</Text>
        </View>

        {/* Target Card */}
        {dailyTarget > 0 ? (
          <View style={[styles.targetCard, targetReached && styles.targetCardSuccess]}>
            <View style={styles.targetHeader}>
              <View style={styles.targetLabelContainer}>
                <MaterialCommunityIcons name="trophy-outline" size={16} color={colors.onPrimary} />
                <Text style={styles.targetLabel}>DAILY TARGET PROGRESS</Text>
              </View>
              {targetReached && (
                <View style={styles.reachedBadge}>
                  <MaterialCommunityIcons name="check-decagram" size={12} color={colors.success} />
                  <Text style={styles.reachedText}>PASSED!</Text>
                </View>
              )}
            </View>
            <View style={styles.targetStats}>
              <View style={styles.targetPairs}>
                <Text style={styles.targetCurrent}>{todayPairs}</Text>
                <Text style={styles.targetSeparator}>/</Text>
                <Text style={styles.targetGoal}>{dailyTarget}</Text>
              </View>
              <Text style={styles.targetUnit}>pairs completed today</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: targetReached ? '#4CAF50' : '#FFB74D' }]} />
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressText}>{Math.round(progress)}% COMPLETE</Text>
              <Text style={styles.progressRemaining}>
                {todayPairs >= dailyTarget ? 'Target met!' : `${dailyTarget - todayPairs} pairs to go`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noTargetCard}>
            <MaterialCommunityIcons name="target" size={32} color={colors.mutedSage} />
            <Text style={styles.noTargetText}>No production target set for today.</Text>
            <Text style={styles.noTargetSub}>Please ask your manager to set a daily target.</Text>
          </View>
        )}

        {/* Log Production Button */}
        <TouchableOpacity
          style={styles.logButton}
          onPress={() => router.push('/log-production/step1-select')}
          activeOpacity={0.9}
        >
          <View style={styles.logIconWrapper}>
            <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
          </View>
          <View style={styles.logButtonContent}>
            <Text style={styles.logButtonTitle}>LOG PRODUCTION</Text>
            <Text style={styles.logButtonSubtitle}>Record a new pair entry</Text>
          </View>
          <View style={styles.arrowWrapper}>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onPrimary} />
          </View>
        </TouchableOpacity>

        {/* Today's Production Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="clipboard-text-clock-outline" size={16} color={colors.mutedSage} />
              <Text style={styles.sectionTitle}>TODAY'S ENTRIES</Text>
            </View>
            <Text style={styles.sectionCount}>{todayLogs.length} LOGS</Text>
          </View>

          {todayLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="inbox-outline" size={36} color={colors.mutedSage} />
              <Text style={styles.emptyText}>No entries logged today</Text>
              <Text style={styles.emptySubtext}>Your production logs will show up here as you submit them.</Text>
            </View>
          ) : (
            todayLogs.map((log) => (
              <View key={log._id} style={styles.entryCard}>
                <View style={styles.entryBorder} />
                <View style={styles.entryCardContent}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryProduct} numberOfLines={1}>{log.productName}</Text>
                    <View style={styles.timeTag}>
                      <MaterialCommunityIcons name="clock-outline" size={10} color={colors.mutedSage} />
                      <Text style={styles.entryTime}>{formatTime(log.timestamp)}</Text>
                    </View>
                  </View>
                  <View style={styles.entryMeta}>
                    <View style={styles.entryTag}>
                      <MaterialCommunityIcons name="ruler" size={12} color={colors.onSurfaceVariant} />
                      <Text style={styles.entryTagText}>EU {formatEUSize(log.euSize)}</Text>
                    </View>
                    <View style={styles.entryTag}>
                      <MaterialCommunityIcons name="gender-male-female" size={12} color={colors.onSurfaceVariant} />
                      <Text style={styles.entryTagText}>{log.gender}</Text>
                    </View>
                    <View style={[styles.entryTag, styles.entryTagHighlight]}>
                      <MaterialCommunityIcons name="check" size={12} color={colors.primary} />
                      <Text style={[styles.entryTagText, styles.entryTagTextHighlight]}>{log.quantityPairs} PAIRS</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },

  // Date Display
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.pill,
    marginBottom: 8,
  },
  dateText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.mutedSage,
    letterSpacing: 0.8
  },

  // Greeting
  greetingHeader: {
    marginBottom: 20,
  },
  greetingSub: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  greeting: {
    ...typography.displaySm,
    fontWeight: '800',
    color: colors.onSurface,
    marginTop: 2
  },

  // Target Card
  targetCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: BORDER_RADIUS.card,
    padding: 18,
    marginBottom: 16,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  targetCardSuccess: {
    backgroundColor: '#1B5E20', // deep green for target reached
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  targetLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetLabel: {
    ...typography.labelCaps,
    color: colors.onPrimary,
    fontSize: 9,
    opacity: 0.9,
    letterSpacing: 1
  },
  reachedBadge: {
    backgroundColor: colors.factoryWhite,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reachedText: {
    ...typography.labelCaps,
    color: colors.success,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  targetStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  targetPairs: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  targetCurrent: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.onPrimary
  },
  targetSeparator: {
    fontSize: 20,
    color: colors.onPrimary,
    opacity: 0.4,
    marginHorizontal: 2,
  },
  targetGoal: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.onPrimary,
    opacity: 0.8
  },
  targetUnit: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onPrimary,
    opacity: 0.7,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 14
  },
  progressFill: {
    height: '100%',
    borderRadius: 3
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.onPrimary,
    opacity: 0.7,
    letterSpacing: 0.5
  },
  progressRemaining: {
    ...typography.bodyMd,
    fontSize: 10,
    color: colors.onPrimary,
    opacity: 0.8,
    fontWeight: '600',
  },

  // No Target
  noTargetCard: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  noTargetText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 10
  },
  noTargetSub: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.mutedSage,
    marginTop: 4,
  },

  // Log Button
  logButton: {
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.button,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    minHeight: 68,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  logIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.factoryWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonContent: { flex: 1 },
  logButtonTitle: {
    ...typography.labelCaps,
    fontWeight: '800',
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  logButtonSubtitle: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onPrimary,
    opacity: 0.8,
    marginTop: 2
  },
  arrowWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  section: { marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    fontSize: 10,
    letterSpacing: 1
  },
  sectionCount: {
    ...typography.labelCaps,
    color: colors.leatherTan,
    fontSize: 9,
    letterSpacing: 0.5
  },

  // Empty State
  emptyCard: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyText: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface, marginTop: 10 },
  emptySubtext: { ...typography.bodyMd, fontSize: 12, color: colors.mutedSage, marginTop: 4, textAlign: 'center' },

  // Entry Card
  entryCard: {
    flexDirection: 'row',
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  entryBorder: {
    width: 4,
    backgroundColor: colors.leatherTan,
  },
  entryCardContent: {
    flex: 1,
    padding: 14,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  entryProduct: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface, flex: 1 },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryTime: { ...typography.bodyMd, fontSize: 11, color: colors.mutedSage },
  entryMeta: { flexDirection: 'row', gap: 8 },
  entryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  entryTagHighlight: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.outlineVariant,
    borderWidth: 0.5,
  },
  entryTagText: { ...typography.bodyMd, fontSize: 11, fontWeight: '500', color: colors.onSurfaceVariant },
  entryTagTextHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
});