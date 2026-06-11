import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING } from '../../constants';
import { useAuthStore } from '../../store';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    onPress: () => void;
  };
}

export function AppHeader({ title, showBack = false, rightAction }: AppHeaderProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  
  // Synchronous and stable status bar height for consistent sizing across all tabs
  const statusBarHeight = Constants.statusBarHeight || 0;
  const hasStatusBar = statusBarHeight > 0 && Platform.OS !== 'web';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      const routes: Record<string, '/(owner)/dashboard' | '/(manager)/dashboard' | '/(worker)/home'> = {
        owner: '/(owner)/dashboard',
        manager: '/(manager)/dashboard',
        worker: '/(worker)/home',
      };
      if (user?.role && routes[user.role]) {
        router.replace(routes[user.role]);
      }
    }
  };

  return (
    <View style={[
      styles.container,
      {
        paddingTop: hasStatusBar ? statusBarHeight + 10 : 14,
        paddingBottom: hasStatusBar ? 10 : 14,
      }
    ]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centerSection}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      <View style={styles.rightSection}>
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.actionButton}>
            <MaterialCommunityIcons name={rightAction.icon} size={24} color={colors.onPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING.md,
    minHeight: 56,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  leftSection: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    width: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  actionButton: {
    padding: SPACING.sm,
    marginRight: -SPACING.sm,
  },
  title: {
    ...typography.titleMd,
    color: colors.onPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
});