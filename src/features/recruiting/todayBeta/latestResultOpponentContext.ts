/**
 * Opponent context for Today Beta Latest Results (batch-loaded, no table lookups).
 */
import { getDisplayName } from "@/features/people/utils";
import { parseDisplayDate } from "@/lib/formatting";

import type { Person } from "@/features/people/types";
import type { RecruitProfile } from "@/features/recruiting/types";
import { normalizeOpponentName } from "./crossSourceMatch";
import type { LatestResultEntry, RecruitMatchResult } from "./types";

export type LatestResultOpponentContext = LatestResultEntry["opponent"];

export type OpponentPersonLookup = {
  personId: string;
  trnRank?: number;
  recruitClassYear?: number;
};

export type OpponentPersonIndex = {
  byNormalizedName: Map<string, OpponentPersonLookup | "ambiguous">;
};

export function buildOpponentPersonIndex(input: {
  people: readonly Person[];
  profiles: readonly RecruitProfile[];
}): OpponentPersonIndex {
  const profileByPersonId = new Map(input.profiles.map((profile) => [profile.personId, profile]));
  const byNormalizedName = new Map<string, OpponentPersonLookup | "ambiguous">();

  for (const person of input.people) {
    const profile = profileByPersonId.get(person.id);
    const lookup: OpponentPersonLookup = {
      personId: person.id,
      trnRank: person.trnRank,
      recruitClassYear: profile?.recruitClassYear,
    };

    const nameVariants = new Set<string>();
    nameVariants.add(getDisplayName(person));
    nameVariants.add(`${person.firstName} ${person.lastName}`);
    if (person.preferredName?.trim()) {
      nameVariants.add(`${person.preferredName} ${person.lastName}`);
    }

    for (const name of nameVariants) {
      const key = normalizeOpponentName(name);
      if (!key) continue;

      const existing = byNormalizedName.get(key);
      if (existing === undefined) {
        byNormalizedName.set(key, lookup);
        continue;
      }
      if (existing === "ambiguous" || existing.personId !== lookup.personId) {
        byNormalizedName.set(key, "ambiguous");
      }
    }
  }

  return { byNormalizedName };
}

function lookupOpponentPerson(
  opponentName: string | undefined,
  index: OpponentPersonIndex,
): OpponentPersonLookup | null {
  const key = normalizeOpponentName(opponentName);
  if (!key) return null;

  const hit = index.byNormalizedName.get(key);
  if (!hit || hit === "ambiguous") return null;
  return hit;
}

function parseTrnRankFromResult(ranking?: string): string | null {
  if (!ranking?.trim() || ranking.trim().toUpperCase() === "UNKNOWN") return null;
  const digits = ranking.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `#${digits}`;
}

function formatPersonTrnRank(trnRank?: number): string | null {
  if (trnRank == null || !Number.isFinite(trnRank)) return null;
  return `#${trnRank}`;
}

export function formatLatestResultMatchDate(
  result: RecruitMatchResult,
  now: Date = new Date(),
): string {
  const raw = result.tournamentDate ?? result.tournamentDateRaw;
  if (!raw?.trim()) return "—";

  const date = parseDisplayDate(raw);
  if (!date) return raw.trim();

  const sameYear = date.getFullYear() === now.getFullYear();
  if (sameYear) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatLatestResultTrnRank(value: string | null | undefined): string {
  return value ?? "—";
}

export function formatLatestResultGradYear(value: number | null | undefined): string {
  return value != null ? String(value) : "—";
}

export function formatLatestResultUtr(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : "—";
}

export function buildLatestResultOpponentContext(input: {
  result: RecruitMatchResult;
  opponentIndex: OpponentPersonIndex;
  now?: Date;
}): LatestResultOpponentContext {
  const lookup = lookupOpponentPerson(input.result.opponentName, input.opponentIndex);

  const opponentTrnRank =
    parseTrnRankFromResult(input.result.opponentRanking) ??
    (lookup ? formatPersonTrnRank(lookup.trnRank) : null);

  const opponentGradYear = lookup?.recruitClassYear ?? null;

  const opponentUtr =
    input.result.ratingType === "UTR" && input.result.opponentRating?.trim()
      ? input.result.opponentRating.trim()
      : null;

  const recruitUtr =
    input.result.ratingType === "UTR" && input.result.recruitRating?.trim()
      ? input.result.recruitRating.trim()
      : null;

  return {
    opponentName: input.result.opponentName?.trim() || "Unknown",
    opponentTrnRank,
    opponentGradYear,
    opponentUtr,
    recruitUtr,
    matchDateLabel: formatLatestResultMatchDate(input.result, input.now),
  };
}

export function buildLatestResultEntry(input: {
  result: RecruitMatchResult;
  opponentIndex: OpponentPersonIndex;
  now?: Date;
}): LatestResultEntry {
  return {
    result: input.result,
    opponent: buildLatestResultOpponentContext(input),
  };
}

export function buildLatestResultEntries(input: {
  results: readonly RecruitMatchResult[];
  opponentIndex: OpponentPersonIndex;
  now?: Date;
}): LatestResultEntry[] {
  return input.results.map((result) =>
    buildLatestResultEntry({
      result,
      opponentIndex: input.opponentIndex,
      now: input.now,
    }),
  );
}
