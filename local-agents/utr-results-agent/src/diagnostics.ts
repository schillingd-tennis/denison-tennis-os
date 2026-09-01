import type { RecruitCheckDiagnostics, UtrDiagnosticStatus } from "./types.js";

const REDACT_PATTERNS = [
  /authorization/i,
  /cookie/i,
  /jwt/i,
  /bearer\s+/i,
  /password/i,
  /set-cookie/i,
  /access_token/i,
  /refresh_token/i,
  /id_token/i,
  /sessionid/i,
];

const SENSITIVE_QUERY_KEY = /token|auth|key|session|jwt|bearer|password|secret/i;

export function sanitizeRequestUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEY.test(key)) {
        parsed.searchParams.set(key, "[redacted]");
      }
    }
    return parsed.toString();
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export function sanitizeResponseBody(text: string, maxLen = 300): string {
  let sanitized = text
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [redacted]")
    .replace(/"access_token"\s*:\s*"[^"]+"/gi, '"access_token":"[redacted]"')
    .replace(/"refresh_token"\s*:\s*"[^"]+"/gi, '"refresh_token":"[redacted]"')
    .replace(/"id_token"\s*:\s*"[^"]+"/gi, '"id_token":"[redacted]"')
    .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"[redacted]"')
    .trim();

  if (REDACT_PATTERNS.some((pattern) => pattern.test(sanitized))) {
    return "[redacted]";
  }

  return sanitized.length > maxLen ? `${sanitized.slice(0, maxLen)}…` : sanitized;
}

export function summarizeResponseBody(text: string): string {
  try {
    const json = JSON.parse(text) as { message?: unknown; error?: unknown; title?: unknown };
    if (typeof json.message === "string" && json.message.trim()) {
      return sanitizeResponseBody(json.message);
    }
    if (typeof json.error === "string" && json.error.trim()) {
      return sanitizeResponseBody(json.error);
    }
    if (typeof json.title === "string" && json.title.trim()) {
      return sanitizeResponseBody(json.title);
    }
  } catch {
    // fall through to raw summary
  }
  return sanitizeResponseBody(text);
}

export function isAuthFailure(status: number, bodyText: string): boolean {
  if (status === 401 || status === 403) return true;
  const lower = bodyText.toLowerCase();
  if (status === 400 && lower.includes("token")) return true;
  if (lower.includes("not authorized") || lower.includes("sign in")) return true;
  return false;
}

export function suggestsBearerTokenRequired(bodySummary: string): boolean {
  const lower = bodySummary.toLowerCase();
  return (
    lower.includes("token is missing") ||
    lower.includes("missing token") ||
    lower.includes("authorization bearer") ||
    lower.includes("bearer token")
  );
}

export type AcquisitionClassificationInput = {
  navigationError?: string;
  signInGateVisible: boolean;
  profileLoaded: boolean;
  pageRequestObserved: boolean;
  pageRequestStatus?: number;
  pageRequestJsonCaptured?: boolean;
  pageRequestBodySummary?: string;
  fallbackAttempted: boolean;
  fallbackStatus?: number;
  fallbackJsonCaptured?: boolean;
  fallbackBodySummary?: string;
  matchesRead: number;
};

