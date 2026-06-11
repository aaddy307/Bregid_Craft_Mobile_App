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
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS, EU_SIZES, LEATHER_TYPES, BUCKLE_TYPES, FOOTBED_TYPES } from '../../constants';
import { createProduct, updateProduct } from '../../services/products';
import { getMaterialCategories, MaterialCategory } from '../../services/stock';
import { Product, FootbedSpec } from '../../store';
import { formatEUSize, validateRequired } from '../../utils';
import { Dropdown } from '../ui/Dropdown';

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  product?: Product | null;
  onSuccess?: () => void;
}

export function AddProductModal({ visible, onClose, product, onSuccess }: AddProductModalProps) {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [gender, setGender] = useState<'Men' | 'Women'>(product?.gender || 'Men');
  const [selectedSizes, setSelectedSizes] = useState<number[]>(product?.sizes || []);
  const [leatherSqfPerPair, setLeatherSqfPerPair] = useState(
    product?.leatherSqfPerPair?.toString() || ''
  );
  const [leatherType, setLeatherType] = useState(product?.leatherType || '');
  const [bucklePerPair, setBucklePerPair] = useState(
    product?.bucklePerPair?.toString() || ''
  );
  const [buckleType, setBuckleType] = useState('');
  const [buckleSize, setBuckleSize] = useState('');
  const [footbedType, setFootbedType] = useState(product?.footbedType || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic categories loaded from DB (no fallback to constants)
  const [leatherOptions, setLeatherOptions] = useState<string[]>([]);
  const [buckleOptions, setBuckleOptions] = useState<string[]>([]);
  const [rawFootbedCategories, setRawFootbedCategories] = useState<MaterialCategory[]>([]);

  const isEditing = !!product;

  // Re-sync form fields when product prop changes (e.g., opening for edit)
  useEffect(() => {
    setName(product?.name || '');
    setSku(product?.sku || '');
    setGender(product?.gender || 'Men');
    setSelectedSizes(product?.sizes || []);
    setLeatherSqfPerPair(product?.leatherSqfPerPair?.toString() || '');
    setLeatherType(product?.leatherType || '');
    setBucklePerPair(product?.bucklePerPair?.toString() || '');
    
    if (product?.buckleType) {
      const idx = product.buckleType.lastIndexOf(' - ');
      if (idx >= 0) {
        setBuckleType(product.buckleType.slice(0, idx));
        setBuckleSize(product.buckleType.slice(idx + 3).replace('mm', ''));
      } else {
        setBuckleType(product.buckleType);
        setBuckleSize('');
      }
    } else {
      setBuckleType('');
      setBuckleSize('');
    }

    setFootbedType(product?.footbedType || '');
    setError(null);
  }, [product]);

  // Load categories from DB whenever modal opens
  useEffect(() => {
    if (!visible) return;
    (async () => {
      const [leather, buckle, footbed] = await Promise.all([
        getMaterialCategories('leather'),
        getMaterialCategories('buckle'),
        getMaterialCategories('footbed'),
      ]);
      setLeatherOptions(leather.map((c) => c.name));
      setBuckleOptions(buckle.map((c) => (c.color ? `${c.name} (${c.color})` : c.name)));
      setRawFootbedCategories(footbed);
    })();
  }, [visible]);

  const globalFootbedOptions = React.useMemo(() => {
    return Array.from(new Set(rawFootbedCategories.map((c) => c.name)));
  }, [rawFootbedCategories]);

  const toggleSize = (size: number) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleSubmit = async () => {
    const errors: string[] = [];

    const nameError = validateRequired(name, 'Product name');
    if (nameError) errors.push(nameError);

    const skuError = validateRequired(sku, 'SKU');
    if (skuError) errors.push(skuError);

    if (selectedSizes.length === 0) {
      errors.push('Select at least one size');
    }

    if (!footbedType.trim()) {
      errors.push('Footbed type is required');
    }

    const leatherSqf = parseFloat(leatherSqfPerPair) || 0;
    if (leatherSqf > 0) {
      if (!leatherType.trim()) {
        errors.push('Leather type is required');
      }
    }

    const bucklesCount = parseInt(bucklePerPair) || 0;
    if (bucklesCount > 0) {
      if (!buckleType.trim()) {
        errors.push('Buckle type is required');
      }
      if (!buckleSize.trim()) {
        errors.push('Buckle size is required');
      }
    }

    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedBuckleType = bucklesCount > 0 && buckleType.trim() && buckleSize.trim()
        ? `${buckleType.trim()} - ${buckleSize.trim()}mm`
        : '';

      const data = {
        name,
        sku: sku.toUpperCase(),
        gender,
        sizes: selectedSizes.sort((a, b) => a - b),
        leatherSqfPerPair: parseFloat(leatherSqfPerPair) || 0,
        leatherType: leatherType.trim() || 'Nubuck',
        bucklePerPair: bucklesCount,
        buckleType: formattedBuckleType,
        footbedPerPair: 2,
        footbedType: footbedType.trim(),
        footbedspecs: [],
        isActive: true,
      };

      let success: boolean;
      if (isEditing && product) {
        success = await updateProduct(product._id, data);
      } else {
        const result = await createProduct(data);
        success = !!result;
      }

      if (success) {
        onSuccess?.();
        onClose();
      } else {
        setError('Failed to save product');
      }
    } catch {
      setError('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSku('');
    setSelectedSizes([]);
    setLeatherSqfPerPair('');
    setLeatherType('');
    setBucklePerPair('');
    setBuckleType('');
    setBuckleSize('');
    setFootbedType('');
    setError(null);
    onClose();
  };

  const handleGenderChange = (newGender: 'Men' | 'Women') => {
    setGender(newGender);
    setSelectedSizes([]);
  };

  const availableSizes = gender === 'Men'
    ? EU_SIZES.filter((s) => s >= 40)
    : EU_SIZES.filter((s) => s <= 41);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.container}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Edit Product' : 'Add Product'}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>PRODUCT NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter product name"
              placeholderTextColor={colors.mutedSage}
              autoCapitalize="words"
            />

            <Text style={styles.label}>SKU</Text>
            <TextInput
              style={styles.input}
              value={sku}
              onChangeText={(text) => setSku(text.toUpperCase())}
              placeholder="Enter SKU"
              placeholderTextColor={colors.mutedSage}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>GENDER</Text>
            <View style={styles.genderSelector}>
              {(['Men', 'Women'] as const).map((g) => {
                const isActive = gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderOption, isActive && styles.genderOptionActive]}
                    onPress={() => handleGenderChange(g)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons 
                      name={g === 'Men' ? 'human-male' : 'human-female'} 
                      size={20} 
                      color={isActive ? colors.onPrimary : colors.mutedSage} 
                    />
                    <Text style={[styles.genderOptionText, isActive && styles.genderOptionTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>AVAILABLE SIZES</Text>
            <View style={styles.sizesGrid}>
              {availableSizes.map((size) => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <TouchableOpacity
                    key={size}
                    style={[styles.sizeOption, isSelected && styles.sizeOptionActive]}
                    onPress={() => toggleSize(size)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sizeOptionText, isSelected && styles.sizeOptionTextActive]}>
                      {formatEUSize(size)}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={12} color={colors.onPrimary} style={styles.sizeCheck} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedSizes.length === 0 && (
              <Text style={styles.sizeHint}>Select at least one size</Text>
            )}

            <Text style={styles.sectionTitle}>MATERIALS PER PAIR</Text>
            
            <View style={styles.materialSection}>
              <View style={styles.materialRow}>
                <View style={styles.materialInputLarge}>
                  <View style={styles.materialHeader}>
                    <MaterialCommunityIcons name="texture-box" size={14} color={colors.mutedSage} />
                    <Text style={styles.materialLabel}>Leather (sqf)</Text>
                  </View>
                  <TextInput
                    style={styles.inputSmall}
                    value={leatherSqfPerPair}
                    onChangeText={setLeatherSqfPerPair}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedSage}
                    keyboardType="decimal-pad"
                    textAlign="center"
                  />
                </View>
              </View>
              <Text style={styles.label}>LEATHER TYPE</Text>
              {leatherOptions.length === 0 ? (
                <View style={styles.noTypeContainer}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={styles.noTypeText}>No leather type available</Text>
                </View>
              ) : (
                <Dropdown
                  label="Select Leather Type"
                  placeholder="Select leather type..."
                  options={leatherOptions.map(type => ({ label: type, value: type }))}
                  value={leatherType}
                  onChange={setLeatherType}
                />
              )}
            </View>
 
            <View style={styles.materialSection}>
              <View style={styles.materialRow}>
                <View style={styles.materialInputLarge}>
                  <View style={styles.materialHeader}>
                    <MaterialCommunityIcons name="circle-outline" size={14} color={colors.mutedSage} />
                    <Text style={styles.materialLabel}>Buckle Quantity</Text>
                  </View>
                  <TextInput
                    style={styles.inputSmall}
                    value={bucklePerPair}
                    onChangeText={setBucklePerPair}
                    placeholder="0"
                    placeholderTextColor={colors.mutedSage}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                </View>
              </View>
              <Text style={styles.label}>BUCKLE TYPE</Text>
              {buckleOptions.length === 0 ? (
                <View style={styles.noTypeContainer}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={styles.noTypeText}>No buckle type available</Text>
                </View>
              ) : (
                <Dropdown
                  label="Select Buckle Type"
                  placeholder="Select buckle type..."
                  options={buckleOptions.map(type => ({ label: type, value: type }))}
                  value={buckleType}
                  onChange={setBuckleType}
                />
              )}
              <Text style={styles.label}>BUCKLE SIZE</Text>
              <Dropdown
                label="Select Buckle Size"
                placeholder="Select buckle size..."
                options={[
                  { label: '15 mm', value: '15' },
                  { label: '20 mm', value: '20' },
                  { label: '25 mm', value: '25' },
                  { label: '30 mm', value: '30' },
                  { label: '35 mm', value: '35' },
                  { label: '40 mm', value: '40' },
                ]}
                value={buckleSize}
                onChange={setBuckleSize}
              />
            </View>
 
            <View style={styles.materialSection}>
              <Text style={styles.label}>FOOTBED TYPE *</Text>
              {globalFootbedOptions.length === 0 ? (
                <View style={styles.noTypeContainer}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={styles.noTypeText}>No footbed type available</Text>
                </View>
              ) : (
                <Dropdown
                  label="Select Footbed Type"
                  placeholder="Select footbed type..."
                  options={globalFootbedOptions.map(type => ({ label: type, value: type }))}
                  value={footbedType}
                  onChange={setFootbedType}
                />
              )}
            </View>


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
                {loading ? 'Saving...' : isEditing ? 'Update' : 'Add Product'}
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
    height: '85%',
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
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  label: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: 1,
  },
  sectionTitle: {
    ...typography.labelCaps,
    color: colors.onSurface,
    marginBottom: 12,
    marginTop: 20,
    letterSpacing: 1,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    padding: 14,
    ...typography.bodyLg,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  genderSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    padding: 14,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
  },
  genderOptionActive: {
    backgroundColor: colors.leatherTan,
    borderColor: colors.leatherTan,
  },
  genderOptionText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
  },
  genderOptionTextActive: {
    color: colors.onPrimary,
  },
  sizesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sizeOption: {
    minWidth: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sizeOptionActive: {
    backgroundColor: colors.leatherTan,
    borderColor: colors.leatherTan,
  },
  sizeOptionText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  sizeOptionTextActive: {
    color: colors.onPrimary,
  },
  sizeCheck: {
    marginLeft: 2,
  },
  sizeHint: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  materialSection: {
    marginTop: 8,
  },
  materialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  materialInputLarge: {
    flex: 1,
  },
  materialInput: {
    flex: 1,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  materialLabel: {
    ...typography.bodyMd,
    fontSize: 11,
    color: colors.mutedSage,
  },
  inputSmall: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    padding: 12,
    ...typography.bodyLg,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
    fontWeight: '600',
  },
  footbedSpecRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  footbedSizeTag: {
    backgroundColor: colors.leatherTan,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.card,
    minWidth: 50,
    alignItems: 'center',
  },
  footbedSizeText: {
    ...typography.bodyMd,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  footbedInputs: {
    flex: 1,
    gap: 8,
  },
  footbedTypeInput: {
    minHeight: 44,
  },
  footbedQtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyLabel: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    fontWeight: '600',
  },
  footbedQtyInput: {
    width: 60,
    minHeight: 40,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
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
  noTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: BORDER_RADIUS.card,
    padding: 12,
    marginTop: 4,
  },
  noTypeText: {
    ...typography.bodyMd,
    color: colors.error,
    fontWeight: '500',
  },
});