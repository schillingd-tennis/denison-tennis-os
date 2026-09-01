/** Shared UTR capture error codes (extension + API). */
export type UtrCaptureErrorCode =
  | "NOT_LOGGED_IN_UTR"
  | "WRONG_UTR_PROFILE"
  | "UTR_FETCH_FAILED"
  | "DENISON_UNAVAILABLE"
  | "DENISON_NOT_SIGNED_IN"
  | "PARSE_FAILED"
  | "NO_RECRUIT_MATCH"
  | "IMPORT_FAILED"
  | "WRONG_PAGE";

import { TODAY_BETA_TEST_PLAYERS } from "./config";
import { parseUtrPlayerIdFromUrl } from "./utrProfile";

export function utrCaptureErrorMessage(code: UtrCaptureErrorCode): string {
  switch (code) {
    case "NOT_LOGGED_IN_UTR":
      return "Not logged into UTR. Sign in at app.utrsports.net and open the Results tab.";
    case "WRONG_UTR_PROFILE":
      return "This UTR profile is not in the monitored Today Beta cohort.";
    case "UTR_FETCH_FAILED":
      return "UTR results request failed. Confirm the Results tab is open and try again.";
    case "DENISON_UNAVAILABLE":
      return "Denison Tennis OS is unavailable. Start the local app at http://localhost:3000.";
    case "DENISON_NOT_SIGNED_IN":
      return "Sign in to Denison Tennis OS in your browser, then capture again.";
    case "PARSE_FAILED":
      return "Could not normalize UTR results.";
    case "NO_RECRUIT_MATCH":
      return "No Today Beta recruit matched this UTR profile.";
    case "IMPORT_FAILED":
      return "Denison OS could not save UTR results.";
    case "WRONG_PAGE":
      return "Open a UTR profile Results page before capturing.";
  }
}

export const UTR_EXTENSION_HEADER = "X-Denison-Utr-Extension";
export const UTR_EXTENSION_HEADER_VALUE = "denison-utr-capture-v0.1";

/** Today Beta five-recruit cohort UTR player ids (config seed + Isaac). */
export const UTR_CAPTURE_ALLOWED_PLAYER_IDS = new Set(
  TODAY_BETA_TEST_PLAYERS.flatMap((player) => {
    const ids: string[] = [];
    if (player.utrPlayerId) ids.push(player.utrPlayerId);
    return ids;
  }),
);

export function registerUtrCaptureAllowedPlayerId(playerId: string): void {
  UTR_CAPTURE_ALLOWED_PLAYER_IDS.add(playerId.trim());
}

export function isUtrCaptureAllowedPlayerId(playerId: string): boolean {
  return UTR_CAPTURE_ALLOWED_PLAYER_IDS.has(playerId.trim());
}

export function isUtrCaptureAllowedProfileUrl(url: string): boolean {
  const playerId = parseUtrPlayerIdFromUrl(url);
  return playerId ? isUtrCaptureAllowedPlayerId(playerId) : false;
}

export type UtrExtensionCaptureBody = {
  utrPlayerId: string;
  recruitPersonId?: string;
  sourceUrl?: string;
  payload: unknown;
};

/** Shape sent from browser extension background → Denison localhost API. */
export function buildUtrExtensionCaptureBody(input: {
  utrPlayerId: string;
  recruitPersonId?: string | null;
  sourceUrl: string;
  payload: unknown;
}): UtrExtensionCaptureBody {
  return {
    utrPlayerId: input.utrPlayerId.trim(),
    recruitPersonId: input.recruitPersonId?.trim() || undefined,
    sourceUrl: input.sourceUrl,
    payload: input.payload,
  };
}
