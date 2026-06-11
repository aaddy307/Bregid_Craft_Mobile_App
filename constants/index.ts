export { colors, type ColorKey } from './colors';
export { typography, type TypographyKey } from './typography';

export const BORDER_RADIUS = {
  card: 4,
  button: 2,
  pill: 12,
  input: 2,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const EU_SIZES = [36, 37, 38, 39, 40, 41, 42, 43, 44] as const;

export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  WORKER: 'worker',
} as const;

export const MATERIALS = {
  LEATHER: 'leather',
  BUCKLE: 'buckle',
  FOOTBED: 'footbed',
} as const;

export const STOCK_LOG_TYPES = {
  ADD: 'add',
  DEDUCT: 'deduct',
} as const;

export const REASONS = {
  WORKER_ENTRY: 'worker_entry',
  MANUAL_ADD: 'manual_add',
  ENTRY_EDIT: 'entry_edit',
  ENTRY_DELETE: 'entry_delete',
} as const;

export const NOTIFICATION_TYPES = {
  LOW_STOCK: 'low_stock',
  TARGET_REACHED: 'target_reached',
} as const;

// Material type options for dropdowns
export const LEATHER_TYPES = [
  'Nubuck',
  'Suede',
  'Smooth Leather',
  'Oil Pull-up',
  'Vegetable Tan',
  'Crazy Horse',
  'Nappa',
  'Patent',
  'Suede Split',
  'Other',
] as const;

export const BUCKLE_TYPES = [
  'Brass Buckle',
  'Silver Buckle',
  'Antique Gold',
  'Nickel Buckle',
  'Gunmetal',
  'Rose Gold',
  'Black Oxide',
  'Custom Logo',
  'Other',
] as const;

export const FOOTBED_TYPES = [
  'Cork Footbed',
  'Memory Foam',
  'Latex',
  'EVA Foam',
  'Orthopedic',
  'Anti-fatigue',
  'Cork & Latex',
  'Synthetic',
  'Leather Covered',
  'Other',
] as const;