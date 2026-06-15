import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { AppHeader, Skeleton, FadeInView } from '../../components/ui';
import { CreateAccountModal, ResetPasswordModal } from '../../components/modals';
import { useAuthStore, User } from '../../store';
import { getUsers, deactivateUser, activateUser, setWorkerTarget, resetUserPassword, deleteUser } from '../../services/users';

// Cross-platform confirm dialog (Alert.alert doesn't work on web)
function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: onConfirm },
    ]);
  }
}

export default function ManagerAccountsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<{ workerId: string; name: string; target: number } | null>(null);
  const [targetInput, setTargetInput] = useState('');
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

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


  const handleToggleActive = async (user: User) => {
    const action = user.isActive !== false ? 'deactivate' : 'activate';
    confirmAction(
      `${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} Account`,
      `Are you sure you want to ${action} ${user.name}'s account?`,
      async () => {
        if (action === 'deactivate') {
          await deactivateUser(user._id);
        } else {
          await activateUser(user._id);
        }
        await loadData();
      }
    );
  };

  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user);
  };

  const handleDeleteUser = async (user: User) => {
    confirmAction(
      'Delete Account',
      `Are you sure you want to permanently delete ${user.name}'s account? This action cannot be undone.`,
      async () => {
        const success = await deleteUser(user._id);
        if (success) {
          await loadData();
        } else {
          if (Platform.OS === 'web') {
            window.alert('Failed to delete account.');
          } else {
            Alert.alert('Error', 'Failed to delete account.');
          }
        }
      }
    );
  };

  const handleSaveTarget = async () => {
    if (!editingTarget) return;
    const newTarget = parseInt(targetInput) || 0;
    await setWorkerTarget(editingTarget.workerId, newTarget);
    setEditingTarget(null);
    await loadData();
  };

  const workers = users.filter((u) => u.role === 'worker');
  const managers = users.filter((u) => u.role === 'manager');

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Account Management" />
        <View style={styles.scrollContent}>
          {/* Create Button skeleton */}
          <Skeleton width="100%" height={52} borderRadius={8} style={{ marginBottom: 16 }} />
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
      <AppHeader title="Account Management" />

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.scrollContent}>
        <FadeInView duration={400}>
          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="account-plus" size={22} color={colors.onPrimary} />
            <Text style={styles.createButtonText}>Create New Account</Text>
          </TouchableOpacity>

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
            <View style={styles.colActions}>
              <Text style={styles.tableHead}>Actions</Text>
            </View>
          </View>

          {users.map((user) => {
            const isActive = user.isActive !== false;
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
                  <View style={[styles.roleBadge, user.role === 'manager' ? styles.roleBadgeManager : styles.roleBadgeWorker]}>
                    <Text style={styles.roleBadgeText}>{user.role.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={[styles.colStatus, styles.statusContainer]}>
                  <View style={styles.statusIndicator}>
                    <View style={[styles.statusDot, isActive ? styles.statusDotActive : styles.statusDotInactive]} />
                    <Text style={styles.statusText}>{isActive ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>
                <View style={[styles.colActions, styles.actionsContainer]}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleActive(user)} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>{isActive ? 'Deactivate' : 'Reactivate'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnSmall} onPress={() => handleResetPassword(user)} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="lock-reset" size={18} color={colors.mutedSage} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnSmall} onPress={() => handleDeleteUser(user)} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {workers.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>DAILY TARGETS</Text>
              {workers.map((worker) => (
                <View key={worker._id} style={styles.targetRow}>
                  <View style={styles.targetWorkerInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(worker.name)}</Text>
                    </View>
                    <Text style={styles.targetWorkerName}>{worker.name}</Text>
                  </View>
                  {editingTarget?.workerId === worker._id ? (
                    <View style={styles.targetEdit}>
                      <TextInput
                        style={styles.targetInput}
                        value={targetInput}
                        onChangeText={setTargetInput}
                        keyboardType="number-pad"
                        placeholder="Target"
                        placeholderTextColor={colors.mutedSage}
                      />
                      <TouchableOpacity style={styles.targetSaveBtn} onPress={handleSaveTarget} activeOpacity={0.7}>
                        <Text style={styles.targetSaveText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.targetCancelBtn} onPress={() => setEditingTarget(null)} activeOpacity={0.7}>
                        <Text style={styles.targetCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.targetDisplay} onPress={() => {
                      setEditingTarget({ workerId: worker._id, name: worker.name, target: worker.dailyTarget || 0 });
                      setTargetInput(String(worker.dailyTarget || 0));
                    }} activeOpacity={0.7}>
                      <Text style={styles.targetValue}>{worker.dailyTarget || 0}</Text>
                      <Text style={styles.targetUnit}>pairs/day</Text>
                      <MaterialCommunityIcons name="pencil" size={16} color={colors.leatherTan} style={styles.targetEditIcon} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </>
          )}
        </FadeInView>
      </ScrollView>

      <CreateAccountModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={loadData} />
      <ResetPasswordModal
        visible={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        userId={resetPasswordUser?._id || null}
        userName={resetPasswordUser?.name || ''}
        onSuccess={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 32 },
  createButton: {
    backgroundColor: colors.leatherTan,
    borderRadius: BORDER_RADIUS.button,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16
  },
  createButtonText: { ...typography.bodyLg, fontWeight: '600', color: colors.onPrimary },
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
  colRole: { width: 65, alignItems: 'center' },
  colStatus: { width: 65, alignItems: 'center' },
  colActions: { width: 120, alignItems: 'flex-end' },
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
  roleBadgeManager: { backgroundColor: colors.leatherTan },
  roleBadgeWorker: { backgroundColor: colors.secondary },
  roleBadgeText: { ...typography.labelCaps, fontSize: 9, color: colors.onPrimary, letterSpacing: 0.5 },
  statusContainer: { justifyContent: 'center' },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotActive: { backgroundColor: colors.success },
  statusDotInactive: { backgroundColor: colors.mutedSage },
  statusText: { ...typography.bodyMd, fontSize: 11, color: colors.onSurfaceVariant },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  actionBtn: {
    paddingVertical: 4,
  },
  actionBtnSmall: {
    paddingVertical: 4,
    marginLeft: 8,
  },
  actionBtnText: { ...typography.labelCaps, fontSize: 10, color: colors.leatherTan, letterSpacing: 0.5 },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  targetWorkerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  targetWorkerName: { ...typography.bodyMd, fontWeight: '500', color: colors.onSurface },
  targetEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  targetInput: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 70,
    ...typography.bodyMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
    textAlign: 'center',
  },
  targetSaveBtn: {
    backgroundColor: colors.success,
    borderRadius: BORDER_RADIUS.button,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  targetSaveText: { ...typography.labelCaps, fontSize: 10, color: colors.onPrimary },
  targetCancelBtn: { paddingHorizontal: 8 },
  targetCancelText: { ...typography.labelCaps, fontSize: 10, color: colors.mutedSage },
  targetDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  targetValue: { ...typography.bodyLg, fontWeight: '600', color: colors.leatherTan },
  targetUnit: { ...typography.bodyMd, color: colors.mutedSage },
  targetEditIcon: { marginLeft: 4 },
});