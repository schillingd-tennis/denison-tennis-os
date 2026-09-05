/**
 * Merge result, cadence, and tournament contact opportunities (Today Beta v0.1).
 */
import { CONTACT_OPPORTUNITY_THRESHOLDS } from "./contactOpportunityConfig";
import { CADENCE_CONTACT_TODAY_MIN_SCORE } from "./contactCadenceConfig";
import type { CadenceOpportunity } from "./contactCadenceScore";
import type {
  ContactOpportunity,
  ContactOpportunityScoreFactor,
  ContactOpportunityType,
} from "./contactOpportunityScore";
import {
  buildContactSuggestedText,
  recruitFirstNameFromDisplay,
} from "./suggestedText";
import { UPCOMING_TOURNAMENT_CONTACT_TODAY_MIN_SCORE } from "./upcomingTournamentConfig";
import type { TournamentOpportunity } from "./upcomingTournamentScore";
import type { RecruitMatchResult } from "./types";

export function contactOpportunityTypeLabel(types: readonly ContactOpportunityType[]): string {
  const labels: string[] = [];
  if (types.includes("RESULT")) labels.push("Result");
  if (types.includes("CADENCE")) labels.push("Cadence");
  if (types.includes("TOURNAMENT")) labels.push("Tournament");
  return labels.length > 0 ? labels.join(" + ") : "Contact";
}

function mergeFactors(
  ...factorGroups: ContactOpportunityScoreFactor[][]
): ContactOpportunityScoreFactor[] {
  const seen = new Set<string>();
  const merged: ContactOpportunityScoreFactor[] = [];

  for (const factor of factorGroups.flat()) {
    if (seen.has(factor.key)) continue;
    seen.add(factor.key);
    merged.push(factor);
  }

  return merged;
}

export function mergeContactOpportunities(input: {
  recruitPersonId: string;
  recruitName: string;
  recruitFirstName?: string;
  recruitPriorityLabel: string | null;
  recruitTier?: 1 | 2 | 3 | 4 | 5;
  daysSinceLastContact: number | null;
  lastContactDateLabel?: string | null;
  resultOpportunity: ContactOpportunity | null;
  cadenceOpportunity: CadenceOpportunity | null;
  tournamentOpportunity: TournamentOpportunity | null;
  newMatchResults?: readonly RecruitMatchResult[];
}): ContactOpportunity | null {
  const resultScore = input.resultOpportunity?.resultScore ?? null;
  const cadenceScore = input.cadenceOpportunity?.cadenceScore ?? null;
  const tournamentScore = input.tournamentOpportunity?.tournamentScore ?? null;
  const resultQualifies =
    resultScore != null && resultScore >= CONTACT_OPPORTUNITY_THRESHOLDS.contactTodayMinScore;
  const cadenceQualifies =
    cadenceScore != null && cadenceScore >= CADENCE_CONTACT_TODAY_MIN_SCORE;
  const tournamentQualifies =
    tournamentScore != null && tournamentScore >= UPCOMING_TOURNAMENT_CONTACT_TODAY_MIN_SCORE;

  if (!resultQualifies && !cadenceQualifies && !tournamentQualifies) {
    return null;
  }

  const opportunityTypes: ContactOpportunityType[] = [];
  if (resultQualifies) opportunityTypes.push("RESULT");
  if (cadenceQualifies) opportunityTypes.push("CADENCE");
  if (tournamentQualifies) opportunityTypes.push("TOURNAMENT");

  const overallScore = Math.max(resultScore ?? 0, cadenceScore ?? 0, tournamentScore ?? 0);
  const resultFactors = resultQualifies ? (input.resultOpportunity?.factors ?? []) : [];
  const cadenceFactors = cadenceQualifies ? (input.cadenceOpportunity?.factors ?? []) : [];
  const tournamentFactors = tournamentQualifies ? (input.tournamentOpportunity?.factors ?? []) : [];

  const matchResult = input.resultOpportunity?.matchResult;
  const upcomingTournament = input.tournamentOpportunity?.upcomingTournament;
  const daysUntilTournamentStart = input.tournamentOpportunity?.daysUntilStart ?? null;
  const hasCadence = cadenceQualifies;
  const hasTournament = tournamentQualifies;
  const suggested = buildContactSuggestedText({
    recruitFirstName:
      input.recruitFirstName ?? recruitFirstNameFromDisplay(input.recruitName),
    matchResult,
    newMatchResults: input.newMatchResults,
    hasCadence,
    daysSinceLastContact: input.daysSinceLastContact,
    hasTournament,
    daysUntilTournamentStart,
  });

  return {
    recruitPersonId: input.recruitPersonId,
    recruitName: input.recruitName,
    recruitPriorityLabel: input.recruitPriorityLabel,
    recruitTier: input.recruitTier,
    opportunityTypes,
    opportunityTypeLabel: contactOpportunityTypeLabel(opportunityTypes),
    opportunityScore: overallScore,
    resultScore: resultQualifies ? resultScore : null,
    cadenceScore: cadenceQualifies ? cadenceScore : null,
    tournamentScore: tournamentQualifies ? tournamentScore : null,
    daysSinceLastContact: input.daysSinceLastContact,
    lastContactDateLabel: input.lastContactDateLabel ?? null,
    matchResult,
    upcomingTournament,
    daysUntilTournamentStart,
    factors: mergeFactors(resultFactors, cadenceFactors, tournamentFactors),
    suggestedText: suggested.text,
    suggestedTextCategory: suggested.category,
  };
}
