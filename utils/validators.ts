export interface ValidationError {
  field: string;
  message: string;
}

export function validateEmail(email: string): string | null {
  if (!email || email.trim() === '') {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password || password === '') {
    return 'Password is required';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone || phone.trim() === '') {
    return 'Phone number is required';
  }
  const phoneRegex = /^[\d\s\-+()]{8,20}$/;
  if (!phoneRegex.test(phone)) {
    return 'Please enter a valid phone number';
  }
  return null;
}

export function validatePositiveNumber(
  value: number,
  fieldName: string
): string | null {
  if (isNaN(value)) {
    return `${fieldName} must be a number`;
  }
  if (value < 0) {
    return `${fieldName} must be positive`;
  }
  return null;
}

export function validateEUCode(euSize: number): string | null {
  const validSizes = [36, 37, 38, 39, 40, 41, 42, 43, 44];
  if (!validSizes.includes(euSize)) {
    return `Size must be a valid EU size (${validSizes.join(', ')})`;
  }
  return null;
}

export function validateQuantity(quantity: number): string | null {
  if (isNaN(quantity) || quantity < 1) {
    return 'Quantity must be at least 1 pair';
  }
  if (!Number.isInteger(quantity)) {
    return 'Quantity must be a whole number';
  }
  return null;
}

export function validateSKU(sku: string): string | null {
  if (!sku || sku.trim() === '') {
    return 'SKU is required';
  }
  if (sku.length < 5) {
    return 'SKU must be at least 5 characters';
  }
  return null;
}

export function validateForm(
  fields: { field: string; value: string | number; validators: ((v: string | number) => string | null)[] }[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const { field, value, validators } of fields) {
    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        errors.push({ field, message: error });
        break;
      }
    }
  }

  return errors;
}