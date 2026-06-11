import { Alert } from 'react-native';

export async function checkInternet(): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com', { method: 'HEAD' });
    if (!response.ok) throw new Error('No connection');
    return true;
  } catch {
    Alert.alert(
      'No Internet Connection',
      'Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
}

export function formatEUSize(size: number): string {
  return `EU ${size}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getInitials(name: string): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

export function validateRequired(value: string, fieldName: string): string {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return '';
}

export function validatePositiveNumber(value: string): string {
  if (!value) return '';
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) {
    return 'Must be a positive number';
  }
  return '';
}

export function validateEmail(value: string): string {
  if (!value) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Invalid email format';
  }
  return '';
}

export function validatePhone(value: string): string {
  if (!value) return '';
  const phoneRegex = /^[\d\s\-+()]{8,}$/;
  if (!phoneRegex.test(value)) {
    return 'Invalid phone number';
  }
  return '';
}