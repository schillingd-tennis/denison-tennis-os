/**
 * Stored UTR / WTN / TennisRecruiting.net profile URL.
 * Returns the trimmed http(s) value, or undefined when missing/invalid.
 * Does not invent URLs from names, ranks, or IDs.
 */
export function rankingProfileHref(
  raw: string | null | undefined,
): string | undefined {
  const href = typeof raw === "string" ? raw.trim() : "";
  if (!href) return undefined;
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return href;
  } catch {
    return undefined;
  }
}
