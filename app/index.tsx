import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store';

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Redirect based on user role if already authenticated
  switch (user.role) {
    case 'owner':
      return <Redirect href="/(owner)/dashboard" />;
    case 'manager':
      return <Redirect href="/(manager)/dashboard" />;
    case 'worker':
      return <Redirect href="/(worker)/home" />;
    default:
      return <Redirect href="/(auth)/login" />;
  }
}
