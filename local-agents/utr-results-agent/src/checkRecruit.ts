import type { BrowserContext, Response } from "playwright";

import { DEBUG_BROWSER_CLOSE_DELAY_MS, isDebugBrowser, MAX_RETRIES } from "./config.js";
import {
  classifyAcquisition,
  isAuthFailure,
  sanitizeRequestUrl,
  summarizeResponseBody,
} from "./diagnostics.js";
import type {
  AgentRecruitInput,
  AgentRecruitResult,
  RecruitCheckDiagnostics,
  UtrDiagnosticStatus,
} from "./types.js";

function countMatchesInPayload(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0;
  const events = (payload as { events?: unknown[] }).events;
  if (!Array.isArray(events)) return 0;

  let count = 0;
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const results = (event as { results?: unknown[] }).results;
    const draws = (event as { draws?: Array<{ results?: unknown[] }> }).draws;
    if (Array.isArray(results)) count += results.length;
    if (Array.isArray(draws)) {
      for (const draw of draws) {
        if (Array.isArray(draw.results)) count += draw.results.length;
      }
    }
  }
  return count;
}

function emptyDiagnostics(sourceUrl: string): RecruitCheckDiagnostics {
  return {
    profileUrlRequested: sourceUrl,
    finalPageUrl: sourceUrl,
    pageTitle: "",
    signInGateVisible: false,
    profileNameVisible: false,
    resultsTabVisible: false,
    profileLoaded: false,
    loggedInProfileVisible: false,
    pageRequestPath: { observed: false },
    fallbackFetchPath: { attempted: false },
  };
}

async function inspectPageState(
  page: import("playwright").Page,
  expectedProfileName: string,
): Promise<Pick<
  RecruitCheckDiagnostics,
  | "pageTitle"
  | "signInGateVisible"
  | "profileNameVisible"
  | "resultsTabVisible"
  | "profileLoaded"
  | "loggedInProfileVisible"
  | "finalPageUrl"
>> {
  return page.evaluate((profileName) => {
    const bodyText = document.body?.innerText ?? "";
    const lowerBody = bodyText.toLowerCase();
    const title = document.title ?? "";
    const url = location.href;
    const lowerName = profileName.toLowerCase();

    const signInGateVisible =
      /sign in|log in|create account|join utr/i.test(bodyText) ||
      url.toLowerCase().includes("/login") ||
      Boolean(
        document.querySelector(
          'a[href*="login"], button[data-testid*="login"], [data-testid*="sign-in"]',
        ),
      );

    const profileNameVisible =
      lowerBody.includes(lowerName) ||
      Boolean(document.querySelector(`[data-testid*="profile-name"]`));

    const resultsTabVisible =
      lowerBody.includes("results") ||
      url.includes("t=2") ||
      Boolean(
        document.querySelector(
          '[data-testid*="results"], [aria-selected="true"][role="tab"]',
        ),
      );

    const profileLoaded = !url.toLowerCase().includes("/login") && bodyText.trim().length > 0;
    const loggedInProfileVisible = profileLoaded && !signInGateVisible && profileNameVisible;

    return {
      pageTitle: title,
      finalPageUrl: url,
      signInGateVisible,
      profileNameVisible,
      resultsTabVisible,
      profileLoaded,
      loggedInProfileVisible,
    };
  }, expectedProfileName);
}

type ApiPathObservation = {
  requestUrl: string;
  method: string;
  httpStatus: number;
  contentType?: string;
  bodySummary?: string;
  jsonCaptured: boolean;
  payload?: unknown;
};

async function observeApiResponse(response: Response): Promise<ApiPathObservation> {
  const requestUrl = sanitizeRequestUrl(response.url());
  const method = response.request().method();
  const httpStatus = response.status();
  const contentType = response.headers()["content-type"];
  const text = await response.text().catch(() => "");
  const bodySummary = summarizeResponseBody(text);

  let jsonCaptured = false;
  let payload: unknown;
  try {
    payload = JSON.parse(text);
    jsonCaptured = true;
  } catch {
    jsonCaptured = false;
  }

  return {
    requestUrl,
    method,
    httpStatus,
    contentType,
    bodySummary,
    jsonCaptured,
    payload,
  };
}

