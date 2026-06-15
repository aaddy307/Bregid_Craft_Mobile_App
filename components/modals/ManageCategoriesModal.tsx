import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, SPACING, BORDER_RADIUS } from '../../constants';
import {
  getMaterialCategories,
  addMaterialCategory,
  updateMaterialCategory,
  deleteMaterialCategory,
  MaterialCategory,
} from '../../services/stock';
import { Dropdown } from '../ui/Dropdown';

const MEN_SIZES = [40, 41, 42, 43, 44, 45];
const WOMEN_SIZES = [36, 37, 38, 39, 40, 41];

type MaterialType = 'leather' | 'buckle' | 'footbed';

const TAB_LABELS: { key: MaterialType; label: string; icon: string }[] = [
  { key: 'leather', label: 'Leather', icon: 'texture-box' },
  { key: 'buckle', label: 'Buckle', icon: 'ring' },
  { key: 'footbed', label: 'Footbed', icon: 'layers-triple' },
];

interface ManageCategoriesModalProps {
  visible: boolean;
  onClose: () => void;
  initialMaterial?: 'leather' | 'buckle' | 'footbed';
}

export function ManageCategoriesModal({ visible, onClose, initialMaterial }: ManageCategoriesModalProps) {
  const [activeTab, setActiveTab] = useState<MaterialType>('leather');

  // Sync activeTab when modal opens
  useEffect(() => {
    if (visible && initialMaterial) {
      setActiveTab(initialMaterial);
    }
  }, [visible, initialMaterial]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [selectedGender, setSelectedGender] = useState<'Men' | 'Women'>('Men');
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const data = await getMaterialCategories(activeTab);
    setCategories(data);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    if (visible) loadCategories();
  }, [visible, loadCategories]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { setError('Name cannot be empty'); return; }
    if (activeTab === 'footbed' && selectedSizes.length === 0) {
      setError('Please select at least one size');
      return;
    }
    setAdding(true);
    setError(null);

    if (activeTab === 'footbed') {
      let anyFailed = false;
      for (const size of selectedSizes) {
        const success = await addMaterialCategory(
          activeTab,
          trimmed,
          size,
          selectedGender
        );
        if (!success) {
          anyFailed = true;
        }
      }
      if (!anyFailed) {
        setNewName('');
        setSelectedSizes([]);
        await loadCategories();
      } else {
        setError('Some or all categories already exist / failed to save.');
        await loadCategories();
      }
    } else {
      const success = await addMaterialCategory(
        activeTab,
        trimmed,
        undefined,
        undefined,
        activeTab === 'buckle' ? newColor.trim() : undefined
      );
      if (success) {
        setNewName('');
        setNewColor('');
        await loadCategories();
      } else {
        setError('Category already exists or failed to save.');
      }
    }
    setAdding(false);
  };

  const [editColor, setEditColor] = useState('');

  const handleEdit = (cat: MaterialCategory) => {
    setEditingId(cat._id);
    setEditName(cat.name);
    setEditColor(cat.color || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    const success = await updateMaterialCategory(
      editingId,
      trimmed,
      activeTab === 'buckle' ? editColor.trim() : undefined
    );
    if (success) {
      setEditingId(null);
      setEditName('');
      setEditColor('');
      await loadCategories();
    } else {
      Alert.alert('Error', 'Failed to update category.');
    }
  };

  const handleDelete = (cat: MaterialCategory) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMaterialCategory(cat._id);
            if (success) {
              await loadCategories();
            } else {
              Alert.alert('Error', 'Failed to delete category.');
            }
          },
        },
      ]
    );
  };

  const handleTabChange = (tab: MaterialType) => {
    setActiveTab(tab);
    setEditingId(null);
    setNewName('');
    setNewColor('');
    setError(null);
  };

  const renderItem = ({ item }: { item: MaterialCategory }) => {
    const isEditing = editingId === item._id;
    return (
      <View style={styles.categoryRow}>
        {isEditing ? (
          item.type === 'buckle' ? (
            <View style={styles.buckleEditInputs}>
              <TextInput
                style={styles.editInputSmall}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                onSubmitEditing={handleSaveEdit}
              />
              <TextInput
                style={styles.editInputSmall}
                value={editColor}
                onChangeText={setEditColor}
                placeholder="Color"
                onSubmitEditing={handleSaveEdit}
              />
            </View>
          ) : (
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              onSubmitEditing={handleSaveEdit}
            />
          )
        ) : (
          <Text style={styles.categoryName}>
            {item.name}
            {item.type === 'footbed' && item.size && item.gender ? ` (EU ${item.size} - ${item.gender})` : ''}
            {item.type === 'buckle' && item.color ? ` (${item.color})` : ''}
          </Text>
        )}
        <View style={styles.rowActions}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={handleSaveEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="check" size={20} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setEditingId(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={20} color={colors.mutedSage} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.leatherTan} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.container}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>MATERIAL CATEGORIES</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          {!initialMaterial && (
            <View style={styles.tabs}>
              {TAB_LABELS.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tab, activeTab === t.key && styles.tabActive]}
                  onPress={() => handleTabChange(t.key)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={t.icon as any}
                    size={16}
                    color={activeTab === t.key ? colors.leatherTan : colors.mutedSage}
                  />
                  <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Add New */}
          {activeTab === 'footbed' ? (
            <View style={styles.footbedAddContainer}>
              <TextInput
                style={styles.addInputFull}
                value={newName}
                onChangeText={(v) => { setNewName(v); setError(null); }}
                placeholder="Enter footbed name (e.g. PU Footbed)..."
                placeholderTextColor={colors.mutedSage}
              />
              <View style={styles.footbedSelectorsRow}>
                <View style={{ flex: 1 }}>
                  <Dropdown
                    label="Gender"
                    placeholder="Select gender"
                    options={[
                      { label: 'Men', value: 'Men' },
                      { label: 'Women', value: 'Women' },
                    ]}
                    value={selectedGender}
                    onChange={(v) => {
                      setSelectedGender(v as 'Men' | 'Women');
                      setSelectedSizes([]);
                    }}
                  />
                </View>
              </View>

              <View style={styles.sizesSection}>
                <View style={styles.sizesHeader}>
                  <Text style={styles.sizesLabel}>SELECT SIZES *</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const allSizes = selectedGender === 'Men' ? MEN_SIZES : WOMEN_SIZES;
                      if (selectedSizes.length === allSizes.length) {
                        setSelectedSizes([]);
                      } else {
                        setSelectedSizes([...allSizes]);
                      }
                    }}
                    style={styles.selectAllBtn}
                  >
                    <Text style={styles.selectAllBtnText}>
                      {selectedSizes.length === (selectedGender === 'Men' ? MEN_SIZES : WOMEN_SIZES).length
                        ? 'Deselect All'
                        : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.sizesGrid}>
                  {(selectedGender === 'Men' ? MEN_SIZES : WOMEN_SIZES).map((size) => {
                    const isSelected = selectedSizes.includes(size);
                    return (
                      <TouchableOpacity
                        key={size}
                        style={[styles.sizeOption, isSelected && styles.sizeOptionActive]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedSizes(selectedSizes.filter((s) => s !== size));
                          } else {
                            setSelectedSizes([...selectedSizes, size]);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.sizeOptionText, isSelected && styles.sizeOptionTextActive]}>
                          {size}
                        </Text>
                        {isSelected && (
                          <MaterialCommunityIcons name="check" size={10} color={colors.onPrimary} style={styles.sizeCheck} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.addBtnFull, adding && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={adding}
                activeOpacity={0.8}
              >
                {adding ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="plus" size={20} color={colors.onPrimary} />
                    <Text style={styles.addBtnFullText}>Add Footbed Category</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : activeTab === 'buckle' ? (
            <View style={styles.addRow}>
              <View style={styles.buckleInputs}>
                <TextInput
                  style={styles.addInputBuckle}
                  value={newName}
                  onChangeText={(v) => { setNewName(v); setError(null); }}
                  placeholder="Buckle name (e.g. Roller Buckle)..."
                  placeholderTextColor={colors.mutedSage}
                  returnKeyType="next"
                />
                <TextInput
                  style={styles.addInputBuckle}
                  value={newColor}
                  onChangeText={(v) => { setNewColor(v); setError(null); }}
                  placeholder="Color (e.g. Antique Gold)..."
                  placeholderTextColor={colors.mutedSage}
                  onSubmitEditing={handleAdd}
                  returnKeyType="done"
                />
              </View>
              <TouchableOpacity
                style={[styles.addBtn, adding && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={adding}
                activeOpacity={0.8}
              >
                {adding ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <MaterialCommunityIcons name="plus" size={22} color={colors.onPrimary} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                value={newName}
                onChangeText={(v) => { setNewName(v); setError(null); }}
                placeholder={`Add new ${activeTab} category...`}
                placeholderTextColor={colors.mutedSage}
                onSubmitEditing={handleAdd}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addBtn, adding && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={adding}
                activeOpacity={0.8}
              >
                {adding ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <MaterialCommunityIcons name="plus" size={22} color={colors.onPrimary} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <View style={styles.errorRow}>
              <MaterialCommunityIcons name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.leatherTan} />
            </View>
          ) : (
            <FlatList
              data={categories}
              renderItem={renderItem}
              keyExtractor={(item) => item._id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="tag-outline" size={32} color={colors.mutedSage} />
                  <Text style={styles.emptyText}>No categories yet</Text>
                  <Text style={styles.emptySubtext}>Add your first {activeTab} category above</Text>
                </View>
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  container: {
    backgroundColor: colors.factoryWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingBottom: 16,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  title: {
    ...typography.labelCaps,
    color: colors.onSurface,
    letterSpacing: 1,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
  },
  tabActive: {
    borderColor: colors.leatherTan,
    backgroundColor: colors.factoryWhite,
  },
  tabText: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.mutedSage,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.leatherTan,
    fontWeight: '700',
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 4,
    alignItems: 'center',
  },
  buckleInputs: {
    flex: 1,
    gap: 8,
  },
  addInputBuckle: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.bodyMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.bodyMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  addBtn: {
    backgroundColor: colors.leatherTan,
    borderRadius: BORDER_RADIUS.card,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.6 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  errorText: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.error,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.factoryWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    gap: 10,
  },
  categoryName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
    fontWeight: '500',
  },
  editInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.input,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...typography.bodyMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.leatherTan,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    ...typography.bodyLg,
    color: colors.mutedSage,
    fontWeight: '600',
  },
  emptySubtext: {
    ...typography.bodyMd,
    color: colors.mutedSage,
    textAlign: 'center',
  },
  footbedAddContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  addInputFull: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.bodyMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  footbedSelectorsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addBtnFull: {
    backgroundColor: colors.leatherTan,
    borderRadius: BORDER_RADIUS.card,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnFullText: {
    ...typography.bodyMd,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  sizesSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  sizesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sizesLabel: {
    ...typography.labelCaps,
    fontSize: 11,
    color: colors.mutedSage,
    letterSpacing: 0.5,
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
  sizesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeOption: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.input,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sizeOptionActive: {
    borderColor: colors.leatherTan,
    backgroundColor: colors.leatherTan,
  },
  sizeOptionText: {
    ...typography.bodyMd,
    fontWeight: '500',
    color: colors.onSurface,
  },
  sizeOptionTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  sizeCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  buckleEditInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  editInputSmall: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.input,
    paddingHorizontal: 8,
    paddingVertical: 6,
    ...typography.bodyMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.leatherTan,
  },
});
