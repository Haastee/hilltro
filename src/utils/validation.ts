// Shared, design-system-friendly validation. Returns an error string ("" when
// valid) so callers can render inline messages and gate submission. Also
// exposes sanitizers that strip disallowed characters as the user types, so
// invalid input can be prevented in real time without browser default popups.

const NAME_ALLOWED = /[^\p{L}\s'-]/gu; // letters (any language), space, hyphen, apostrophe
const PHONE_ALLOWED = /[^\d\s()+-]/g; // digits, spaces, () + -

export function sanitizeName(value: string) {
  return value.replace(NAME_ALLOWED, "").replace(/\s{2,}/g, " ");
}

export function sanitizePhone(value: string) {
  return value.replace(PHONE_ALLOWED, "");
}

export function nameError(value: string, label = "name") {
  const trimmed = value.trim();
  if (!trimmed) return `Enter your ${label}.`;
  if (trimmed.length < 2) return `Your ${label} looks too short.`;
  if (!/^[\p{L}][\p{L}\s'-]*$/u.test(trimmed)) return `Use letters only — no numbers or symbols (hyphens and apostrophes are allowed).`;
  return "";
}

export function phoneError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your phone number.";
  const digits = trimmed.replace(/\D/g, "");
  if (/[A-Za-z]/.test(trimmed)) return "Phone numbers can't contain letters.";
  if (digits.length < 7 || digits.length > 15) return "Enter a valid phone number.";
  return "";
}

export function emailError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return "Enter a valid email address.";
  return "";
}

// UK postcode (incode + outcode), case-insensitive, optional single space.
const UK_POSTCODE = /^(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i;

export function postcodeError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a postcode.";
  if (!UK_POSTCODE.test(trimmed)) return "Enter a valid UK postcode (e.g. SW1A 1AA).";
  return "";
}

export function isValidUKPostcode(value: string) {
  return UK_POSTCODE.test(value.trim());
}
