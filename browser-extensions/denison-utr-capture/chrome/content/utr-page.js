/**
 * UTR profile page content script (Chrome).
 * Uses the page's authenticated session — tennis JSON only, no auth extraction.
 */
(function () {
  const ERROR_MESSAGES = {
    NOT_LOGGED_IN_UTR:
      "Not logged into UTR. Sign in at app.utrsports.net and open the Results tab.",
    UTR_FETCH_FAILED:
      "UTR results request failed. Confirm the Results tab is open and try again.",
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

  async function fetchUtrResults(playerId) {
    const url = `https://api.utrsports.net/v4/player/${playerId}/results?type=singles`;
    const response = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw captureError("UTR_FETCH_FAILED", `HTTP ${response.status}`);
    }

    if (response.status === 401 || response.status === 403) {
      throw captureError("NOT_LOGGED_IN_UTR");
    }

    if (
      response.status === 400 &&
      typeof body?.message === "string" &&
      body.message.toLowerCase().includes("token")
    ) {
      throw captureError("NOT_LOGGED_IN_UTR");
    }

    if (!response.ok) {
      throw captureError("UTR_FETCH_FAILED", `HTTP ${response.status}`);
    }

    return body;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "CAPTURE_UTR_PAGE") {
      return false;
    }

    (async () => {
      try {
        const playerId = parseUtrPlayerIdFromUrl(globalThis.location.href);
        if (!playerId) {
          throw captureError("WRONG_PAGE");
        }

        const payload = await fetchUtrResults(playerId);
        sendResponse({
          ok: true,
          playerId,
          recruitPersonId: recruitPersonIdFromUrl(globalThis.location.href),
          sourceUrl: globalThis.location.href,
          payload,
        });
      } catch (error) {
        sendResponse({
          ok: false,
          code: error.code ?? "UTR_FETCH_FAILED",
          message: error.message ?? "UTR fetch failed.",
        });
      }
    })();

    return true;
  });
})();
