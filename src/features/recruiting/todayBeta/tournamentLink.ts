/**
 * Tournament/event URLs for Latest Results display.
 * UTR event pages: https://app.utrsports.net/events/{numericEventId}
 */
import type { RecruitMatchResult } from "./types";

const UTR_EVENT_ID = /^\d+$/;

export function buildUtrEventUrl(eventId: string | number | undefined | null): string | undefined {
  if (eventId == null) return undefined;
  const normalized = String(eventId).trim();
  if (!UTR_EVENT_ID.test(normalized)) return undefined;
  return `https://app.utrsports.net/events/${normalized}`;
}

export function resolveTournamentUrl(
  result: Pick<RecruitMatchResult, "tournamentUrl">,
): string | undefined {
  const url = result.tournamentUrl?.trim();
  if (!url) return undefined;
  if (!/^https?:\/\//i.test(url)) return undefined;
  return url;
}
