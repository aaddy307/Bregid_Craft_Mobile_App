import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store';
import { restoreSession } from '../services/auth';
import { seedProducts } from '../services/products';
import { initializeStock } from '../services/stock';
import { colors } from '../constants';

function AuthGuard() {
  const { isAuthenticated, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const activeGroup = segments[0];

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } else if (user) {
      const routes: Record<string, '/(owner)/dashboard' | '/(manager)/dashboard' | '/(worker)/home'> = {
        owner: '/(owner)/dashboard',
        manager: '/(manager)/dashboard',
        worker: '/(worker)/home',
      };

      if (inAuthGroup) {
        const target = routes[user.role] || '/login';
        router.replace(target);
      } else {
        // Role-based route guard
        const roleGroups: Record<string, string> = {
          owner: '(owner)',
          manager: '(manager)',
          worker: '(worker)',
        };
        const expectedGroup = roleGroups[user.role];
        const isLayoutGroup = ['(owner)', '(manager)', '(worker)'].includes(activeGroup);
        if (isLayoutGroup && activeGroup !== expectedGroup) {
          const target = routes[user.role] || '/login';
          router.replace(target);
        }
      }
    }
  }, [isAuthenticated, user, segments]);

  return null;
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { setLoading, setUser } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const sessionUser = await restoreSession();
        if (mounted && sessionUser) {
          setUser(sessionUser as any);
        }
        await seedProducts();
        await initializeStock();
      } catch {
        // Silently handle initialization errors
      } finally {
        if (mounted) {
          setLoading(false);
          setIsReady(true);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.leatherTan} />
      </View>
    );
  }

  return (
    <>
      <AuthGuard />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});