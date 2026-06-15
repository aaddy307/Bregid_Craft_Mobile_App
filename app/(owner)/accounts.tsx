import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, Skeleton, FadeInView } from '../../components/ui';
import { getUsers, User } from '../../services/users';

export default function AccountsScreen() {

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    const startTime = Date.now();
    try {
      const allUsers = await getUsers();
      setUsers(allUsers);

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
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };


  const workers = users.filter((u) => u.role === 'worker');
  const managers = users.filter((u) => u.role === 'manager');

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner': return { bg: colors.primary };
      case 'manager': return { bg: colors.leatherTan };
      default: return { bg: colors.secondary };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Accounts" />
        <View style={styles.scrollContent}>
          {/* Stats Row skeleton */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            <Skeleton width="30%" height={74} borderRadius={12} style={{ marginHorizontal: '1.5%' }} />
            <Skeleton width="30%" height={74} borderRadius={12} style={{ marginHorizontal: '1.5%' }} />
            <Skeleton width="30%" height={74} borderRadius={12} style={{ marginHorizontal: '1.5%' }} />
          </View>
          {/* Staff List Header */}
          <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
          {/* User Row Skeletons */}
          <Skeleton width="100%" height={68} borderRadius={4} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={68} borderRadius={4} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={68} borderRadius={4} style={{ marginBottom: 10 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Accounts" />

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.scrollContent}>
        <FadeInView duration={400}>


          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{users.length}</Text>
              <Text style={styles.statLabel}>Total Staff</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{managers.length}</Text>
              <Text style={styles.statLabel}>Managers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workers.length}</Text>
              <Text style={styles.statLabel}>Workers</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>STAFF LIST</Text>

          <View style={styles.tableHeader}>
            <View style={styles.colStaff}>
              <Text style={styles.tableHead}>Staff Member</Text>
            </View>
            <View style={styles.colRole}>
              <Text style={styles.tableHead}>Role</Text>
            </View>
            <View style={styles.colStatus}>
              <Text style={styles.tableHead}>Status</Text>
            </View>
          </View>

          {users.map((user) => {
            const isActive = user.isActive !== false;
            const badgeStyle = getRoleBadgeStyle(user.role);
            return (
              <View key={user._id} style={[styles.userRow, !isActive && styles.userRowInactive]}>
                <View style={[styles.userInfo, styles.colStaff]}>
                  <View style={[styles.avatar, !isActive && styles.avatarInactive]}>
                    <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={[styles.userName, !isActive && styles.textInactive]}>{user.name}</Text>
                    <Text style={[styles.userEmail, !isActive && styles.textInactive]}>{user.email}</Text>
                  </View>
                </View>
                <View style={[styles.colRole, styles.roleBadgeContainer]}>
                  <View style={[styles.roleBadge, { backgroundColor: badgeStyle.bg }]}>
                    <Text style={styles.roleBadgeText}>{user.role.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={[styles.colStatus, styles.statusContainer]}>
                  <View style={styles.statusIndicator}>
                    <View style={[styles.statusDot, isActive ? styles.statusDotActive : styles.statusDotInactive]} />
                    <Text style={styles.statusText}>{isActive ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 32 },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainer,
    padding: 14,
    borderRadius: BORDER_RADIUS.card,
    marginBottom: 16
  },
  readOnlyText: { ...typography.bodyMd, color: colors.mutedSage },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  statValue: { ...typography.headlineMd, color: colors.onSurface },
  statLabel: { ...typography.labelCaps, fontSize: 10, color: colors.mutedSage, marginTop: 4, letterSpacing: 0.5 },
  sectionTitle: { ...typography.labelCaps, color: colors.mutedSage, marginBottom: 12, letterSpacing: 1 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.card,
    marginBottom: 4,
  },
  tableHead: { ...typography.labelCaps, fontSize: 10, color: colors.mutedSage, letterSpacing: 0.5 },
  colStaff: { flex: 1 },
  colRole: { width: 70, alignItems: 'center' },
  colStatus: { width: 70, alignItems: 'center' },
  colTarget: { width: 70, alignItems: 'flex-end' },
  userRow: {
    flexDirection: 'row',
    backgroundColor: colors.factoryWhite,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    alignItems: 'center'
  },
  userRowInactive: { opacity: 0.5 },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarInactive: { backgroundColor: colors.mutedSage },
  avatarText: { ...typography.labelCaps, fontSize: 13, color: colors.onPrimary, fontWeight: '600' },
  userDetails: { flex: 1 },
  userName: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface },
  userEmail: { ...typography.bodyMd, fontSize: 11, color: colors.mutedSage, marginTop: 2 },
  textInactive: { color: colors.mutedSage },
  roleBadgeContainer: { justifyContent: 'center' },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.pill
  },
  roleBadgeText: { ...typography.labelCaps, fontSize: 9, color: colors.onPrimary, letterSpacing: 0.5 },
  statusContainer: { justifyContent: 'center' },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotActive: { backgroundColor: colors.success },
  statusDotInactive: { backgroundColor: colors.mutedSage },
  statusText: { ...typography.bodyMd, fontSize: 11, color: colors.onSurfaceVariant },
  targetContainer: { justifyContent: 'center' },
  targetText: { ...typography.bodyMd, fontSize: 12, color: colors.leatherTan, fontWeight: '600' },
  noTarget: { ...typography.bodyMd, fontSize: 12, color: colors.mutedSage },
});