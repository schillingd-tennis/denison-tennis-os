/**
 * Team Schedule directory session state — separate keys from Recruiting / Team.
 */

export type ScheduleViewMode =
  | "all"
  | "fall"
  | "spring"
  | "ncac"
  | "nonConference"
  | "home"
  | "away"
  | "neutral"
  | "events"
  | "tentative"
  | "doubleheaders";

const QUERY_KEY = "denison-tennis-os:team-schedule-query";
const VIEW_KEY = "denison-tennis-os:team-schedule-view";

const queryListeners = new Set<() => void>();
const viewListeners = new Set<() => void>();

function emit(listeners: Set<() => void>) {
  for (const listener of listeners) listener();
}

export function readStoredScheduleDirectoryQuery(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(QUERY_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredScheduleDirectoryQuery(query: string): void {
  if (typeof window === "undefined") return;
  try {
    if (query.trim() === "") window.sessionStorage.removeItem(QUERY_KEY);
    else window.sessionStorage.setItem(QUERY_KEY, query);
  } catch {
    // Private mode / quota.
  }
  emit(queryListeners);
}

export function subscribeScheduleDirectoryQuery(onStoreChange: () => void): () => void {
  queryListeners.add(onStoreChange);
  return () => {
    queryListeners.delete(onStoreChange);
  };
}

const SCHEDULE_VIEW_MODES: readonly ScheduleViewMode[] = [
  "all",
  "fall",
  "spring",
  "ncac",
  "nonConference",
  "home",
  "away",
  "neutral",
  "events",
  "tentative",
  "doubleheaders",
];

export function readStoredScheduleDirectoryView(): ScheduleViewMode {
  if (typeof window === "undefined") return "all";
  try {
    const raw = window.sessionStorage.getItem(VIEW_KEY);
    if (raw && (SCHEDULE_VIEW_MODES as readonly string[]).includes(raw)) {
      return raw as ScheduleViewMode;
    }
    return "all";
  } catch {
    return "all";
  }
}

export function writeStoredScheduleDirectoryView(view: ScheduleViewMode): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(VIEW_KEY, view);
  } catch {
    // Private mode / quota.
  }
  emit(viewListeners);
}

export function subscribeScheduleDirectoryView(onStoreChange: () => void): () => void {
  viewListeners.add(onStoreChange);
  return () => {
    viewListeners.delete(onStoreChange);
  };
}
