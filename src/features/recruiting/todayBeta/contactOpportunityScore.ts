/**
 * Contact opportunity scoring for Today Beta v0.1 (derived, not persisted).
 */
import type { LookupRef } from "@/features/lookups/types";

import {
  CONTACT_OPPORTUNITY_WEIGHTS,
  PRIORITY_A_KEYS,
  PRIORITY_B_KEYS,
} from "./contactOpportunityConfig";
import type { MatchResultOutcome, RecruitMatchResult, RecruitUpcomingTournament } from "./types";

export type ContactOpportunityScoreFactor = {
  key: string;
  points: number;
  reason: string;
};

export type ContactOpportunityType = "RESULT" | "CADENCE" | "TOURNAMENT";

export type ContactOpportunity = {
  recruitPersonId: string;
  recruitName: string;
  recruitPriorityLabel: string | null;
  /** Coach Rank Board tier 1–5; omitted/undefined = unassigned. */
  recruitTier?: 1 | 2 | 3 | 4 | 5;
  opportunityTypes: ContactOpportunityType[];
  opportunityTypeLabel: string;
  /** Overall score = max(resultScore, cadenceScore, tournamentScore). */
  opportunityScore: number;
  resultScore: number | null;
  cadenceScore: number | null;
  tournamentScore: number | null;
  daysSinceLastContact: number | null;
  lastContactDateLabel?: string | null;
  matchResult?: RecruitMatchResult;
  upcomingTournament?: RecruitUpcomingTournament;
  daysUntilTournamentStart?: number | null;
  factors: ContactOpportunityScoreFactor[];
  suggestedText: string | null;
  suggestedTextCategory: string | null;
};

function parseOpponentRank(value: string | undefined): number | null {
  if (!value || value.trim().toUpperCase() === "UNKNOWN") return null;
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const rank = Number.parseInt(digits, 10);
  return Number.isFinite(rank) && rank > 0 ? rank : null;
}

function scoreWin(result: MatchResultOutcome): ContactOpportunityScoreFactor | null {
  if (result !== "WIN") return null;
  return {
    key: "result_win",
    points: CONTACT_OPPORTUNITY_WEIGHTS.result.win,
    reason: "Recent win",
  };
}

function scoreOpponentRank(ranking: string | undefined): ContactOpportunityScoreFactor | null {
  const rank = parseOpponentRank(ranking);
  if (rank == null) return null;

  const { opponentRank } = CONTACT_OPPORTUNITY_WEIGHTS;
  if (rank <= 100) {
    return {
      key: "opponent_top100",
      points: opponentRank.top100,
      reason: "Beat a Top 100 opponent",
    };
  }
  if (rank <= 200) {
    return {
      key: "opponent_top200",
      points: opponentRank.rank101to200,
      reason: "Beat a Top 200 opponent",
    };
  }
  if (rank <= 300) {
    return {
      key: "opponent_top300",
      points: opponentRank.rank201to300,
      reason: "Beat a Top 300 opponent",
    };
  }
  return null;
}

function scoreRecruitPriority(priority?: LookupRef): ContactOpportunityScoreFactor | null {
  const key = priority?.key;
  if (!key) return null;

  const { recruitPriority } = CONTACT_OPPORTUNITY_WEIGHTS;
  if (PRIORITY_A_KEYS.has(key)) {
    return {
      key: "priority_a",
      points: recruitPriority.priorityA,
      reason: "Priority A recruit",
    };
  }
  if (PRIORITY_B_KEYS.has(key)) {
    return {
      key: "priority_b",
      points: recruitPriority.priorityB,
      reason: "Priority B recruit",
    };
  }
  return null;
}

function scoreLastContact(daysSince: number | null): ContactOpportunityScoreFactor | null {
  if (daysSince == null) return null;

  const { lastContact } = CONTACT_OPPORTUNITY_WEIGHTS;
  if (daysSince >= 14) {
    return {
      key: "last_contact_14_plus",
      points: lastContact.days14Plus,
      reason: `${daysSince} days since last contact`,
    };
  }
  if (daysSince >= 7) {
    return {
      key: "last_contact_7_13",
      points: lastContact.days7to13,
      reason: `${daysSince} days since last contact`,
    };
  }
  return null;
}

function scoreNewResult(
  detectionStatus: RecruitMatchResult["detectionStatus"],
): ContactOpportunityScoreFactor | null {
  if (detectionStatus !== "NEW") return null;

  return {
    key: "new_result",
    points: CONTACT_OPPORTUNITY_WEIGHTS.newResult.within48Hours,
    reason: "New result",
  };
}

export function scoreMatchResultOpportunity(input: {
  matchResult: RecruitMatchResult;
  priority?: LookupRef;
  daysSinceLastContact: number | null;
  now?: Date;
}): { score: number; factors: ContactOpportunityScoreFactor[] } {
  const factors = [
    scoreWin(input.matchResult.result),
    input.matchResult.result === "WIN" ? scoreOpponentRank(input.matchResult.opponentRanking) : null,
    scoreRecruitPriority(input.priority),
    scoreLastContact(input.daysSinceLastContact),
    scoreNewResult(input.matchResult.detectionStatus),
  ].filter((factor): factor is ContactOpportunityScoreFactor => factor != null);

  const score = factors.reduce((total, factor) => total + factor.points, 0);
  return { score, factors };
}

export function buildContactOpportunities(input: {
  recruitPersonId: string;
  recruitName: string;
  priority?: LookupRef;
  daysSinceLastContact: number | null;
  matchResults: RecruitMatchResult[];
  now?: Date;
}): ContactOpportunity | null {
  const eligibleResults = input.matchResults.filter(
    (result) => result.detectionStatus === "NEW",
  );
  if (eligibleResults.length === 0) return null;

  const now = input.now ?? new Date();
  let best: {
    matchResult: RecruitMatchResult;
    score: number;
    factors: ContactOpportunityScoreFactor[];
  } | null = null;

  for (const matchResult of eligibleResults) {
    const scored = scoreMatchResultOpportunity({
      matchResult,
      priority: input.priority,
      daysSinceLastContact: input.daysSinceLastContact,
      now,
    });

    if (
      !best ||
      scored.score > best.score ||
      (scored.score === best.score &&
        Date.parse(matchResult.firstDetectedAt) > Date.parse(best.matchResult.firstDetectedAt))
    ) {
      best = { matchResult, ...scored };
    }
  }

  if (!best) return null;

  return {
    recruitPersonId: input.recruitPersonId,
    recruitName: input.recruitName,
    recruitPriorityLabel: input.priority?.label ?? null,
    opportunityTypes: ["RESULT"],
    opportunityTypeLabel: "Result",
    opportunityScore: best.score,
    resultScore: best.score,
    cadenceScore: null,
    tournamentScore: null,
    daysSinceLastContact: input.daysSinceLastContact,
    lastContactDateLabel: null,
    matchResult: best.matchResult,
    factors: best.factors,
    suggestedText: null,
    suggestedTextCategory: null,
  };
}
