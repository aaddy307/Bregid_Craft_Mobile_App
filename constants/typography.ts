import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography = {
  displayLg: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.64,
    fontFamily,
  } as TextStyle,

  displaySm: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    fontFamily,
  } as TextStyle,

  headlineMd: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.24,
    fontFamily,
  } as TextStyle,

  titleMd: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    fontFamily,
  } as TextStyle,

  titleSm: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily,
  } as TextStyle,

  bodyLg: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    fontFamily,
  } as TextStyle,

  bodyMd: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    fontFamily,
  } as TextStyle,

  labelCaps: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    fontFamily,
  } as TextStyle,

  numericData: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily,
  } as TextStyle,
} as const;

export type TypographyKey = keyof typeof typography;