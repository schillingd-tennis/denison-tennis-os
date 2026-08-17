/**
 * Recruiting directory session state (BP-045 + Coach Rank Phase C).
 * Separate keys from Team so Back to Recruiting does not share Team search/view.
 */

export type RecruitingViewMode = "cards" | "list" | "rank" | "commit";

const QUERY_KEY = "denison-tennis-os:recruiting-directory-query";
const VIEW_KEY = "denison-tennis-os:recruiting-directory-view";
const RANK_CLASS_KEY = "denison-tennis-os:recruiting-rank-class-year";

const queryListeners = new Set<() => void>();
const viewListeners = new Set<() => void>();
const rankClassListeners = new Set<() => void>();

function emit(listeners: Set<() => void>) {
  for (const listener of listeners) listener();
}

export function readStoredRecruitingDirectoryQuery(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(QUERY_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredRecruitingDirectoryQuery(query: string): void {
  if (typeof window === "undefined") return;
  try {
    if (query.trim() === "") window.sessionStorage.removeItem(QUERY_KEY);
    else window.sessionStorage.setItem(QUERY_KEY, query);
  } catch {
    // Private mode / quota.
  }
  emit(queryListeners);
}

export function subscribeRecruitingDirectoryQuery(onStoreChange: () => void): () => void {
  queryListeners.add(onStoreChange);
  return () => {
    queryListeners.delete(onStoreChange);
  };
}

export function readStoredRecruitingDirectoryView(): RecruitingViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const raw = window.sessionStorage.getItem(VIEW_KEY);
    if (raw === "cards" || raw === "list" || raw === "rank" || raw === "commit") return raw;
    return "list";
  } catch {
    return "list";
  }
}

export function writeStoredRecruitingDirectoryView(view: RecruitingViewMode): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(VIEW_KEY, view);
  } catch {
    // Private mode / quota.
  }
  emit(viewListeners);
}

export function subscribeRecruitingDirectoryView(onStoreChange: () => void): () => void {
  viewListeners.add(onStoreChange);
  return () => {
    viewListeners.delete(onStoreChange);
  };
}

/** Explicit Rank View class when filters do not pin exactly one year. */
export function readStoredRecruitingRankClassYear(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(RANK_CLASS_KEY);
    if (!raw) return null;
    const year = Number(raw);
    return Number.isInteger(year) ? year : null;
  } catch {
    return null;
  }
}

export function writeStoredRecruitingRankClassYear(year: number | null): void {
  if (typeof window === "undefined") return;
  try {
    if (year === null) window.sessionStorage.removeItem(RANK_CLASS_KEY);
    else window.sessionStorage.setItem(RANK_CLASS_KEY, String(year));
  } catch {
    // Private mode / quota.
  }
  emit(rankClassListeners);
}

export function subscribeRecruitingRankClassYear(onStoreChange: () => void): () => void {
  rankClassListeners.add(onStoreChange);
  return () => {
    rankClassListeners.delete(onStoreChange);
  };
}
