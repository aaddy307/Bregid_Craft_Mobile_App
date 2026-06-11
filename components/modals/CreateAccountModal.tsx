import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { createUser } from '../../services/users';
import { useAuthStore } from '../../store';
import { validateEmail, validatePhone, validateRequired } from '../../utils';

interface CreateAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateAccountModal({ visible, onClose, onSuccess }: CreateAccountModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'owner' | 'manager' | 'worker'>('worker');
  const [dailyTarget, setDailyTarget] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);

  const handleSubmit = async () => {
    const errors: string[] = [];

    const nameError = validateRequired(name, 'Name');
    if (nameError) errors.push(nameError);

    const emailError = validateEmail(email);
    if (emailError) errors.push(emailError);

    const phoneError = validatePhone(phone);
    if (phoneError) errors.push(phoneError);

    const passwordError = validateRequired(password, 'Password');
    if (passwordError) errors.push(passwordError);

    if (role === 'worker' && !dailyTarget) {
      errors.push('Daily target is required for workers');
    }

    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }

    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const result = await createUser(
        {
          name,
          email,
          phone,
          role,
          dailyTarget: role === 'worker' ? parseInt(dailyTarget) : 0,
          password,
        },
        user._id
      );

      if (result) {
        setName('');
        setEmail('');
        setPhone('');
        setRole('worker');
        setDailyTarget('');
        setPassword('');
        onSuccess?.();
        onClose();
      } else {
        setError('Failed to create account');
      }
    } catch {
      setError('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRole('worker');
    setDailyTarget('');
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.container}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
              placeholderTextColor={colors.mutedSage}
              autoCapitalize="words"
            />

            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => setEmail(text.toLowerCase())}
              placeholder="Enter email"
              placeholderTextColor={colors.mutedSage}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              placeholderTextColor={colors.mutedSage}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>ROLE</Text>
            <View style={styles.roleSelector}>
              {(['worker', 'manager'] as const).map((r) => {
                const isActive = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleOption, isActive && styles.roleOptionActive]}
                    onPress={() => setRole(r)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons 
                      name={r === 'worker' ? 'account-hard-hat' : 'account-tie'} 
                      size={20} 
                      color={isActive ? colors.onPrimary : colors.mutedSage} 
                    />
                    <Text style={[styles.roleOptionText, isActive && styles.roleOptionTextActive]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {role === 'worker' && (
              <>
                <Text style={styles.label}>DAILY TARGET (PAIRS)</Text>
                <TextInput
                  style={styles.input}
                  value={dailyTarget}
                  onChangeText={setDailyTarget}
                  placeholder="Enter daily target"
                  placeholderTextColor={colors.mutedSage}
                  keyboardType="number-pad"
                />
              </>
            )}

            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={colors.mutedSage}
              secureTextEntry
            />

            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.error}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creating...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: colors.factoryWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  title: {
    ...typography.titleMd,
    fontWeight: '600',
    color: colors.onSurface,
  },
  content: {
    padding: 20,
    maxHeight: 500,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  label: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    marginBottom: 10,
    marginTop: 16,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    ...typography.bodyLg,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOption: {
    flex: 1,
    padding: 14,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
  },
  roleOptionActive: {
    backgroundColor: colors.leatherTan,
    borderColor: colors.leatherTan,
  },
  roleOptionText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
  },
  roleOptionTextActive: {
    color: colors.onPrimary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  error: {
    ...typography.bodyMd,
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onSurface,
  },
  submitButton: {
    flex: 2,
    padding: 16,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: colors.leatherTan,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});