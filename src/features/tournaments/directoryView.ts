export type TournamentDirectoryView = "list" | "calendar";

const VIEW_KEY = "denison-tennis-os:tournaments-directory-view";
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function viewFromUrl(): TournamentDirectoryView | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("view");
  if (param === "calendar" || param === "list") return param;
  return null;
}

function writeViewUrl(view: TournamentDirectoryView): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (view === "calendar") url.searchParams.set("view", "calendar");
  else url.searchParams.delete("view");
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current !== next) window.history.replaceState(null, "", next);
}

export function readStoredTournamentDirectoryView(): TournamentDirectoryView {
  if (typeof window === "undefined") return "list";
  try {
    return viewFromUrl() ?? (window.sessionStorage.getItem(VIEW_KEY) === "calendar" ? "calendar" : "list");
  } catch {
    return "list";
  }
}

export function writeStoredTournamentDirectoryView(view: TournamentDirectoryView): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(VIEW_KEY, view);
  } catch {
    // Private mode / quota.
  }
  writeViewUrl(view);
  emit();
}

export function subscribeTournamentDirectoryView(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    window.addEventListener("popstate", onStoreChange);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("popstate", onStoreChange);
    }
  };
}
