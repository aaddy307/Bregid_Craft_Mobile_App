import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import { resetUserPassword } from '../../services/users';
import { validateRequired } from '../../utils';

interface ResetPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string;
  onSuccess?: () => void;
}

export function ResetPasswordModal({ visible, onClose, userId, userName, onSuccess }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNewPassword('');
      setError(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    const passwordError = validateRequired(newPassword, 'Password');
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const success = await resetUserPassword(userId, newPassword);
      if (success) {
        if (Platform.OS === 'web') {
          window.alert(`Password for ${userName} has been successfully updated.`);
        } else {
          Alert.alert('Success', `Password for ${userName} has been successfully updated.`);
        }
        onSuccess?.();
        onClose();
      } else {
        setError('Failed to update password');
      }
    } catch (err) {
      setError('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.container}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.subtitle}>
              Type a new password for <Text style={styles.userNameText}>{userName}</Text>
            </Text>

            <Text style={styles.label}>NEW PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={colors.mutedSage}
              secureTextEntry
              autoFocus
            />

            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.error}>{error}</Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Updating...' : 'Update Password'}
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
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    marginBottom: 20,
  },
  userNameText: {
    fontWeight: '600',
    color: colors.onSurface,
  },
  label: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    marginBottom: 10,
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
