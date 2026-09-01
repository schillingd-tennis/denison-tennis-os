/**
 * UTR profile URL helpers and external profile shape.
 */
import type { UtrExternalProfile } from "./types";

export function utrProfileUrl(playerId: string): string {
  return `https://app.utrsports.net/profiles/${playerId.trim()}`;
}

export function utrResultsUrl(playerId: string): string {
  return `${utrProfileUrl(playerId)}?t=2`;
}

export function parseUtrPlayerIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.includes("utrsports.net")) return null;
    const match = parsed.pathname.match(/\/profiles\/(\d+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function buildUtrExternalProfile(input: {
  playerId: string;
  existing?: UtrExternalProfile;
}): UtrExternalProfile {
  const playerId = input.playerId.trim();
  return {
    playerId,
    profileUrl: utrProfileUrl(playerId),
    resultsUrl: utrResultsUrl(playerId),
    lastCheckedAt: input.existing?.lastCheckedAt,
    lastImportedAt: input.existing?.lastImportedAt,
    lastCheckSavedNewCount: input.existing?.lastCheckSavedNewCount,
    baselineEstablishedAt: input.existing?.baselineEstablishedAt,
  };
}

export function applyCheckedNoNewToUtrProfile(
  utr: UtrExternalProfile,
  now: string,
): UtrExternalProfile {
  return {
    ...utr,
    lastCheckedAt: now,
    lastCheckSavedNewCount: 0,
  };
}

export function applyImportCheckToUtrProfile(
  utr: UtrExternalProfile,
  now: string,
  savedAsNew: number,
  baselineEstablishedAt?: string,
): UtrExternalProfile {
  return {
    ...utr,
    lastCheckedAt: now,
    lastImportedAt: now,
    lastCheckSavedNewCount: savedAsNew,
    baselineEstablishedAt: utr.baselineEstablishedAt ?? baselineEstablishedAt,
  };
}

/** Latest ISO timestamp from TRN and/or UTR check workflows. */
export function latestResultsCheckAt(
  trnCheckedAt?: string,
  utrCheckedAt?: string,
): string | undefined {
  const candidates = [trnCheckedAt, utrCheckedAt].filter(Boolean) as string[];
  if (candidates.length === 0) return undefined;
  return candidates.reduce((latest, current) =>
    Date.parse(current) > Date.parse(latest) ? current : latest,
  );
}

/** Combined new-result count from TRN + UTR during the most recent check day. */
export function combinedLastCheckSavedNewCount(
  trn?: { lastCheckSavedNewCount?: number },
  utr?: { lastCheckSavedNewCount?: number },
): number {
  return (trn?.lastCheckSavedNewCount ?? 0) + (utr?.lastCheckSavedNewCount ?? 0);
}
