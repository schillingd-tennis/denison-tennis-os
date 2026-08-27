import { resolveHandle } from "../appleMessages";

import type { ScanMatchContext } from "./scan";
import type { AppleMessagesSyncStore } from "./store";

export type MatchDiagnostics = {
  pending: number;
  unmatched: number;
  ambiguous: number;
  decodeFailed: number;
  imported: number;
  wouldResolve: number;
  wouldStayAmbiguous: number;
  overrideMatches: number;
  osMatches: number;
  contactsMatches: number;
};

export function collectMatchDiagnostics(
  store: AppleMessagesSyncStore,
  context?: ScanMatchContext,
): MatchDiagnostics {
  const counts = store.countUnresolved();
  const pending = store.listPendingUnresolved();
  let wouldResolve = 0;
  let wouldStayAmbiguous = 0;
  let overrideMatches = 0;
  let osMatches = 0;
  let contactsMatches = 0;
  if (context) {
    for (const row of pending) {
      if (row.reason === "decode_failed" || row.reason === "current_team") continue;
      const resolved = resolveHandle(row.handle, context);
      if (resolved.status === "matched") {
        wouldResolve += 1;
        if (resolved.match.source === "override") overrideMatches += 1;
        else if (resolved.match.source === "os") osMatches += 1;
        else contactsMatches += 1;
      } else if (resolved.status === "ambiguous") {
        wouldStayAmbiguous += 1;
      }
    }
  }
  return {
    pending: counts.pending,
    unmatched: counts.unmatched,
    ambiguous: counts.ambiguous,
    decodeFailed: counts.decodeFailed,
    imported: counts.imported,
    wouldResolve,
    wouldStayAmbiguous,
    overrideMatches,
    osMatches,
    contactsMatches,
  };
}

export function formatMatchDiagnostics(diag: MatchDiagnostics): string {
  return [
    `unresolved_pending=${diag.pending}`,
    `unmatched=${diag.unmatched}`,
    `ambiguous=${diag.ambiguous}`,
    `decode_failed=${diag.decodeFailed}`,
    `imported=${diag.imported}`,
    `would_resolve=${diag.wouldResolve}`,
    `would_stay_ambiguous=${diag.wouldStayAmbiguous}`,
    `override_matches=${diag.overrideMatches}`,
    `os_matches=${diag.osMatches}`,
    `contacts_matches=${diag.contactsMatches}`,
  ].join(" ");
}
