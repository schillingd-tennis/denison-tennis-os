/**
 * Denison UTR Capture — background service worker.
 * Orchestrates UTR fetch (via content script) and localhost import (from extension context).
 * Never reads, logs, or transmits JWT/cookies/auth tokens.
 */
import {
  ALLOWED_UTR_PLAYER_IDS,
  DENISON_OS_ORIGIN,
  UTR_EXTENSION_HEADER,
  UTR_EXTENSION_HEADER_VALUE,
  captureError,
  parseUtrPlayerIdFromUrl,
} from "./lib/constants.js";

const browserApi = globalThis.browser ?? globalThis.chrome;

async function readActiveTab() {
  const tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id || !tab.url) {
    throw captureError("WRONG_PAGE");
  }
  return tab;
}

function assertAllowedProfile(playerId) {
  if (!ALLOWED_UTR_PLAYER_IDS.has(playerId)) {
    throw captureError("WRONG_UTR_PROFILE", `UTR id ${playerId}`);
  }
}

async function fetchFromUtrTab(tab) {
  if (!tab.url?.includes("app.utrsports.net/profiles/")) {
    throw captureError("WRONG_PAGE");
  }

  const playerId = parseUtrPlayerIdFromUrl(tab.url);
  if (!playerId) {
    throw captureError("WRONG_PAGE");
  }
  assertAllowedProfile(playerId);

  let response;
  try {
    response = await browserApi.tabs.sendMessage(tab.id, { type: "CAPTURE_UTR_PAGE" });
  } catch {
    throw captureError(
      "UTR_FETCH_FAILED",
      "Reload the UTR Results page after enabling the extension.",
    );
  }

  if (!response?.ok) {
    const code = response?.code ?? "UTR_FETCH_FAILED";
    throw captureError(code, response?.message);
  }

  return response;
}

async function postToDenisonOs(body) {
  let response;
  try {
    response = await fetch(`${DENISON_OS_ORIGIN}/api/recruiting/today-beta/utr-capture`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        [UTR_EXTENSION_HEADER]: UTR_EXTENSION_HEADER_VALUE,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw captureError("DENISON_UNAVAILABLE");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw captureError("DENISON_UNAVAILABLE", `HTTP ${response.status}`);
  }

  if (response.status === 401) {
    throw captureError("DENISON_NOT_SIGNED_IN");
  }

  if (!response.ok || !result.success) {
    const code = result.code ?? "IMPORT_FAILED";
    throw captureError(code, result.error);
  }

  return result;
}

function formatSummary(result) {
  const o = result.outcome;
  return [
    result.recruitName,
    `${o.found} UTR matches read`,
    `${o.crossSourceMatched} matched existing results`,
    `${o.savedAsNew} new results`,
    `${o.needsReview} needs review`,
    "Sent to Denison OS",
  ].join("\n");
}

async function notify(title, message, isError = false) {
  const icon = isError ? "icons/icon48.png" : "icons/icon128.png";
  try {
    await browserApi.notifications.create(`denison-utr-${Date.now()}`, {
      type: "basic",
      iconUrl: icon,
      title,
      message: message.replace(/\n/g, " · "),
    });
  } catch {
    // Notifications optional — ignore if denied.
  }
}

async function runCapture() {
  const tab = await readActiveTab();
  const utrData = await fetchFromUtrTab(tab);

  const result = await postToDenisonOs({
    utrPlayerId: utrData.playerId,
    recruitPersonId: utrData.recruitPersonId ?? undefined,
    sourceUrl: utrData.sourceUrl,
    payload: utrData.payload,
  });

  await notify("Denison UTR Capture", formatSummary(result));
  return result;
}

browserApi.action.onClicked.addListener(() => {
  runCapture().catch(async (error) => {
    const code = error.code ?? "IMPORT_FAILED";
    const message = error.message ?? "Capture failed.";
    await notify("Denison UTR Capture failed", `${code}: ${message}`, true);
  });
});
