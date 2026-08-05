/**
 * Lightweight fuzzy matcher for universal search (no extra deps).
 * Supports contiguous, partial, multi-token, subsequence, and initials.
 * Higher score = better match. Returns 0 when there is no match.
 */

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** True when every character of `query` appears in order in `text`. */
function isSubsequence(query: string, text: string): boolean {
  let qi = 0;
  for (let ti = 0; ti < text.length && qi < query.length; ti += 1) {
    if (text[ti] === query[qi]) qi += 1;
  }
  return qi === query.length;
}

/** Initials from whitespace-separated words ("Kyle Patrick" → "kp"). */
export function initialsFromLabel(label: string): string {
  return label
    .replace(/^(open|go to)\s+/i, "")
    .split(/[\s"']+/)
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .toLowerCase();
}

/**
 * Score how well `query` matches a single haystack string.
 * Prefers contiguous includes and word-prefix hits over sparse subsequences.
 */
export function scoreMatch(query: string, haystack: string): number {
  const q = normalize(query);
  const h = normalize(haystack);
  if (!q) return 1;
  if (!h) return 0;

  if (h === q) return 1000;
  if (h.startsWith(q)) return 800 + Math.min(q.length, 40);

  const index = h.indexOf(q);
  if (index >= 0) {
    const wordBoundary = index === 0 || /\s/.test(h[index - 1] ?? "");
    return (wordBoundary ? 600 : 400) + Math.min(q.length, 40) - Math.min(index, 50);
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => h.includes(token))) {
    return 350 + tokens.length * 20;
  }

  if (isSubsequence(q.replace(/\s+/g, ""), h.replace(/\s+/g, ""))) {
    return 100 + Math.min(q.length, 30);
  }

  return 0;
}

function scoreInitials(query: string, initials: string | undefined, label: string): number {
  const q = normalize(query).replace(/[^a-z0-9]/g, "");
  if (!q || q.length > 4) return 0;

  const explicit = normalize(initials ?? "").replace(/[^a-z0-9]/g, "");
  const derived = initialsFromLabel(label);
  const candidates = [explicit, derived].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === q) return 920;
    if (candidate.startsWith(q)) return 700 + q.length * 20;
  }
  return 0;
}

/** Best score across label, subtitle, keywords, and initials. */
export function scoreCommand(
  query: string,
  parts: {
    label: string;
    subtitle?: string;
    keywords?: string[];
    initials?: string;
  },
): number {
  const q = normalize(query);
  if (!q) return 1;

  let best = scoreMatch(q, parts.label);
  best = Math.max(best, scoreInitials(q, parts.initials, parts.label));

  if (parts.subtitle) {
    best = Math.max(best, scoreMatch(q, parts.subtitle) * 0.85);
  }
  for (const keyword of parts.keywords ?? []) {
    best = Math.max(best, scoreMatch(q, keyword) * 0.9);
    best = Math.max(best, scoreInitials(q, undefined, keyword));
  }
  if (parts.subtitle) {
    best = Math.max(best, scoreMatch(q, `${parts.label} ${parts.subtitle}`));
  }
  return best;
}