type FetchAttemptResult =
  | {
      ok: true;
      payload: unknown;
      matchesRead: number;
      diagnosticStatus: UtrDiagnosticStatus;
      diagnostics: RecruitCheckDiagnostics;
    }
  | {
      ok: false;
      auth: boolean;
      message: string;
      diagnosticStatus: UtrDiagnosticStatus;
      diagnostics: RecruitCheckDiagnostics;
    };

async function fetchResultsViaPage(
  context: BrowserContext,
  playerId: string,
  sourceUrl: string,
  displayName: string,
): Promise<FetchAttemptResult> {
  const diagnostics = emptyDiagnostics(sourceUrl);
  const page = await context.newPage();
  const apiUrlPart = `/v4/player/${playerId}/results`;
  const observedResponses: Response[] = [];

  const onResponse = (response: Response) => {
    if (!response.url().includes(apiUrlPart)) return;
    if (response.request().method() !== "GET") return;
    observedResponses.push(response);
  };

  page.on("response", onResponse);

  try {
    let navigationStatus: number | undefined;
    try {
      const navigation = await page.goto(sourceUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      navigationStatus = navigation?.status();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Page load failed.";
      diagnostics.navigationStatus = navigationStatus;
      const classified = classifyAcquisition({
        navigationError: message,
        signInGateVisible: false,
        profileLoaded: false,
        pageRequestObserved: false,
        fallbackAttempted: false,
        matchesRead: 0,
      });
      diagnostics.diagnosticStatus = classified.diagnosticStatus;
      diagnostics.responseSummary = classified.message;
      return {
        ok: false,
        auth: classified.auth,
        message: classified.message,
        diagnosticStatus: classified.diagnosticStatus,
        diagnostics,
      };
    }

    diagnostics.navigationStatus = navigationStatus;
    await page.waitForTimeout(2_500);

    const pageState = await inspectPageState(page, displayName);
    Object.assign(diagnostics, pageState);

    let pageObservation: ApiPathObservation | undefined;
    for (const response of observedResponses) {
      pageObservation = await observeApiResponse(response);
      diagnostics.pageRequestPath = {
        observed: true,
        requestUrl: pageObservation.requestUrl,
        method: pageObservation.method,
        httpStatus: pageObservation.httpStatus,
        contentType: pageObservation.contentType,
        bodySummary: pageObservation.bodySummary,
        jsonCaptured: pageObservation.jsonCaptured,
      };
      break;
    }

    if (pageObservation?.jsonCaptured && pageObservation.payload !== undefined) {
      const payload = pageObservation.payload;
      const matchesRead = countMatchesInPayload(payload);
      const classified = classifyAcquisition({
        signInGateVisible: diagnostics.signInGateVisible,
        profileLoaded: diagnostics.profileLoaded,
        pageRequestObserved: true,
        pageRequestStatus: pageObservation.httpStatus,
        pageRequestJsonCaptured: true,
        pageRequestBodySummary: pageObservation.bodySummary,
        fallbackAttempted: false,
        matchesRead,
      });

      diagnostics.diagnosticStatus = classified.diagnosticStatus;
      diagnostics.responseSummary = pageObservation.bodySummary;

      if (
        classified.diagnosticStatus === "UTR_RESULTS_SUCCESS" ||
        classified.diagnosticStatus === "UTR_RESULTS_EMPTY"
      ) {
        return {
          ok: true,
          payload,
          matchesRead,
          diagnosticStatus: classified.diagnosticStatus,
          diagnostics,
        };
      }
    }

    diagnostics.fallbackFetchPath.attempted = true;
    const fallbackUrl = sanitizeRequestUrl(
      `https://api.utrsports.net/v4/player/${playerId}/results?type=singles`,
    );

    const pageResult = await page.evaluate(async (id) => {
      const response = await fetch(
        `https://api.utrsports.net/v4/player/${id}/results?type=singles`,
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      const text = await response.text();
      return {
        status: response.status,
        contentType: response.headers.get("content-type") ?? undefined,
        text,
      };
    }, playerId);

    diagnostics.fallbackFetchPath = {
      attempted: true,
      requestUrl: fallbackUrl,
      httpStatus: pageResult.status,
      contentType: pageResult.contentType,
      bodySummary: summarizeResponseBody(pageResult.text),
      jsonCaptured: false,
    };

    let fallbackPayload: unknown;
    try {
      fallbackPayload = JSON.parse(pageResult.text);
      diagnostics.fallbackFetchPath.jsonCaptured = true;
    } catch {
      diagnostics.fallbackFetchPath.jsonCaptured = false;
    }

    if (diagnostics.fallbackFetchPath.jsonCaptured) {
      const matchesRead = countMatchesInPayload(fallbackPayload);
      const classified = classifyAcquisition({
        signInGateVisible: diagnostics.signInGateVisible,
        profileLoaded: diagnostics.profileLoaded,
        pageRequestObserved: diagnostics.pageRequestPath.observed,
        pageRequestStatus: diagnostics.pageRequestPath.httpStatus,
        pageRequestJsonCaptured: diagnostics.pageRequestPath.jsonCaptured,
        pageRequestBodySummary: diagnostics.pageRequestPath.bodySummary,
        fallbackAttempted: true,
        fallbackStatus: pageResult.status,
        fallbackJsonCaptured: true,
        fallbackBodySummary: diagnostics.fallbackFetchPath.bodySummary,
        matchesRead,
      });

      diagnostics.diagnosticStatus = classified.diagnosticStatus;
      diagnostics.responseSummary = diagnostics.fallbackFetchPath.bodySummary;

      if (
        classified.diagnosticStatus === "UTR_RESULTS_SUCCESS" ||
        classified.diagnosticStatus === "UTR_RESULTS_EMPTY"
      ) {
        return {
          ok: true,
          payload: fallbackPayload,
          matchesRead,
          diagnosticStatus: classified.diagnosticStatus,
          diagnostics,
        };
      }

      return {
        ok: false,
        auth: classified.auth,
        message: classified.message,
        diagnosticStatus: classified.diagnosticStatus,
        diagnostics,
      };
    }

    const classified = classifyAcquisition({
      signInGateVisible: diagnostics.signInGateVisible,
      profileLoaded: diagnostics.profileLoaded,
      pageRequestObserved: diagnostics.pageRequestPath.observed,
      pageRequestStatus: diagnostics.pageRequestPath.httpStatus,
      pageRequestJsonCaptured: diagnostics.pageRequestPath.jsonCaptured,
      pageRequestBodySummary: diagnostics.pageRequestPath.bodySummary,
      fallbackAttempted: true,
      fallbackStatus: pageResult.status,
      fallbackJsonCaptured: false,
      fallbackBodySummary: diagnostics.fallbackFetchPath.bodySummary,
      matchesRead: 0,
    });

    diagnostics.diagnosticStatus = classified.diagnosticStatus;
    diagnostics.responseSummary =
      diagnostics.fallbackFetchPath.bodySummary ??
      diagnostics.pageRequestPath.bodySummary ??
      classified.message;

    return {
      ok: false,
      auth: classified.auth,
      message: classified.message,
      diagnosticStatus: classified.diagnosticStatus,
      diagnostics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Page load failed.";
    const auth = isAuthFailure(0, message) || /sign in|log in|login/i.test(message);
    const classified = classifyAcquisition({
      navigationError: message,
      signInGateVisible: diagnostics.signInGateVisible,
      profileLoaded: diagnostics.profileLoaded,
      pageRequestObserved: diagnostics.pageRequestPath.observed,
      fallbackAttempted: diagnostics.fallbackFetchPath.attempted,
      matchesRead: 0,
    });
    diagnostics.diagnosticStatus = classified.diagnosticStatus;
    diagnostics.responseSummary = message;
    return {
      ok: false,
      auth: auth || classified.auth,
      message,
      diagnosticStatus: classified.diagnosticStatus,
      diagnostics,
    };
  } finally {
    page.off("response", onResponse);
    if (isDebugBrowser()) {
      console.log(
        `Debug browser: leaving Isaac page visible for ${DEBUG_BROWSER_CLOSE_DELAY_MS}ms`,
      );
      await page.waitForTimeout(DEBUG_BROWSER_CLOSE_DELAY_MS);
    }
    await page.close();
  }
}

export function preflightRecruitCheck(recruit: AgentRecruitInput): AgentRecruitResult | null {
  if (!recruit.utrPlayerId?.trim()) {
    return {
      recruitPersonId: recruit.recruitPersonId,
      displayName: recruit.displayName,
      utrPlayerId: recruit.utrPlayerId,
      status: "NOT_CONFIGURED",
      errorCode: "UTR_PROFILE_NOT_CONFIGURED",
      errorMessage: "UTR profile not configured for this recruit.",
      matchesRead: 0,
      diagnosticStatus: "UTR_PROFILE_NOT_CONFIGURED",
    };
  }
  return null;
}

function mapDiagnosticToExternalStatus(
  diagnosticStatus: UtrDiagnosticStatus,
): AgentRecruitResult["status"] {
  switch (diagnosticStatus) {
    case "AUTH_REQUIRED":
      return "AUTH_REQUIRED";
    case "UTR_PAGE_LOAD_FAILED":
      return "UTR_PAGE_LOAD_FAILED";
    case "UTR_PROFILE_NOT_CONFIGURED":
      return "NOT_CONFIGURED";
    case "UTR_RESULTS_SUCCESS":
    case "UTR_RESULTS_EMPTY":
      return "OK";
    default:
      return "UTR_RESULTS_FAILED";
  }
}

function mapDiagnosticToErrorCode(
  diagnosticStatus: UtrDiagnosticStatus,
): AgentRecruitResult["errorCode"] {
  switch (diagnosticStatus) {
    case "AUTH_REQUIRED":
      return "AUTH_REQUIRED";
    case "UTR_PAGE_LOAD_FAILED":
      return "UTR_PAGE_LOAD_FAILED";
    case "UTR_PROFILE_NOT_CONFIGURED":
      return "UTR_PROFILE_NOT_CONFIGURED";
    case "UTR_RESULTS_HTTP_ERROR":
      return "UTR_RESULTS_HTTP_ERROR";
    case "UTR_RESULTS_PARSE_FAILED":
      return "UTR_RESULTS_PARSE_FAILED";
    case "PROFILE_LOADED_RESULTS_REQUEST_NOT_SEEN":
      return "PROFILE_LOADED_RESULTS_REQUEST_NOT_SEEN";
    case "UTR_RESULTS_EMPTY":
      return "UTR_RESULTS_EMPTY";
    default:
      return "UTR_RESULTS_FAILED";
  }
}

export async function checkRecruit(
  context: BrowserContext,
  recruit: AgentRecruitInput,
): Promise<AgentRecruitResult> {
  const base: AgentRecruitResult = {
    recruitPersonId: recruit.recruitPersonId,
    displayName: recruit.displayName,
    utrPlayerId: recruit.utrPlayerId,
    status: "UTR_RESULTS_FAILED",
    matchesRead: 0,
    diagnosticStatus: "UTR_RESULTS_FAILED",
  };

  const preflight = preflightRecruitCheck(recruit);
  if (preflight) {
    return preflight;
  }

  const playerId = recruit.utrPlayerId!.trim();
  const sourceUrl = `https://app.utrsports.net/profiles/${playerId}?t=2`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const result = await fetchResultsViaPage(
      context,
      playerId,
      sourceUrl,
      recruit.displayName,
    );

    if (result.ok) {
      return {
        ...base,
        status: "OK",
        utrPlayerId: playerId,
        sourceUrl,
        payload: result.payload,
        matchesRead: result.matchesRead,
        diagnosticStatus: result.diagnosticStatus,
        diagnostics: result.diagnostics,
      };
    }

    if (result.auth) {
      return {
        ...base,
        status: "AUTH_REQUIRED",
        errorCode: "AUTH_REQUIRED",
        errorMessage: result.message,
        sourceUrl,
        diagnosticStatus: result.diagnosticStatus,
        diagnostics: result.diagnostics,
      };
    }

    if (attempt === MAX_RETRIES) {
      return {
        ...base,
        status: mapDiagnosticToExternalStatus(result.diagnosticStatus),
        errorCode: mapDiagnosticToErrorCode(result.diagnosticStatus),
        errorMessage: result.message,
        sourceUrl,
        diagnosticStatus: result.diagnosticStatus,
        diagnostics: result.diagnostics,
      };
    }
  }

  return base;
}
