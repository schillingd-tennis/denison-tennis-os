/**
 * Recruiting directory session state (BP-045).
 * Separate keys from Team so Back to Recruiting does not share Team search/view.
 */
import type { ViewMode } from "@/components/ViewToggle";

const QUERY_KEY = "denison-tennis-os:recruiting-directory-query";
const VIEW_KEY = "denison-tennis-os:recruiting-directory-view";

const queryListeners = new Set<() => void>();
const viewListeners = new Set<() => void>();

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

export function readStoredRecruitingDirectoryView(): ViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const raw = window.sessionStorage.getItem(VIEW_KEY);
    if (raw === "cards" || raw === "list") return raw;
    return "list";
  } catch {
    return "list";
  }
}

export function writeStoredRecruitingDirectoryView(view: ViewMode): void {
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
