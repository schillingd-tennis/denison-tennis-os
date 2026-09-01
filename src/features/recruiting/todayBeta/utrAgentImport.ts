import type { UtrApiResultsPayload } from "./normalizeUtrCapture";
import { normalizeUtrApiResults } from "./normalizeUtrCapture";
import {
  recordUtrAgentRecruitOutcome,
  saveUtrCapturedResults,
  TodayBetaRepositoryError,
} from "./repository";
import type { SaveMatchResultsOutcome, UtrCapturedMatch } from "./types";
import {
  countImportableUtrPayloadMatches,
  countRawUtrPayloadMatches,
  isUtrResultsPayload,
} from "./utrPayloadDiagnostics";
import {
  filterUtrResultsPayload,
} from "./utrPayloadWindow";

export type UtrAgentImportRecruitOutcome = {
  recruitPersonId: string;
  displayName: string;
  acquisitionStatus: string;
  importOutcome?: SaveMatchResultsOutcome;
  agentCheckStatus: "Checked" | "New Results" | "Needs Review" | "Failed" | "Not Configured" | "Auth Required";
  errorCode?: string;
  errorMessage?: string;
};

export function validateUtrAgentImportPayload(input: {
  status: string;
  matchesRead?: number;
  payload?: unknown;
  utrPlayerId?: string;
}):
  | { ok: true; payload: UtrApiResultsPayload; importableMatchCount: number }
  | { ok: false; errorCode: string; errorMessage: string } {
  if (input.status !== "OK" || !input.payload || !input.utrPlayerId) {
    return {
      ok: false,
      errorCode: "UTR_RESULTS_FAILED",
      errorMessage: "UTR acquisition did not return importable results.",
    };
  }

  if (!isUtrResultsPayload(input.payload)) {
    return {
      ok: false,
      errorCode: "IMPORT_PAYLOAD_MISSING",
      errorMessage:
        "UTR agent returned a summary without importable match payload. Re-run after confirming UTR login.",
    };
  }

  const matchesRead = input.matchesRead ?? 0;
  const rawMatchCount = countRawUtrPayloadMatches(input.payload);
  const importableMatchCount = countImportableUtrPayloadMatches(input.payload);

  if (matchesRead > 0 && rawMatchCount === 0) {
    return {
      ok: false,
      errorCode: "IMPORT_PAYLOAD_MISSING",
      errorMessage:
        "UTR agent reported matches acquired, but no importable match payload reached Denison OS.",
    };
  }

  return { ok: true, payload: input.payload, importableMatchCount };
}

export async function importUtrAgentRecruitPayload(input: {
  recruitPersonId: string;
  utrPlayerId: string;
  recruitName: string;
  sourceUrl: string;
  payload: UtrApiResultsPayload;
}): Promise<SaveMatchResultsOutcome> {
  const filteredPayload = filterUtrResultsPayload(input.payload);

  const matches: UtrCapturedMatch[] = normalizeUtrApiResults({
    payload: filteredPayload,
    recruitPersonId: input.recruitPersonId,
    utrPlayerId: input.utrPlayerId,
    recruitName: input.recruitName,
  }).map((row) => ({
    source: "UTR" as const,
    recruitName: row.recruitName,
    utrPlayerId: row.utrPlayerId,
    tournamentName: row.tournamentName,
    matchDate: row.matchDate,
    round: row.round,
    opponentName: row.opponentName,
    recruitUtr: row.recruitUtr,
    opponentUtr: row.opponentUtr,
    score: row.score,
    result: row.result,
    matchStatus: row.matchStatus,
    externalMatchId: row.externalMatchId,
    tournamentUrl: row.tournamentUrl,
    needsReview: row.needsReview,
    parseWarnings: row.warnings,
  }));

  return saveUtrCapturedResults({
    recruitPersonId: input.recruitPersonId,
    utrPlayerId: input.utrPlayerId,
    sourceUrl: input.sourceUrl,
    matches,
  });
}

