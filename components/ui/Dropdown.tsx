import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, BORDER_RADIUS } from '../../constants';

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function Dropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  error,
  required = false,
}: DropdownProps) {
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.selectorText,
            !selectedOption && styles.placeholderText,
          ]}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={colors.mutedSage}
        />
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Modal visible={visible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleSelect(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={colors.leatherTan}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.card,
    padding: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  selectorError: {
    borderColor: colors.error,
  },
  selectorText: {
    ...typography.bodyLg,
    color: colors.onSurface,
    flex: 1,
  },
  placeholderText: {
    color: colors.mutedSage,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: colors.factoryWhite,
    borderRadius: 16,
    width: '85%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  modalTitle: {
    ...typography.titleMd,
    fontWeight: '600',
    color: colors.onSurface,
  },
  optionsList: {
    padding: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: BORDER_RADIUS.card,
    marginVertical: 2,
  },
  optionSelected: {
    backgroundColor: colors.surfaceContainer,
  },
  optionText: {
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.leatherTan,
  },
});