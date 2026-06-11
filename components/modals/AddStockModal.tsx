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
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS, LEATHER_TYPES, BUCKLE_TYPES, FOOTBED_TYPES } from '../../constants';
import { addStock } from '../../services';
import { getMaterialCategories, MaterialCategory } from '../../services/stock';
import { useAuthStore } from '../../store';
import { validatePositiveNumber } from '../../utils';
import { getAvailableSizesForGender } from '../../utils/stockCalculator';
import { Dropdown } from '../ui/Dropdown';

interface AddStockModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMaterial?: 'leather' | 'buckle' | 'footbed';
}

const MEN_SIZES = [40, 41, 42, 43, 44];
const WOMEN_SIZES = [36, 37, 38, 39, 40, 41];

export function AddStockModal({ visible, onClose, onSuccess, initialMaterial }: AddStockModalProps) {
  const [material, setMaterial] = useState<'leather' | 'buckle' | 'footbed'>('leather');
  const [quantity, setQuantity] = useState('');

  // Sync initialMaterial when modal opens
  React.useEffect(() => {
    if (visible && initialMaterial) {
      setMaterial(initialMaterial);
    }
  }, [visible, initialMaterial]);
  
  // Material type fields
  const [leatherType, setLeatherType] = useState('');
  const [buckleType, setBuckleType] = useState('');
  const [buckleSize, setBuckleSize] = useState('');
  
  // Footbed specific fields
  const [footbedType, setFootbedType] = useState('');
  const [footbedGender, setFootbedGender] = useState<'Men' | 'Women'>('Men');
  const [footbedEuSizes, setFootbedEuSizes] = useState<number[]>([]);
  
  // Supplier details
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [supplierContact, setSupplierContact] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dynamic categories loaded from DB
  const [leatherOptions, setLeatherOptions] = useState<string[]>([]);
  const [buckleOptions, setBuckleOptions] = useState<string[]>([]);
  const [rawFootbedCategories, setRawFootbedCategories] = useState<MaterialCategory[]>([]);

  const user = useAuthStore((state) => state.user);

  // Load categories from DB whenever modal opens
  React.useEffect(() => {
    if (!visible) return;
    (async () => {
      const [leather, buckle, footbed] = await Promise.all([
        getMaterialCategories('leather'),
        getMaterialCategories('buckle'),
        getMaterialCategories('footbed'),
      ]);
      setLeatherOptions(leather.map((c) => c.name));
      setBuckleOptions(buckle.map((c) => c.color ? `${c.name} (${c.color})` : c.name));
      setRawFootbedCategories(footbed);
    })();
  }, [visible]);

  const footbedOptions = React.useMemo(() => {
    const filtered = rawFootbedCategories.filter(
      (c) => c.gender === footbedGender && (footbedEuSizes.length === 0 || footbedEuSizes.includes(c.size || 0))
    );
    if (filtered.length > 0) {
      return Array.from(new Set(filtered.map((c) => c.name)));
    }
    return Array.from(new Set(rawFootbedCategories.map((c) => c.name)));
  }, [rawFootbedCategories, footbedGender, footbedEuSizes]);

  const formatDisplayDate = (date: Date): string => {

    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    const qtyError = validatePositiveNumber(quantity);
    if (qtyError) {
      newErrors.quantity = qtyError;
    }

    // Material-specific type validation
    if (material === 'leather' && !leatherType.trim()) {
      newErrors.leatherType = 'Leather type is required';
    }
    if (material === 'buckle') {
      if (!buckleType.trim()) {
        newErrors.buckleType = 'Buckle type is required';
      }
      if (!buckleSize) {
        newErrors.buckleSize = 'Buckle size is required';
      }
    }
    if (material === 'footbed') {
      if (!footbedType.trim()) {
        newErrors.footbedType = 'Footbed type is required';
      }
      if (!footbedGender) {
        newErrors.footbedGender = 'Please select gender';
      }
      if (footbedEuSizes.length === 0) {
        newErrors.footbedEuSize = 'Please select at least one size';
      }
    }

    // Supplier details
    if (!supplierName.trim()) {
      newErrors.supplierName = 'Supplier name is required';
    }
    if (!invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Invoice number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user) return;

    setLoading(true);
    setErrors({});

    try {
      if (material === 'footbed') {
        let anyFailed = false;
        const materialType = footbedType.trim();
        for (const size of footbedEuSizes) {
          const success = await addStock(
            parseFloat(quantity),
            user._id,
            user.name,
            {
              material,
              materialType,
              footbedGender,
              footbedEuSize: size,
            },
            {
              supplierName: supplierName.trim(),
              invoiceNumber: invoiceNumber.trim().toUpperCase(),
              invoiceDate: invoiceDate.toISOString(),
              supplierContact: supplierContact.trim() || undefined,
            },
            'manual_add'
          );
          if (!success) anyFailed = true;
        }
        if (!anyFailed) {
          resetForm();
          onSuccess?.();
          onClose();
        } else {
          setErrors({ quantity: 'Failed to add stock for some sizes' });
        }
      } else {
        let materialType = '';
        if (material === 'leather') {
          materialType = leatherType.trim();
        } else if (material === 'buckle') {
          materialType = `${buckleType.trim()} - ${buckleSize}mm`;
        }

        const success = await addStock(
          parseFloat(quantity),
          user._id,
          user.name,
          {
            material,
            materialType,
          },
          {
            supplierName: supplierName.trim(),
            invoiceNumber: invoiceNumber.trim().toUpperCase(),
            invoiceDate: invoiceDate.toISOString(),
            supplierContact: supplierContact.trim() || undefined,
          },
          'manual_add'
        );
        if (success) {
          resetForm();
          onSuccess?.();
          onClose();
        } else {
          setErrors({ quantity: 'Failed to add stock' });
        }
      }
    } catch {
      setErrors({ quantity: 'Failed to add stock' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuantity('');
    setLeatherType('');
    setBuckleType('');
    setBuckleSize('');
    setFootbedType('');
    setFootbedGender('Men');
    setFootbedEuSizes([]);
    setSupplierName('');
    setInvoiceNumber('');
    setInvoiceDate(new Date());
    setSupplierContact('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const onDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setInvoiceDate(selectedDate);
      setErrors((prev) => {
        const { invoiceDate, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleMaterialChange = (newMaterial: 'leather' | 'buckle' | 'footbed') => {
    setMaterial(newMaterial);
    setErrors({});
  };

  const handleGenderChange = (newGender: 'Men' | 'Women') => {
    setFootbedGender(newGender);
    // Reset size when gender changes
    const sizes = newGender === 'Men' ? MEN_SIZES : WOMEN_SIZES;
    setFootbedEuSizes([]);
    setErrors((prev) => {
        const { footbedGender, ...rest } = prev;
        return rest;
      });
  };

  const availableSizes = footbedGender === 'Men' ? MEN_SIZES : WOMEN_SIZES;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.container}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Add Stock</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!initialMaterial && (
              <>
                <Text style={[styles.label, styles.labelFirst]}>MATERIAL TYPE</Text>
                <View style={styles.materialSelector}>
                  {(['leather', 'buckle', 'footbed'] as const).map((m) => {
                    const isActive = material === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.materialOption, isActive && styles.materialOptionActive]}
                        onPress={() => handleMaterialChange(m)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons 
                          name={m === 'leather' ? 'texture-box' : m === 'buckle' ? 'circle-outline' : 'layers-triple'} 
                          size={20} 
                          color={isActive ? colors.onPrimary : colors.mutedSage} 
                        />
                        <Text style={[styles.materialOptionText, isActive && styles.materialOptionTextActive]}>
                          {m.charAt(0).toUpperCase() + m.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Material Type Field - Leather */}
            {material === 'leather' && (
              <>
                <Text style={styles.label}>LEATHER TYPE *</Text>
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
                    onChange={(value) => {
                      setLeatherType(value);
                      setErrors((prev) => {
                        const { leatherType, ...rest } = prev;
                        return rest;
                      });
                    }}
                    error={errors.leatherType}
                  />
                )}
              </>
            )}

            {/* Material Type Field - Buckle */}
            {material === 'buckle' && (
              <>
                <Text style={styles.label}>BUCKLE TYPE *</Text>
                {buckleOptions.length === 0 ? (
                  <View style={styles.noTypeContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
                    <Text style={styles.noTypeText}>No buckle type available</Text>
                  </View>
                ) : (
                  <>
                    <Dropdown
                      label="Select Buckle Type"
                      placeholder="Select buckle type..."
                      options={buckleOptions.map(type => ({ label: type, value: type }))}
                      value={buckleType}
                      onChange={(value) => {
                        setBuckleType(value);
                        setErrors((prev) => {
                          const { buckleType, ...rest } = prev;
                          return rest;
                        });
                      }}
                      error={errors.buckleType}
                    />

                    <Text style={[styles.label, styles.labelMargin]}>BUCKLE SIZE *</Text>
                    <Dropdown
                      label="Select Buckle Size"
                      placeholder="Select size..."
                      options={[
                        { label: '15 mm', value: '15' },
                        { label: '20 mm', value: '20' },
                        { label: '25 mm', value: '25' },
                        { label: '30 mm', value: '30' },
                        { label: '35 mm', value: '35' },
                        { label: '40 mm', value: '40' },
                      ]}
                      value={buckleSize}
                      onChange={(value) => {
                        setBuckleSize(value);
                        setErrors((prev) => {
                          const { buckleSize, ...rest } = prev;
                          return rest;
                        });
                      }}
                      error={errors.buckleSize}
                    />
                  </>
                )}
              </>
            )}

            {/* Footbed Fields */}
            {material === 'footbed' && (
              <>
                <Text style={styles.label}>FOOTBED TYPE *</Text>
                {footbedOptions.length === 0 ? (
                  <View style={styles.noTypeContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
                    <Text style={styles.noTypeText}>No footbed type available</Text>
                  </View>
                ) : (
                  <Dropdown
                    label="Select Footbed Type"
                    placeholder="Select footbed type..."
                    options={footbedOptions.map(type => ({ label: type, value: type }))}
                    value={footbedType}
                    onChange={(value) => {
                      setFootbedType(value);
                      setErrors((prev) => {
                        const { footbedType, ...rest } = prev;
                        return rest;
                      });
                    }}
                    error={errors.footbedType}
                  />
                )}

                <Text style={[styles.label, styles.labelMargin]}>GENDER *</Text>
                <View style={styles.genderSelector}>
                  {(['Men', 'Women'] as const).map((g) => {
                    const isActive = footbedGender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genderOption, isActive && styles.genderOptionActive]}
                        onPress={() => handleGenderChange(g)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.genderOptionText, isActive && styles.genderOptionTextActive]}>
                          {g.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.footbedGender && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={14} color={colors.error} />
                    <Text style={styles.errorText}>{errors.footbedGender}</Text>
                  </View>
                )}

                <View style={styles.sizesHeader}>
                  <Text style={[styles.label, styles.labelMargin, { marginBottom: 0 }]}>EU SIZES *</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (footbedEuSizes.length === availableSizes.length) {
                        setFootbedEuSizes([]);
                      } else {
                        setFootbedEuSizes([...availableSizes]);
                      }
                      setErrors((prev) => {
                        const { footbedEuSize, ...rest } = prev;
                        return rest;
                      });
                    }}
                    style={styles.selectAllBtn}
                  >
                    <Text style={styles.selectAllBtnText}>
                      {footbedEuSizes.length === availableSizes.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.sizeSelector}>
                  {availableSizes.map((size) => {
                    const isActive = footbedEuSizes.includes(size);
                    return (
                      <TouchableOpacity
                        key={size}
                        style={[styles.sizeOption, isActive && styles.sizeOptionActive]}
                        onPress={() => {
                          if (isActive) {
                            setFootbedEuSizes(footbedEuSizes.filter((s) => s !== size));
                          } else {
                            setFootbedEuSizes([...footbedEuSizes, size]);
                          }
                          setErrors((prev) => {
                            const { footbedEuSize, ...rest } = prev;
                            return rest;
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.sizeOptionText, isActive && styles.sizeOptionTextActive]}>
                          {size}
                        </Text>
                        {isActive && (
                          <MaterialCommunityIcons name="check" size={10} color={colors.onPrimary} style={styles.sizeCheck} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.footbedEuSize && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={14} color={colors.error} />
                    <Text style={styles.errorText}>{errors.footbedEuSize}</Text>
                  </View>
                )}

                <Text style={[styles.helperText, styles.labelMargin]}>
                  Stock will be added for {footbedGender} sizes: {footbedEuSizes.length > 0 ? footbedEuSizes.sort().join(', ') : 'None'}
                </Text>
              </>
            )}

            {/* Quantity - Common for all materials */}
            <Text style={[styles.label, styles.labelMargin]}>QUANTITY *</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={(text) => {
                setQuantity(text);
                setErrors((prev) => {
                      const { quantity, ...rest } = prev;
                      return rest;
                    });
              }}
              placeholder={material === 'leather' ? 'Enter sqf' : 'Enter pieces'}
              placeholderTextColor={colors.mutedSage}
              keyboardType="decimal-pad"
            />
            {errors.quantity && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{errors.quantity}</Text>
              </View>
            )}
            <Text style={styles.unitHint}>
              {material === 'leather' ? 'Square feet (sqf)' : 'Pieces'}
            </Text>

            <View style={styles.supplierDivider}>
              <View style={styles.supplierDividerLine} />
              <Text style={styles.supplierDividerText}>SUPPLIER DETAILS</Text>
              <View style={styles.supplierDividerLine} />
            </View>

            <Text style={styles.label}>SUPPLIER NAME *</Text>
            <TextInput
              style={styles.input}
              value={supplierName}
              onChangeText={(text) => {
                setSupplierName(text);
                setErrors((prev) => {
                      const { supplierName, ...rest } = prev;
                      return rest;
                    });
              }}
              placeholder="e.g. Raj Leather Suppliers"
              placeholderTextColor={colors.mutedSage}
            />
            {errors.supplierName && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{errors.supplierName}</Text>
              </View>
            )}

            <Text style={styles.label}>INVOICE NUMBER *</Text>
            <TextInput
              style={[styles.input, styles.uppercaseInput]}
              value={invoiceNumber}
              onChangeText={(text) => {
                setInvoiceNumber(text.toUpperCase());
                setErrors((prev) => {
                      const { invoiceNumber, ...rest } = prev;
                      return rest;
                    });
              }}
              placeholder="e.g. INV-2024-00892"
              placeholderTextColor={colors.mutedSage}
              autoCapitalize="characters"
            />
            {errors.invoiceNumber && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{errors.invoiceNumber}</Text>
              </View>
            )}

            <Text style={styles.label}>INVOICE DATE *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="calendar" size={20} color={colors.mutedSage} />
              <Text style={styles.dateInputText}>{formatDisplayDate(invoiceDate)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={invoiceDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={onDateChange}
              />
            )}
            {errors.invoiceDate && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{errors.invoiceDate}</Text>
              </View>
            )}

            <Text style={styles.label}>SUPPLIER CONTACT</Text>
            <TextInput
              style={styles.input}
              value={supplierContact}
              onChangeText={setSupplierContact}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={colors.mutedSage}
              keyboardType="phone-pad"
            />
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
                {loading ? 'Adding...' : 'Add Stock'}
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
  label: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: 1,
  },
  labelFirst: {
    marginTop: 0,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  labelMargin: {
    marginTop: 20,
  },
  materialSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  materialOption: {
    flex: 1,
    padding: 14,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
  },
  materialOptionActive: {
    backgroundColor: colors.leatherTan,
    borderColor: colors.leatherTan,
  },
  materialOptionText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
  },
  materialOptionTextActive: {
    color: colors.onPrimary,
  },
  genderSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  genderOption: {
    flex: 1,
    padding: 12,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  genderOptionActive: {
    backgroundColor: colors.leatherTan,
    borderColor: colors.leatherTan,
  },
  genderOptionText: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.onSurface,
  },
  genderOptionTextActive: {
    color: colors.onPrimary,
  },
  sizeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  sizeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    minWidth: 50,
    alignItems: 'center',
  },
  sizeOptionActive: {
    backgroundColor: colors.leatherTan,
    borderColor: colors.leatherTan,
  },
  sizeOptionText: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.onSurface,
  },
  sizeOptionTextActive: {
    color: colors.onPrimary,
  },
  helperText: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    fontSize: 12,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    padding: 14,
    minHeight: 48,
    ...typography.bodyLg,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  uppercaseInput: {
    textTransform: 'uppercase',
  },
  dateInput: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    padding: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  dateInputText: {
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  unitHint: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    marginTop: 8,
    fontSize: 12,
  },
  supplierDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 8,
    gap: 12,
  },
  supplierDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  supplierDividerText: {
    ...typography.labelCaps,
    color: colors.mutedSage,
    fontSize: 10,
    letterSpacing: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    ...typography.bodyMd,
    fontSize: 12,
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
  sizesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  selectAllBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  selectAllBtnText: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.leatherTan,
    fontWeight: '600',
  },
  sizeCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
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