import type { UtrApiResultsPayload } from "./normalizeUtrCapture";
import {
  countUtrPayloadMatches,
  filterUtrResultsPayload,
} from "./utrPayloadWindow";

export type UtrPayloadDiagnostics = {
  payloadPresent: boolean;
  payloadType: string;
  isValidUtrResults: boolean;
  topLevelKeys: string[];
  eventsCount: number;
  resultsCount: number;
  drawsCount: number;
  rawMatchCount: number;
  importableMatchCount: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** UTR API error envelopes parse as JSON but are not tennis results. */
export function isUtrApiErrorEnvelope(payload: unknown): boolean {
  const record = asRecord(payload);
  if (!record) return false;
  return (
    typeof record.StatusCode === "number" &&
    record.StatusCode >= 400 &&
    ("Message" in record || "DisplayMessage" in record)
  );
}

export function isUtrResultsPayload(payload: unknown): payload is UtrApiResultsPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  if (isUtrApiErrorEnvelope(payload)) return false;
  const events = (payload as UtrApiResultsPayload).events;
  return Array.isArray(events);
}

export function countRawUtrPayloadMatches(payload: UtrApiResultsPayload): number {
  return countUtrPayloadMatches(payload);
}

export function countImportableUtrPayloadMatches(payload: UtrApiResultsPayload): number {
  return countUtrPayloadMatches(filterUtrResultsPayload(payload));
}

export function summarizeUtrPayload(payload: unknown): UtrPayloadDiagnostics {
  const record = asRecord(payload);
  const topLevelKeys = record ? Object.keys(record).slice(0, 12) : [];
  const payloadType = payload === null ? "null" : Array.isArray(payload) ? "array" : typeof payload;
  const isValidUtrResults = isUtrResultsPayload(payload);
  let eventsCount = 0;
  let resultsCount = 0;
  let drawsCount = 0;
  let rawMatchCount = 0;
  let importableMatchCount = 0;

  if (isValidUtrResults) {
    eventsCount = payload.events?.length ?? 0;
    for (const event of payload.events ?? []) {
      resultsCount += event.results?.length ?? 0;
      drawsCount += event.draws?.length ?? 0;
    }
    rawMatchCount = countRawUtrPayloadMatches(payload);
    importableMatchCount = countImportableUtrPayloadMatches(payload);
  }

  return {
    payloadPresent: payload !== undefined && payload !== null,
    payloadType,
    isValidUtrResults,
    topLevelKeys,
    eventsCount,
    resultsCount,
    drawsCount,
    rawMatchCount,
    importableMatchCount,
  };
}
