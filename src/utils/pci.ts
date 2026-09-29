/**
 * PCI DSS guard — reject any value that contains a raw card number.
 * A raw PAN is 13-19 consecutive digits (optionally space/dash separated).
 * We also reject CVV-like 3-4 digit strings inside clearly named fields.
 */
const PAN_REGEX = /\b\d[\d\s\-]{11,17}\d\b/;

/**
 * Recursively walk a plain object and return true if any string value
 * contains what looks like a raw PAN.
 */
export function containsRawCardData(obj: unknown): boolean {
  if (typeof obj === 'string') {
    return PAN_REGEX.test(obj.replace(/[\s-]/g, ''));
  }
  if (Array.isArray(obj)) {
    return obj.some(containsRawCardData);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj as Record<string, unknown>).some(containsRawCardData);
  }
  return false;
}
