export function normalizeDoublesKey(value: string): string {
  return value
    .split(/\s*(?:\/|&|\band\b|,)\s*/i)
    .map((name) => name.trim().toLocaleLowerCase())
    .filter(Boolean)
    .sort()
    .join("::");
}
