/** Shared constants for Denison UTR Capture (Chrome, no build step). */
(function (global) {
  const DENISON_OS_ORIGIN = "http://localhost:3000";
  const UTR_EXTENSION_HEADER = "X-Denison-Utr-Extension";
  const UTR_EXTENSION_HEADER_VALUE = "denison-utr-capture-v0.1";
  const ALLOWED_UTR_PLAYER_IDS = new Set(["3186547"]);

  const ERROR_MESSAGES = {
    NOT_LOGGED_IN_UTR:
      "Not logged into UTR. Sign in at app.utrsports.net and open the Results tab.",
    WRONG_UTR_PROFILE:
      "This UTR profile is not in the Today Beta cohort (Isaac Lewis proof-of-concept only).",
    UTR_FETCH_FAILED:
      "UTR results request failed. Confirm the Results tab is open and try again.",
    DENISON_UNAVAILABLE:
      "Denison Tennis OS is unavailable. Start the local app at http://localhost:3000.",
    DENISON_NOT_SIGNED_IN:
      "Sign in to Denison Tennis OS in Chrome, then capture again.",
    PARSE_FAILED: "Could not normalize UTR results.",
    NO_RECRUIT_MATCH: "No Today Beta recruit matched this UTR profile.",
    IMPORT_FAILED: "Denison OS could not save UTR results.",
    WRONG_PAGE: "Open a UTR profile Results page before capturing.",
  };

  function captureError(code, detail) {
    const message = ERROR_MESSAGES[code] ?? "Capture failed.";
    const err = new Error(detail ? `${message} (${detail})` : message);
    err.code = code;
    return err;
  }

  function parseUtrPlayerIdFromUrl(url) {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.includes("utrsports.net")) return null;
      const match = parsed.pathname.match(/\/profiles\/(\d+)/i);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  function recruitPersonIdFromUrl(url) {
    try {
      return new URL(url).searchParams.get("dtenPersonId");
    } catch {
      return null;
    }
  }

  global.DenisonUtrCaptureConstants = {
    DENISON_OS_ORIGIN,
    UTR_EXTENSION_HEADER,
    UTR_EXTENSION_HEADER_VALUE,
    ALLOWED_UTR_PLAYER_IDS,
    ERROR_MESSAGES,
    captureError,
    parseUtrPlayerIdFromUrl,
    recruitPersonIdFromUrl,
  };
})(globalThis);
