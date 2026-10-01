/**
 * Validation and Formatting Utilities
 * Standard format for phone numbers: 0000-000-0000 (11 digits, e.g. 0912-345-6789)
 */

export const formatPhoneNumber = (value: string): string => {
  // Strip all non-digit characters
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length <= 7) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
};

export const isValidPhoneNumber = (value: string): boolean => {
  // Must match exactly 0000-000-0000 (4 digits - 3 digits - 4 digits)
  return /^\d{4}-\d{3}-\d{4}$/.test(value.trim());
};

export const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

export const isValidPassword = (value: string): boolean => {
  return value.trim().length >= 6;
};
