/**
 * Display-only tournament name formatting for Today Beta result views.
 * Does not modify stored source values.
 */

const PRESERVED_UPPERCASE = new Set([
  "L1",
  "L2",
  "L3",
  "L4",
  "USTA",
  "ITA",
  "ITF",
  "J30",
  "J60",
  "J100",
  "J200",
  "BG18",
  "B16",
  "B18",
]);

const SMALL_WORDS = new Set(["at", "the", "of", "and", "by", "in", "on", "for"]);

function isMostlyUppercase(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length === 0) return false;
  const upperCount = (letters.match(/[A-Z]/g) ?? []).length;
  return upperCount / letters.length >= 0.8;
}

function normalizeTokenKey(token: string): string {
  return token.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function isPreservedToken(token: string): boolean {
  const key = normalizeTokenKey(token);
  if (PRESERVED_UPPERCASE.has(key)) return true;
  if (/^L\d$/.test(key)) return true;
  if (/^BG\d{2}$/.test(key)) return true;
  if (/^B\d{2}$/.test(key)) return true;
  if (/^J\d+$/.test(key)) return true;
  if (/^B\d{2},\d{2}$/i.test(token)) return true;
  return false;
}

function formatPreservedToken(token: string): string {
  if (token.includes(",")) {
    return token
      .split(",")
      .map((part) => {
        const trimmed = part.trim();
        if (!trimmed) return part;
        return isPreservedToken(trimmed) ? trimmed.toUpperCase() : titleCaseCore(trimmed);
      })
      .join(",");
  }
  return token.toUpperCase();
}

function titleCaseCore(value: string): string {
  const lower = value.toLowerCase();
  if (lower === "jr" || lower === "jr.") return "Jr.";
  if (lower === "sr" || lower === "sr.") return "Sr.";
  if (lower.length === 0) return value;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatWordToken(token: string, wordIndex: number): string {
  const trailingPunct = token.match(/[.,;:!?]+$/)?.[0] ?? "";
  const leadingPunct = token.match(/^['"(]+/)?.[0] ?? "";
  const core = token.slice(leadingPunct.length, token.length - trailingPunct.length);
  if (!core) return token;

  if (isPreservedToken(core)) {
    return leadingPunct + formatPreservedToken(core) + trailingPunct;
  }

  const lower = core.toLowerCase();
  if (/^jr\.?$/.test(lower)) {
    return leadingPunct + "Jr." + (trailingPunct === "." ? "" : trailingPunct);
  }
  if (/^sr\.?$/.test(lower)) {
    return leadingPunct + "Sr." + (trailingPunct === "." ? "" : trailingPunct);
  }
  if (wordIndex > 0 && SMALL_WORDS.has(lower)) {
    return leadingPunct + lower + trailingPunct;
  }

  return leadingPunct + titleCaseCore(core) + trailingPunct;
}

/** Readable mixed case for TRN-style ALL CAPS tournament names. */
export function formatTournamentNameDisplay(name: string | undefined | null): string {
  if (!name?.trim()) return "Unknown";
  const trimmed = name.trim();
  if (!isMostlyUppercase(trimmed)) return trimmed;

  const parts = trimmed.split(/(\s+)/);
  let wordIndex = 0;
  return parts
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      const formatted = formatWordToken(part, wordIndex);
      wordIndex += 1;
      return formatted;
    })
    .join("");
}