export function classifyAcquisition(input: AcquisitionClassificationInput): {
  diagnosticStatus: UtrDiagnosticStatus;
  auth: boolean;
  message: string;
} {
  if (input.navigationError) {
    const auth = /sign in|log in|login/i.test(input.navigationError);
    return {
      diagnosticStatus: auth ? "AUTH_REQUIRED" : "UTR_PAGE_LOAD_FAILED",
      auth,
      message: input.navigationError,
    };
  }

  if (input.signInGateVisible) {
    return {
      diagnosticStatus: "AUTH_REQUIRED",
      auth: true,
      message: "UTR sign-in gate visible on profile page.",
    };
  }

  if (input.pageRequestObserved) {
    const status = input.pageRequestStatus ?? 0;
    const bodySummary = input.pageRequestBodySummary ?? "";

    if (isAuthFailure(status, bodySummary)) {
      return {
        diagnosticStatus: "AUTH_REQUIRED",
        auth: true,
        message: bodySummary || "UTR session expired or not signed in.",
      };
    }

    if (!input.pageRequestJsonCaptured) {
      if (status >= 400) {
        const bearerHint = suggestsBearerTokenRequired(bodySummary)
          ? " UTR frontend may require a programmatic Bearer token."
          : "";
        return {
          diagnosticStatus: "UTR_RESULTS_HTTP_ERROR",
          auth: false,
          message: `Page results request HTTP ${status}: ${bodySummary || "No body summary."}${bearerHint}`,
        };
      }
      return {
        diagnosticStatus: "UTR_RESULTS_PARSE_FAILED",
        auth: false,
        message: bodySummary || "Page results request returned invalid JSON.",
      };
    }

    if (status >= 400) {
      const bearerHint = suggestsBearerTokenRequired(bodySummary)
        ? " UTR frontend may require a programmatic Bearer token."
        : "";
      return {
        diagnosticStatus: "UTR_RESULTS_HTTP_ERROR",
        auth: false,
        message: `Page results request HTTP ${status}: ${bodySummary || "No body summary."}${bearerHint}`,
      };
    }

    if (input.matchesRead === 0) {
      return {
        diagnosticStatus: "UTR_RESULTS_EMPTY",
        auth: false,
        message: "Results API returned successfully with zero matches.",
      };
    }

    return {
      diagnosticStatus: "UTR_RESULTS_SUCCESS",
      auth: false,
      message: "Results captured from page request path.",
    };
  }

  if (input.fallbackAttempted) {
    const status = input.fallbackStatus ?? 0;
    const bodySummary = input.fallbackBodySummary ?? "";

    if (isAuthFailure(status, bodySummary)) {
      return {
        diagnosticStatus: "AUTH_REQUIRED",
        auth: true,
        message: bodySummary || "Fallback fetch indicates UTR auth is required.",
      };
    }

    if (!input.fallbackJsonCaptured) {
      if (status >= 400) {
        const bearerHint = suggestsBearerTokenRequired(bodySummary)
          ? " Plain credentials:include fetch may be insufficient if UTR adds Bearer tokens in the frontend."
          : "";
        return {
          diagnosticStatus: "UTR_RESULTS_HTTP_ERROR",
          auth: false,
          message: `Fallback fetch HTTP ${status}: ${bodySummary || "No body summary."}${bearerHint}`,
        };
      }
      return {
        diagnosticStatus: "UTR_RESULTS_PARSE_FAILED",
        auth: false,
        message: bodySummary || "Fallback fetch returned invalid JSON.",
      };
    }

    if (status >= 400) {
      const bearerHint = suggestsBearerTokenRequired(bodySummary)
        ? " Plain credentials:include fetch may be insufficient if UTR adds Bearer tokens in the frontend."
        : "";
      return {
        diagnosticStatus: "UTR_RESULTS_HTTP_ERROR",
        auth: false,
        message: `Fallback fetch HTTP ${status}: ${bodySummary || "No body summary."}${bearerHint}`,
      };
    }

    if (input.matchesRead === 0) {
      return {
        diagnosticStatus: "UTR_RESULTS_EMPTY",
        auth: false,
        message: "Fallback fetch returned successfully with zero matches.",
      };
    }

    return {
      diagnosticStatus: "UTR_RESULTS_SUCCESS",
      auth: false,
      message: "Results captured from fallback fetch path.",
    };
  }

  if (input.profileLoaded) {
    return {
      diagnosticStatus: "PROFILE_LOADED_RESULTS_REQUEST_NOT_SEEN",
      auth: false,
      message: "Profile page loaded but no v4/player results API request was observed.",
    };
  }

  return {
    diagnosticStatus: "UTR_PAGE_LOAD_FAILED",
    auth: false,
    message: "Profile page did not load successfully.",
  };
}

export function printRecruitDiagnosticSummary(
  displayName: string,
  diagnostics: RecruitCheckDiagnostics,
): void {
  const lines = [
    `[${displayName}]`,
    `Profile loaded: ${diagnostics.profileLoaded ? "yes" : "no"}`,
    `Logged-in profile visible: ${diagnostics.loggedInProfileVisible ? "yes" : "no"}`,
    `Sign-in gate visible: ${diagnostics.signInGateVisible ? "yes" : "no"}`,
    `Profile name visible: ${diagnostics.profileNameVisible ? "yes" : "no"}`,
    `Results tab/page visible: ${diagnostics.resultsTabVisible ? "yes" : "no"}`,
    `Results request observed: ${diagnostics.pageRequestPath.observed ? "yes" : "no"}`,
  ];

  if (diagnostics.pageRequestPath.observed) {
    lines.push(`Results HTTP status: ${diagnostics.pageRequestPath.httpStatus ?? "unknown"}`);
    if (diagnostics.pageRequestPath.contentType) {
      lines.push(`Results content-type: ${diagnostics.pageRequestPath.contentType}`);
    }
    if (diagnostics.pageRequestPath.bodySummary) {
      lines.push(`Page path response: ${diagnostics.pageRequestPath.bodySummary}`);
    }
  }

  lines.push(`Fallback attempted: ${diagnostics.fallbackFetchPath.attempted ? "yes" : "no"}`);
  if (diagnostics.fallbackFetchPath.attempted) {
    lines.push(`Fallback HTTP status: ${diagnostics.fallbackFetchPath.httpStatus ?? "unknown"}`);
    if (diagnostics.fallbackFetchPath.bodySummary) {
      lines.push(`Fallback response: ${diagnostics.fallbackFetchPath.bodySummary}`);
    }
  }

  if (diagnostics.diagnosticStatus) {
    lines.push(`Failure: ${diagnostics.diagnosticStatus}`);
  }
  if (diagnostics.responseSummary) {
    lines.push(`Response: ${diagnostics.responseSummary}`);
  }

  console.log(lines.join("\n"));
}
