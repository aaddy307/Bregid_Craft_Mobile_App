import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { login } from '../../services/auth';
import { useAuthStore } from '../../store';
import { FadeInView } from '../../components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await login({ email: email.trim(), password });
      setUser(result.user);
      setToken(result.token);

      switch (result.user.role) {
        case 'owner':
          router.replace('/(owner)/dashboard');
          break;
        case 'manager':
          router.replace('/(manager)/dashboard');
          break;
        case 'worker':
          router.replace('/(worker)/home');
          break;
        default:
          setError('Invalid role');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.backgroundPattern}>
        <View style={styles.cornerTL} />
        <View style={styles.cornerBR} />
      </View>

      <View style={styles.content}>
        <FadeInView delay={0} duration={500}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../public/Logo.webp')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.subtitle}>Manufacturing Execution System</Text>
        </FadeInView>

        <FadeInView delay={150} duration={500}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>OPERATOR EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.mutedSage}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ACCESS KEY</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.mutedSage}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.mutedSage}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </FadeInView>

        <FadeInView delay={300} duration={500}>
          <Text style={styles.footer}>Bregid Factory v1.0</Text>
        </FadeInView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundPattern: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surfaceContainerLow,
  },
  cornerTL: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 48,
    height: 48,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: colors.outlineVariant,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 60,
    right: 24,
    width: 48,
    height: 48,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.outlineVariant,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 240,
    height: 90,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  form: {
    backgroundColor: colors.factoryWhite,
    borderRadius: BORDER_RADIUS.card,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.bodyLg,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.errorContainer,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.card,
    marginBottom: 20,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    flex: 1,
  },
  loginButton: {
    backgroundColor: colors.leatherTan,
    borderRadius: BORDER_RADIUS.button,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    ...typography.bodyLg,
    fontWeight: '700',
    color: colors.onPrimary,
    letterSpacing: 1,
  },
  footer: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    textAlign: 'center',
    marginTop: 32,
    letterSpacing: 1,
  },
});