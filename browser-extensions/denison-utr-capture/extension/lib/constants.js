/** @typedef {'NOT_LOGGED_IN_UTR' | 'WRONG_UTR_PROFILE' | 'UTR_FETCH_FAILED' | 'DENISON_UNAVAILABLE' | 'DENISON_NOT_SIGNED_IN' | 'PARSE_FAILED' | 'NO_RECRUIT_MATCH' | 'IMPORT_FAILED' | 'WRONG_PAGE'} CaptureErrorCode */

export const DENISON_OS_ORIGIN = "http://localhost:3000";
export const UTR_EXTENSION_HEADER = "X-Denison-Utr-Extension";
export const UTR_EXTENSION_HEADER_VALUE = "denison-utr-capture-v0.1";

/** Isaac Lewis proof-of-concept — expand after live test passes. */
export const ALLOWED_UTR_PLAYER_IDS = new Set(["3186547"]);

export const ERROR_MESSAGES = {
  NOT_LOGGED_IN_UTR:
    "Not logged into UTR. Sign in at app.utrsports.net and open the Results tab.",
  WRONG_UTR_PROFILE:
    "This UTR profile is not in the Today Beta cohort (Isaac Lewis proof-of-concept only).",
  UTR_FETCH_FAILED:
    "UTR results request failed. Confirm the Results tab is open and try again.",
  DENISON_UNAVAILABLE:
    "Denison Tennis OS is unavailable. Start the local app at http://localhost:3000.",
  DENISON_NOT_SIGNED_IN:
    "Sign in to Denison Tennis OS in Safari, then capture again.",
  PARSE_FAILED: "Could not normalize UTR results.",
  NO_RECRUIT_MATCH: "No Today Beta recruit matched this UTR profile.",
  IMPORT_FAILED: "Denison OS could not save UTR results.",
  WRONG_PAGE: "Open a UTR profile Results page before capturing.",
};

/**
 * @param {CaptureErrorCode} code
 * @param {string} [detail]
 */
export function captureError(code, detail) {
  const message = ERROR_MESSAGES[code] ?? "Capture failed.";
  const err = new Error(detail ? `${message} (${detail})` : message);
  err.code = code;
  return err;
}

export function parseUtrPlayerIdFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("utrsports.net")) return null;
    const match = parsed.pathname.match(/\/profiles\/(\d+)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function recruitPersonIdFromUrl(url) {
  try {
    return new URL(url).searchParams.get("dtenPersonId");
  } catch {
    return null;
  }
}
