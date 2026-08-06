/**
 * BP-031A — Persist Team Directory UI state across Workspace navigation.
 *
 * Filters remain in localStorage (`filters.ts`). List sort remains in
 * sessionStorage (`PersonList`). Search query + Cards/List view live here so
 * “Back to Team” restores the directory exactly as left.
 *
 * Uses subscribe/getSnapshot so client restore works after SSR hydration
 * (lazy useState initializers do not re-run on hydrate).
 */

import type { ViewMode } from "@/components/ViewToggle";

const QUERY_KEY = "denison-tennis-os:team-directory-query";
const VIEW_KEY = "denison-tennis-os:team-directory-view";

const queryListeners = new Set<() => void>();
const viewListeners = new Set<() => void>();

function emit(listeners: Set<() => void>) {
  for (const listener of listeners) listener();
}

export function readStoredDirectoryQuery(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(QUERY_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredDirectoryQuery(query: string): void {
  if (typeof window === "undefined") return;
  try {
    if (query.trim() === "") {
      window.sessionStorage.removeItem(QUERY_KEY);
    } else {
      window.sessionStorage.setItem(QUERY_KEY, query);
    }
  } catch {
    // Private mode / quota — in-memory state still works for this visit.
  }
  emit(queryListeners);
}

export function subscribeDirectoryQuery(onStoreChange: () => void): () => void {
  queryListeners.add(onStoreChange);
  return () => {
    queryListeners.delete(onStoreChange);
  };
}

export function readStoredDirectoryView(): ViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const raw = window.sessionStorage.getItem(VIEW_KEY);
    if (raw === "cards" || raw === "list") return raw;
    return "list";
  } catch {
    return "list";
  }
}

export function writeStoredDirectoryView(view: ViewMode): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(VIEW_KEY, view);
  } catch {
    // Private mode / quota.
  }
  emit(viewListeners);
}

export function subscribeDirectoryView(onStoreChange: () => void): () => void {
  viewListeners.add(onStoreChange);
  return () => {
    viewListeners.delete(onStoreChange);
  };
}
