/**
 * Generic, reusable field-level validators for the Universal Person Editor.
 * These know nothing about `Person` — see `src/features/people/validation.ts`
 * for how they're composed into the Person-specific rules.
 */

export function isRequired(value: string | undefined): string | undefined {
  return value && value.trim() ? undefined : "This field is required.";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string | undefined): string | undefined {
  if (!value || !value.trim()) return undefined;
  return EMAIL_PATTERN.test(value.trim()) ? undefined : "Enter a valid email address.";
}

export function isValidPhone(value: string | undefined): string | undefined {
  if (!value || !value.trim()) return undefined;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? undefined : "Enter a valid phone number.";
}

export function isValidUtr(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (Number.isNaN(value)) return "UTR must be a number.";
  return value >= 0 && value <= 16 ? undefined : "UTR must be between 0 and 16.";
}

export function isValidWtn(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (Number.isNaN(value)) return "WTN must be a number.";
  return value > 0 ? undefined : "WTN must be a positive number.";
}
