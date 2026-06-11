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
import { ProductionLog, updateProductionLog, deleteProductionLog } from '../../services/production';
import { useAuthStore } from '../../store';
import { formatEUSize } from '../../utils';

interface EditEntryModalProps {
  visible: boolean;
  onClose: () => void;
  log: ProductionLog | null;
  onSuccess?: () => void;
}

export function EditEntryModal({ visible, onClose, log, onSuccess }: EditEntryModalProps) {
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (log) {
      setQuantity(log.quantityPairs.toString());
    }
  }, [log]);

  const handleUpdate = async () => {
    if (!log || !user) return;

    const newQty = parseInt(quantity);
    if (isNaN(newQty) || newQty < 1) {
      setError('Quantity must be at least 1');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await updateProductionLog(log._id, newQty, user._id, user.name);
      if (success) {
        onSuccess?.();
        onClose();
      } else {
        setError('Failed to update entry');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update entry';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!log || !user) return;

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this production entry? This will restore the stock.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const success = await deleteProductionLog(log._id, user._id, user.name);
              if (success) {
                onSuccess?.();
                onClose();
              } else {
                setError('Failed to delete entry');
              }
            } catch {
              setError('Failed to delete entry');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!log) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.container}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Edit Entry</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.logInfo}>
              <Text style={styles.productName}>{log.productName}</Text>
              <Text style={styles.sku}>SKU: {log.sku}</Text>
              <View style={styles.details}>
                <View style={styles.detailChip}>
                  <Text style={styles.detailText}>{formatEUSize(log.euSize)}</Text>
                </View>
                <View style={styles.detailChip}>
                  <MaterialCommunityIcons name="texture-box" size={14} color={colors.mutedSage} />
                  <Text style={styles.detailText}>{(log.leatherDeductedSqf ?? 0).toFixed(2)} sqf</Text>
                </View>
              </View>
            </View>

            <Text style={styles.label}>QUANTITY (PAIRS)</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Enter quantity"
              placeholderTextColor={colors.mutedSage}
              keyboardType="number-pad"
              textAlign="center"
            />

            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.error}>{error}</Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={loading} activeOpacity={0.7}>
              <MaterialCommunityIcons name="delete-outline" size={20} color={colors.error} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.updateButton, loading && styles.updateButtonDisabled]}
              onPress={handleUpdate}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.updateButtonText}>
                {loading ? 'Updating...' : 'Update'}
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
  logInfo: {
    backgroundColor: colors.surfaceContainer,
    padding: 16,
    borderRadius: BORDER_RADIUS.card,
    marginBottom: 20,
  },
  productName: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onSurface,
  },
  sku: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    marginTop: 4,
  },
  details: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.factoryWhite,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  detailText: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
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
    ...typography.headlineMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
    fontWeight: '600',
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: colors.error,
    gap: 8,
  },
  deleteButtonText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.error,
  },
  updateButton: {
    flex: 1,
    padding: 16,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: colors.leatherTan,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});