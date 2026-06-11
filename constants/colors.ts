export const colors = {
  primary: '#200d00',
  primaryContainer: '#3e1f00',
  secondary: '#7c5630',
  leatherTan: '#BE7D41',

  background: '#fff8f5',
  surface: '#fff8f5',
  factoryWhite: '#FDFDFD',
  surfaceContainer: '#f6ece6',
  surfaceContainerLow: '#fcf2ec',
  surfaceContainerHigh: '#f0e6e0',
  surfaceVariant: '#ebe1db',

  onPrimary: '#ffffff',
  onSurface: '#1f1b17',
  onSurfaceVariant: '#50453b',
  mutedSage: '#7F715C',
  outline: '#83746a',
  outlineVariant: '#d5c3b7',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  workshopGrey: '#111518',

  success: '#2E7D32',
  successContainer: '#E8F5E9',
  shadowWarm: 'rgba(124, 86, 48, 0.15)',
  activeHighlight: '#E39755',
} as const;

export type ColorKey = keyof typeof colors;