export async function processUtrAgentRecruitResult(input: {
  recruitPersonId: string;
  displayName: string;
  utrPlayerId?: string;
  status: string;
  matchesRead?: number;
  errorCode?: string;
  errorMessage?: string;
  sourceUrl?: string;
  payload?: unknown;
}): Promise<UtrAgentImportRecruitOutcome> {
  if (input.status === "NOT_CONFIGURED") {
    await recordUtrAgentRecruitOutcome({
      recruitPersonId: input.recruitPersonId,
      status: "Not Configured",
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
    });
    return {
      recruitPersonId: input.recruitPersonId,
      displayName: input.displayName,
      acquisitionStatus: input.status,
      agentCheckStatus: "Not Configured",
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
    };
  }

  if (input.status === "AUTH_REQUIRED") {
    await recordUtrAgentRecruitOutcome({
      recruitPersonId: input.recruitPersonId,
      status: "Auth Required",
      errorCode: "AUTH_REQUIRED",
      errorMessage: input.errorMessage,
    });
    return {
      recruitPersonId: input.recruitPersonId,
      displayName: input.displayName,
      acquisitionStatus: input.status,
      agentCheckStatus: "Auth Required",
      errorCode: "AUTH_REQUIRED",
      errorMessage: input.errorMessage,
    };
  }

  if (input.status !== "OK" || !input.payload || !input.utrPlayerId) {
    await recordUtrAgentRecruitOutcome({
      recruitPersonId: input.recruitPersonId,
      status: "Failed",
      errorCode: input.errorCode ?? "UTR_RESULTS_FAILED",
      errorMessage: input.errorMessage,
      touchLastCheckAt: false,
    });
    return {
      recruitPersonId: input.recruitPersonId,
      displayName: input.displayName,
      acquisitionStatus: input.status,
      agentCheckStatus: "Failed",
      errorCode: input.errorCode ?? "UTR_RESULTS_FAILED",
      errorMessage: input.errorMessage,
    };
  }

  const validation = validateUtrAgentImportPayload(input);
  if (!validation.ok) {
    await recordUtrAgentRecruitOutcome({
      recruitPersonId: input.recruitPersonId,
      status: "Failed",
      errorCode: validation.errorCode,
      errorMessage: validation.errorMessage,
      touchLastCheckAt: false,
    });
    return {
      recruitPersonId: input.recruitPersonId,
      displayName: input.displayName,
      acquisitionStatus: input.status,
      agentCheckStatus: "Failed",
      errorCode: validation.errorCode,
      errorMessage: validation.errorMessage,
    };
  }

  const matchesRead = input.matchesRead ?? 0;
  const importableMatchCount = validation.importableMatchCount;

  try {
    const importOutcome = await importUtrAgentRecruitPayload({
      recruitPersonId: input.recruitPersonId,
      utrPlayerId: input.utrPlayerId,
      recruitName: input.displayName,
      sourceUrl: input.sourceUrl ?? `https://app.utrsports.net/profiles/${input.utrPlayerId}?t=2`,
      payload: validation.payload,
    });

    if (matchesRead > 0 && importableMatchCount > 0 && importOutcome.found === 0) {
      const message =
        "UTR matches were acquired but none were available to import after normalization.";
      await recordUtrAgentRecruitOutcome({
        recruitPersonId: input.recruitPersonId,
        status: "Failed",
        errorCode: "IMPORT_PAYLOAD_MISSING",
        errorMessage: message,
        touchLastCheckAt: false,
      });
      return {
        recruitPersonId: input.recruitPersonId,
        displayName: input.displayName,
        acquisitionStatus: input.status,
        agentCheckStatus: "Failed",
        errorCode: "IMPORT_PAYLOAD_MISSING",
        errorMessage: message,
      };
    }

    const agentCheckStatus: UtrAgentImportRecruitOutcome["agentCheckStatus"] =
      importOutcome.savedAsNew > 0
        ? "New Results"
        : importOutcome.needsReview > 0
          ? "Needs Review"
          : "Checked";

    await recordUtrAgentRecruitOutcome({
      recruitPersonId: input.recruitPersonId,
      status: agentCheckStatus,
    });

    return {
      recruitPersonId: input.recruitPersonId,
      displayName: input.displayName,
      acquisitionStatus: input.status,
      importOutcome,
      agentCheckStatus,
    };
  } catch (error) {
    const message =
      error instanceof TodayBetaRepositoryError ? error.message : "Denison import failed.";
    await recordUtrAgentRecruitOutcome({
      recruitPersonId: input.recruitPersonId,
      status: "Failed",
      errorCode: "DENISON_IMPORT_FAILED",
      errorMessage: message,
      touchLastCheckAt: false,
    });
    return {
      recruitPersonId: input.recruitPersonId,
      displayName: input.displayName,
      acquisitionStatus: input.status,
      agentCheckStatus: "Failed",
      errorCode: "DENISON_IMPORT_FAILED",
      errorMessage: message,
    };
  }
}
