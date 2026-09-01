/**
 * Today Beta repository — external TRN profiles + manual match results.
 */
import { buildInteractionSummary } from "@/features/interactions/contactSummary";
import { listRecruitInteractions } from "@/features/interactions/repository";
import { listPeople } from "@/features/people/repository";
import { getDisplayName, getDisplayFirstName } from "@/features/people/utils";
import { formatDate } from "@/lib/formatting";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { scoreCadenceOpportunity } from "./contactCadenceScore";
import {
  actionsByRecruitPersonId,
  filterActionableMatchResults,
  filterActionableTournaments,
  isCadenceOpportunitySnoozed,
  listContactOpportunityActions,
} from "./contactOpportunityActions";
import {
  buildContactOpportunities,
  type ContactOpportunity,
} from "./contactOpportunityScore";
import { CONTACT_OPPORTUNITY_THRESHOLDS } from "./contactOpportunityConfig";
import {
  filterNewResultsFeed,
  isBaselineEstablished,
  isEligibleForContactOpportunity,
  isNewlyDetectedResult,
  detectionStatusForImport,
  detectionStatusForUtrImportRow,
} from "./detectionStatus";
import { lastTextOrCallDateLabel } from "./lastContactLabel";
import { mergeContactOpportunities } from "./mergeContactOpportunities";
import {
  personNameMatchesConfig,
  TODAY_BETA_TEST_PLAYERS,
  type TodayBetaTestPlayerConfig,
} from "./config";
import {
  listAllMonitoredRecruits,
  isOnRankBoard,
} from "./monitoringCohort";
import { buildResultFingerprint } from "./fingerprint";
import {
  buildLatestResultEntries,
  buildOpponentPersonIndex,
} from "./latestResultOpponentContext";
import {
  recruitHasActivityInLastDays,
  sortLatestResultRows,
  sortResultsByRecency,
} from "./latestResults";
import {
  applyCheckedNoNewToTrnProfile,
  applyImportCheckToTrnProfile,
  buildActivitySummary,
  deriveCombinedMonitoringStatus,
  sortPlayersForMonitoringQueue,
} from "./resultsCheckStatus";
import { recruitFirstNameFromDisplay } from "./suggestedText";
import { normalizeTrnTournamentDate } from "./tournamentDate";
import { findCrossSourceMatch } from "./crossSourceMatch";
import {
  normalizeUtrCapturedMatches,
  type NormalizedUtrImportRow,
} from "./normalizeUtrCapture";
import {
  applyCheckedNoNewToUtrProfile,
  applyImportCheckToUtrProfile,
  buildUtrExternalProfile,
  latestResultsCheckAt,
  parseUtrPlayerIdFromUrl,
} from "./utrProfile";
import { listRecruitProfiles } from "../repository";
import type {
  MatchResultOutcome,
  RecruitExternalProfiles,
  RecruitMatchResult,
  RecruitUpcomingTournament,
  LatestResultRow,
  SaveMatchResultsInput,
  SaveMatchResultsOutcome,
  SaveUtrCapturedResultsInput,
  TodayBetaPageData,
  TodayBetaPlayerRow,
  UpcomingTournamentFeedRow,
  UtrAgentCheckStatus,
} from "./types";
import {
  listRecruitUpcomingTournaments,
  tournamentsByRecruitPersonId,
} from "./upcomingTournamentsRepository";
import {
  daysUntilTournamentStart,
  isTournamentExpired,
  selectNearestTournamentOpportunity,
} from "./upcomingTournamentScore";
import { UPCOMING_TOURNAMENT_DISPLAY_WINDOW_DAYS } from "./upcomingTournamentConfig";

export class TodayBetaRepositoryError extends Error {}

const RESULTS_TABLE = "recruit_match_results";
const PROFILES_TABLE = "recruit_profiles";

type MatchResultRow = {
  id: string;
  recruit_person_id: string;
  source: string;
  tournament_name: string | null;
  tournament_date: string | null;
  tournament_date_raw: string | null;
  round: string | null;
  opponent_name: string | null;
  opponent_ranking: string | null;
  score: string | null;
  result: MatchResultOutcome;
  source_url: string | null;
  tournament_url: string | null;
  first_detected_at: string;
  last_verified_at: string;
  detection_status: string;
  result_fingerprint: string;
  needs_review: boolean;
  parse_warnings: string[] | null;
  external_match_id: string | null;
  recruit_rating: string | null;
  opponent_rating: string | null;
  rating_type: string | null;
};

function undefinedIfNull<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined ? undefined : value;
}

function rowToMatchResult(row: MatchResultRow): RecruitMatchResult {
  return {
    id: row.id,
    recruitPersonId: row.recruit_person_id,
    source: row.source,
    tournamentName: undefinedIfNull(row.tournament_name),
    tournamentDate: undefinedIfNull(row.tournament_date),
    tournamentDateRaw: undefinedIfNull(row.tournament_date_raw),
    round: undefinedIfNull(row.round),
    opponentName: undefinedIfNull(row.opponent_name),
    opponentRanking: undefinedIfNull(row.opponent_ranking),
    score: undefinedIfNull(row.score),
    result: row.result,
    sourceUrl: undefinedIfNull(row.source_url),
    tournamentUrl: undefinedIfNull(row.tournament_url),
    firstDetectedAt: row.first_detected_at,
    lastVerifiedAt: row.last_verified_at,
    detectionStatus:
      row.detection_status === "BASELINE" || row.detection_status === "NEW"
        ? row.detection_status
        : "NEW",
    resultFingerprint: row.result_fingerprint,
    needsReview: row.needs_review,
    parseWarnings: row.parse_warnings ?? [],
    externalMatchId: undefinedIfNull(row.external_match_id),
    recruitRating: undefinedIfNull(row.recruit_rating),
    opponentRating: undefinedIfNull(row.opponent_rating),
    ratingType:
      row.rating_type === "UTR" || row.rating_type === "TRN"
        ? row.rating_type
        : undefined,
  };
}

function asExternalProfiles(value: unknown): RecruitExternalProfiles {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as RecruitExternalProfiles;
}

function normalizeDateForDb(value: string | undefined): string | null {
  if (!value || value.trim() === "" || value.trim().toUpperCase() === "UNKNOWN") {
    return null;
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0");
    const day = slashMatch[2].padStart(2, "0");
    let year = slashMatch[3];
    if (year.length === 2) {
      year = Number(year) >= 70 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  return normalizeTrnTournamentDate(trimmed);
}

function tournamentDateRawForDb(value: string | undefined): string | null {
  if (!value || value.trim() === "" || value.trim().toUpperCase() === "UNKNOWN") {
    return null;
  }
  return value.trim();
}

function unknownToNull(value: string | undefined): string | null {
  if (!value || value.trim().toUpperCase() === "UNKNOWN") return null;
  return value.trim();
}

async function resolveTestPlayerPersonId(
  config: TodayBetaTestPlayerConfig,
  peopleByName: Map<string, string>,
): Promise<string | undefined> {
  for (const alias of config.nameAliases) {
    const personId = peopleByName.get(alias.trim().toLowerCase().replace(/\s+/g, " "));
    if (personId) return personId;
  }
  return undefined;
}

function parseTrnPlayerIdFromUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const match = url.match(/[?&]id=(\d+)/i);
  return match?.[1];
}

/** Attach TRN/UTR profile metadata to Rank Board recruits (never creates duplicate people). */
export async function ensureTodayBetaTestPlayers(): Promise<void> {
  const [people, profiles] = await Promise.all([listPeople(), listRecruitProfiles()]);
  const profileByPersonId = new Map(profiles.map((profile) => [profile.personId, profile]));

  const peopleByName = new Map<string, string>();
  const peopleById = new Map(people.map((person) => [person.id, person]));
  for (const person of people) {
    peopleByName.set(getDisplayName(person).trim().toLowerCase().replace(/\s+/g, " "), person.id);
  }

  const client = await createSupabaseServerClient();

  for (const person of people) {
    const profile = profileByPersonId.get(person.id);
    if (!profile || !isOnRankBoard(profile)) continue;

    const displayName = getDisplayName(person);
    const legacyConfig = TODAY_BETA_TEST_PLAYERS.find((config) =>
      personNameMatchesConfig(displayName, config.nameAliases),
    );

    const { data: profileRow, error: readError } = await client
      .from(PROFILES_TABLE)
      .select("external_profiles")
      .eq("person_id", person.id)
      .maybeSingle();

    if (readError) {
      throw new TodayBetaRepositoryError(
        `Failed to read external profiles for "${displayName}": ${readError.message}`,
      );
    }

    const externalProfiles = asExternalProfiles(profileRow?.external_profiles);
    const utrPlayerIdFromPerson = person.utrUrl
      ? parseUtrPlayerIdFromUrl(person.utrUrl)
      : null;
    const resolvedUtrPlayerId =
      externalProfiles.utr?.playerId ??
      legacyConfig?.utrPlayerId ??
      utrPlayerIdFromPerson ??
      undefined;
    const trnPlayerId =
      externalProfiles.trn?.playerId ??
      legacyConfig?.trnPlayerId ??
      parseTrnPlayerIdFromUrl(person.trnUrl);
    const trnProfileUrl =
      externalProfiles.trn?.profileUrl ?? legacyConfig?.trnProfileUrl ?? person.trnUrl;

    const nextExternalProfiles: RecruitExternalProfiles = {
      ...externalProfiles,
      ...(trnPlayerId && trnProfileUrl
        ? {
            trn: {
              playerId: trnPlayerId,
              profileUrl: trnProfileUrl,
              lastCheckedAt: externalProfiles.trn?.lastCheckedAt,
              lastImportedAt: externalProfiles.trn?.lastImportedAt,
              lastCheckSavedNewCount: externalProfiles.trn?.lastCheckSavedNewCount,
              baselineEstablishedAt: externalProfiles.trn?.baselineEstablishedAt,
            },
          }
        : externalProfiles.trn
          ? { trn: externalProfiles.trn }
          : {}),
      ...(resolvedUtrPlayerId
        ? {
            utr: buildUtrExternalProfile({
              playerId: resolvedUtrPlayerId,
              existing: externalProfiles.utr,
            }),
          }
        : {}),
    };

    const { error: profileError } = await client
      .from(PROFILES_TABLE)
      .update({ external_profiles: nextExternalProfiles })
      .eq("person_id", person.id);

    if (profileError) {
      throw new TodayBetaRepositoryError(
        `Failed to attach monitoring profiles for "${displayName}": ${profileError.message}`,
      );
    }

    if (legacyConfig?.trnProfileUrl && !person.trnUrl) {
      const { error: personError } = await client
        .from("production_people")
        .update({ trn_url: legacyConfig.trnProfileUrl })
        .eq("id", person.id);

      if (personError) {
        throw new TodayBetaRepositoryError(
          `Failed to set TRN URL for "${displayName}": ${personError.message}`,
        );
      }
    }
  }
}

export async function setUtrMonitoringEnabled(input: {
  recruitPersonId: string;
  enabled: boolean;
}): Promise<{ enabled: boolean }> {
  /** @deprecated Rank Board membership drives monitoring; this toggle no longer affects cohort selection. */
  const client = await createSupabaseServerClient();
  const { data: profileRow, error: readError } = await client
    .from(PROFILES_TABLE)
    .select("external_profiles")
    .eq("person_id", input.recruitPersonId)
    .maybeSingle();

  if (readError) {
    throw new TodayBetaRepositoryError(
      `Failed to read external profiles: ${readError.message}`,
    );
  }

  const externalProfiles = asExternalProfiles(profileRow?.external_profiles);
  const nextExternalProfiles: RecruitExternalProfiles = {
    ...externalProfiles,
    utrMonitoring: { enabled: input.enabled },
  };

  const { error: updateError } = await client
    .from(PROFILES_TABLE)
    .update({ external_profiles: nextExternalProfiles })
    .eq("person_id", input.recruitPersonId);

  if (updateError) {
    throw new TodayBetaRepositoryError(
      `Failed to update UTR monitoring flag: ${updateError.message}`,
    );
  }

  return { enabled: input.enabled };
}

export async function recordUtrAgentBatchRun(
  summary: import("./types").UtrAgentBatchRunSummary,
  monitoredPersonIds: readonly string[],
): Promise<void> {
  if (monitoredPersonIds.length === 0) return;

  const client = await createSupabaseServerClient();
  for (const personId of monitoredPersonIds) {
    const { data: profileRow, error: readError } = await client
      .from(PROFILES_TABLE)
      .select("external_profiles")
      .eq("person_id", personId)
      .maybeSingle();

    if (readError || !profileRow) continue;

    const externalProfiles = asExternalProfiles(profileRow.external_profiles);
    await client
      .from(PROFILES_TABLE)
      .update({
        external_profiles: {
          ...externalProfiles,
          utrAgentLastBatch: summary,
        },
      })
      .eq("person_id", personId);
  }
}

export async function loadTodayBetaPageData(): Promise<TodayBetaPageData> {
  await ensureTodayBetaTestPlayers();

  const [people, profiles] = await Promise.all([listPeople(), listRecruitProfiles()]);
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const profileByPersonId = new Map(profiles.map((profile) => [profile.personId, profile]));

  const peopleByName = new Map<string, string>();
  for (const person of people) {
    peopleByName.set(getDisplayName(person).trim().toLowerCase().replace(/\s+/g, " "), person.id);
  }

  const client = await createSupabaseServerClient();
  const { data: resultRows, error: resultsError } = await client
    .from(RESULTS_TABLE)
    .select("*")
    .order("first_detected_at", { ascending: false });

  if (resultsError) {
    throw new TodayBetaRepositoryError(`Failed to load match results: ${resultsError.message}`);
  }

  const allResults = ((resultRows as MatchResultRow[] | null) ?? []).map(rowToMatchResult);
  const now = new Date();

  const interactions = await listRecruitInteractions();
  const interactionsByPersonId = new Map<string, typeof interactions>();
  for (const interaction of interactions) {
    const bucket = interactionsByPersonId.get(interaction.recruitPersonId) ?? [];
    bucket.push(interaction);
    interactionsByPersonId.set(interaction.recruitPersonId, bucket);
  }

  const opportunityActions = await listContactOpportunityActions();
  const opportunityActionsByRecruit = actionsByRecruitPersonId(opportunityActions);

  const allUpcomingTournaments = await listRecruitUpcomingTournaments();
  const upcomingTournamentsByRecruit = tournamentsByRecruitPersonId(allUpcomingTournaments);

  const testPersonIds = new Set<string>();
  const playerRows: TodayBetaPlayerRow[] = [];
  const contactOpportunities: ContactOpportunity[] = [];
  const upcomingTournamentFeed: UpcomingTournamentFeedRow[] = [];
  const latestResults: LatestResultRow[] = [];
  let recruitsWithActivityLast14Days = 0;

  const monitoredRecruits = await listAllMonitoredRecruits();
  let utrAgentLastBatch: import("./types").UtrAgentBatchRunSummary | undefined;
  const opponentIndex = buildOpponentPersonIndex({ people, profiles });

  for (const monitored of monitoredRecruits) {
    const recruitPersonId = monitored.personId;
    testPersonIds.add(recruitPersonId);

    const profile = profileByPersonId.get(recruitPersonId);
    if (!profile) {
      playerRows.push({
        displayName: monitored.displayName,
        recruitPersonId,
        recruitClassYear: monitored.recruitClassYear,
        coachRank: monitored.coachRank,
        trnPlayerId: monitored.trnPlayerId ?? "",
        trnProfileUrl: monitored.trnProfileUrl ?? "",
        utrPlayerId: monitored.utrPlayerId,
        baselineEstablished: false,
        matchesStored: 0,
        newResultsCount: 0,
        monitoringStatus: "NEEDS_CHECK",
        status: "Missing recruit",
        matchError: "Person exists but has no recruit profile.",
        upcomingTournaments: [],
      });
      continue;
    }

    const recruitTournaments = upcomingTournamentsByRecruit.get(recruitPersonId) ?? [];
    const activeRecruitTournaments = recruitTournaments.filter(
      (tournament) => !isTournamentExpired(tournament, now) && tournament.status === "UPCOMING",
    );

    const clientForProfile = await createSupabaseServerClient();
    const { data: externalRow } = await clientForProfile
      .from(PROFILES_TABLE)
      .select("external_profiles")
      .eq("person_id", recruitPersonId)
      .maybeSingle();

    const externalProfiles = asExternalProfiles(externalRow?.external_profiles);
    if (externalProfiles.utrAgentLastBatch) {
      utrAgentLastBatch = externalProfiles.utrAgentLastBatch;
    }
    const baselineEstablished = isBaselineEstablished(externalProfiles);
    const recruitResults = allResults.filter((result) => result.recruitPersonId === recruitPersonId);
    const newlyDetectedResults = recruitResults.filter(isNewlyDetectedResult);

    const recruitInteractions = interactionsByPersonId.get(recruitPersonId) ?? [];
    const contactSummary = buildInteractionSummary(recruitInteractions, now);
    const recruitOpportunityActions = opportunityActionsByRecruit.get(recruitPersonId) ?? [];
    const eligibleNewResults = filterActionableMatchResults(
      recruitResults.filter(isEligibleForContactOpportunity),
      recruitOpportunityActions,
    );
    const cadenceSnoozed = isCadenceOpportunitySnoozed(recruitOpportunityActions, now);
    const actionableTournaments = filterActionableTournaments(
      activeRecruitTournaments,
      recruitOpportunityActions,
    );
    const tournamentOpportunity = selectNearestTournamentOpportunity({
      tournaments: actionableTournaments,
      priority: profile.priority,
      now,
    });
    const resultOpportunity = buildContactOpportunities({
      recruitPersonId,
      recruitName: monitored.displayName,
      priority: profile.priority,
      daysSinceLastContact: contactSummary.contactDays,
      matchResults: eligibleNewResults,
      now,
    });
    const cadenceOpportunity = cadenceSnoozed
      ? null
      : scoreCadenceOpportunity({
          priority: profile.priority,
          daysSinceLastContact: contactSummary.contactDays,
        });

    const person = peopleById.get(recruitPersonId);
    const recruitFirstName = person
      ? recruitFirstNameFromDisplay(getDisplayName(person), getDisplayFirstName(person))
      : recruitFirstNameFromDisplay(monitored.displayName);

    const merged = mergeContactOpportunities({
      recruitPersonId,
      recruitName: monitored.displayName,
      recruitFirstName,
      recruitPriorityLabel: profile.priority?.label ?? null,
      daysSinceLastContact: contactSummary.contactDays,
      lastContactDateLabel: lastTextOrCallDateLabel(recruitInteractions),
      resultOpportunity,
      cadenceOpportunity,
      tournamentOpportunity,
      newMatchResults: eligibleNewResults,
    });

    if (merged) {
      contactOpportunities.push(merged);
    }

    const sortedRecruitResults = sortResultsByRecency(recruitResults);
    if (recruitHasActivityInLastDays(recruitResults, 14, now)) {
      recruitsWithActivityLast14Days += 1;
    }
    const recentEntries = buildLatestResultEntries({
      results: sortedRecruitResults.slice(0, 5),
      opponentIndex,
      now,
    });
    latestResults.push({
      recruitPersonId,
      recruitName: monitored.displayName,
      latestResult: recentEntries[0] ?? null,
      recentResults: recentEntries,
    });

    for (const tournament of activeRecruitTournaments) {
      const daysUntilStart = daysUntilTournamentStart(tournament.startDate, now);
      if (daysUntilStart < 0 || daysUntilStart > UPCOMING_TOURNAMENT_DISPLAY_WINDOW_DAYS) {
        continue;
      }
      upcomingTournamentFeed.push({
        recruitPersonId,
        recruitName: monitored.displayName,
        recruitPriorityLabel: profile.priority?.label ?? null,
        lastContactDateLabel: lastTextOrCallDateLabel(recruitInteractions),
        daysSinceLastContact: contactSummary.contactDays,
        daysUntilStart,
        startDateLabel: formatDate(tournament.startDate) ?? tournament.startDate,
        tournament,
      });
    }

    playerRows.push({
      displayName: monitored.displayName,
      recruitPersonId,
      recruitClassYear: monitored.recruitClassYear ?? profile.recruitClassYear,
      coachRank: monitored.coachRank ?? profile.coachRank,
      trnPlayerId: externalProfiles.trn?.playerId ?? monitored.trnPlayerId ?? "",
      trnProfileUrl: externalProfiles.trn?.profileUrl ?? monitored.trnProfileUrl ?? "",
      utrPlayerId: externalProfiles.utr?.playerId ?? monitored.utrPlayerId,
      utrProfileUrl: externalProfiles.utr?.profileUrl ?? monitored.utrProfileUrl,
      utrResultsUrl: externalProfiles.utr?.resultsUrl,
      lastCheckedAt: latestResultsCheckAt(
        externalProfiles.trn?.lastCheckedAt,
        externalProfiles.utr?.lastCheckedAt,
      ),
      lastImportedAt: latestResultsCheckAt(
        externalProfiles.trn?.lastImportedAt,
        externalProfiles.utr?.lastImportedAt,
      ),
      trnLastCheckedAt: externalProfiles.trn?.lastCheckedAt,
      utrLastCheckedAt: externalProfiles.utr?.lastCheckedAt,
      utrAgentCheckStatus:
        externalProfiles.utrAgent?.lastCheckStatus ??
        (!(externalProfiles.utr?.playerId ?? monitored.utrPlayerId)
          ? "Not Configured"
          : undefined),
      utrAgentCheckAt: externalProfiles.utrAgent?.lastCheckAt,
      utrAgentCheckError: externalProfiles.utrAgent?.lastCheckError,
      baselineEstablished,
      matchesStored: recruitResults.length,
      newResultsCount: newlyDetectedResults.length,
      monitoringStatus: deriveCombinedMonitoringStatus({
        trn: externalProfiles.trn,
        utr: externalProfiles.utr,
        now,
      }),
      recruitPriorityLabel: profile.priority?.label ?? null,
      status: "Ready",
      upcomingTournaments: activeRecruitTournaments,
    });
  }

  contactOpportunities.sort((a, b) => {
    if (b.opportunityScore !== a.opportunityScore) {
      return b.opportunityScore - a.opportunityScore;
    }
    return a.recruitName.localeCompare(b.recruitName);
  });

  upcomingTournamentFeed.sort((a, b) => {
    if (a.daysUntilStart !== b.daysUntilStart) {
      return a.daysUntilStart - b.daysUntilStart;
    }
    return a.recruitName.localeCompare(b.recruitName);
  });

  const newResults = filterNewResultsFeed(
    allResults.filter((result) => testPersonIds.has(result.recruitPersonId)),
    {
      windowDays: CONTACT_OPPORTUNITY_THRESHOLDS.newResultWindowDays,
      now,
    },
  )
    .sort(
      (a, b) =>
        Date.parse(b.firstDetectedAt) - Date.parse(a.firstDetectedAt) ||
        Date.parse(b.lastVerifiedAt) - Date.parse(a.lastVerifiedAt),
    )
    .slice(0, 50)
    .map((result) => ({
      ...result,
      recruitName: getDisplayName(peopleById.get(result.recruitPersonId)!),
      firstDetectedAtLabel: formatDate(result.firstDetectedAt) ?? result.firstDetectedAt,
      tournamentDateLabel:
        formatDate(result.tournamentDate) ??
        result.tournamentDateRaw ??
        (result.tournamentDate ?? "Unknown"),
    }));

  const activitySummary = buildActivitySummary({
    players: playerRows,
    newResultsCount: newResults.length,
    recruitsWithActivityLast14Days,
    utrConfiguredCount: playerRows.filter((player) => player.utrPlayerId).length,
    utrAgentLastBatch,
    now,
  });

  const sortedLatestResults = sortLatestResultRows(latestResults);

  const sortedPlayers = sortPlayersForMonitoringQueue(playerRows);

  return {
    activitySummary,
    players: sortedPlayers,
    contactOpportunities,
    upcomingTournaments: upcomingTournamentFeed,
    latestResults: sortedLatestResults,
    newResults,
  };
}

export async function saveTodayBetaMatchResults(
  input: SaveMatchResultsInput,
): Promise<SaveMatchResultsOutcome> {
  const client = await createSupabaseServerClient();
  const errors: string[] = [];
  let saved = 0;
  let savedAsBaseline = 0;
  let savedAsNew = 0;
  let duplicatesIgnored = 0;
  let needsReview = 0;
  const savedResults: RecruitMatchResult[] = [];

  const { data: profileRow } = await client
    .from(PROFILES_TABLE)
    .select("external_profiles")
    .eq("person_id", input.recruitPersonId)
    .maybeSingle();

  const externalProfiles = asExternalProfiles(profileRow?.external_profiles);
  const baselineEstablished = isBaselineEstablished(externalProfiles);
  const detectionStatus = detectionStatusForImport(baselineEstablished);

  for (const row of input.rows) {
    const fingerprint = buildResultFingerprint({
      recruitPersonId: input.recruitPersonId,
      tournamentName: row.tournamentName,
      round: row.round,
      opponentName: row.opponentName,
      score: row.score,
    });

    const warnings: string[] = [];
    if (!row.opponentName || row.opponentName.toUpperCase() === "UNKNOWN") {
      warnings.push("Could not parse opponent");
    }
    if (!row.tournamentDate || row.tournamentDate.toUpperCase() === "UNKNOWN") {
      warnings.push("Tournament date unknown");
    }
    if (!row.score || row.score.toUpperCase() === "UNKNOWN") {
      warnings.push("Missing score");
    }
    if (row.result === "UNKNOWN") {
      warnings.push("Win/Loss unknown");
    }

    const rowNeedsReview =
      warnings.length > 0 ||
      row.tournamentName.toUpperCase() === "UNKNOWN" ||
      row.opponentName.toUpperCase() === "UNKNOWN";

    if (rowNeedsReview) {
      needsReview += 1;
    }

    const insertRow = {
      recruit_person_id: input.recruitPersonId,
      source: "trn_manual",
      tournament_name: unknownToNull(row.tournamentName),
      tournament_date: normalizeDateForDb(row.tournamentDate),
      tournament_date_raw: tournamentDateRawForDb(row.tournamentDate),
      round: unknownToNull(row.round),
      opponent_name: unknownToNull(row.opponentName),
      opponent_ranking: unknownToNull(row.opponentRanking),
      score: unknownToNull(row.score),
      result: row.result,
      source_url: input.sourceUrl ?? null,
      result_fingerprint: fingerprint,
      detection_status: detectionStatus,
      needs_review: rowNeedsReview,
      parse_warnings: warnings,
      last_verified_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from(RESULTS_TABLE)
      .insert(insertRow)
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        duplicatesIgnored += 1;
        warnings.push("Possible duplicate");
        continue;
      }
      errors.push(`Import failed for ${row.opponentName}: ${error.message}`);
      continue;
    }

    if (data) {
      saved += 1;
      if (detectionStatus === "BASELINE") {
        savedAsBaseline += 1;
      } else {
        savedAsNew += 1;
      }
      savedResults.push(rowToMatchResult(data as MatchResultRow));
    }
  }

  const now = new Date().toISOString();
  const nextBaselineEstablished = baselineEstablished || savedAsBaseline > 0;
  if (externalProfiles.trn) {
    await client
      .from(PROFILES_TABLE)
      .update({
        external_profiles: {
          ...externalProfiles,
          trn: applyImportCheckToTrnProfile(
            externalProfiles.trn,
            now,
            savedAsNew,
            savedAsBaseline > 0 ? now : undefined,
          ),
        },
      })
      .eq("person_id", input.recruitPersonId);
  }

  return {
    found: input.rows.length,
    saved,
    savedAsBaseline,
    savedAsNew,
    duplicatesIgnored,
    crossSourceMatched: 0,
    needsReview,
    baselineEstablished: nextBaselineEstablished,
    savedResults,
    errors,
  };
}

export async function markRecruitResultsCheckedNoNew(
  recruitPersonId: string,
  source: "TRN" | "UTR" = "TRN",
): Promise<{ lastCheckedAt: string }> {
  const client = await createSupabaseServerClient();
  const { data: profileRow, error: readError } = await client
    .from(PROFILES_TABLE)
    .select("external_profiles")
    .eq("person_id", recruitPersonId)
    .maybeSingle();

  if (readError) {
    throw new TodayBetaRepositoryError(
      `Failed to read external profiles: ${readError.message}`,
    );
  }

  const externalProfiles = asExternalProfiles(profileRow?.external_profiles);
  const now = new Date().toISOString();

  if (source === "UTR") {
    if (!externalProfiles.utr) {
      throw new TodayBetaRepositoryError("UTR profile not configured for this recruit.");
    }
    const { error: updateError } = await client
      .from(PROFILES_TABLE)
      .update({
        external_profiles: {
          ...externalProfiles,
          utr: applyCheckedNoNewToUtrProfile(externalProfiles.utr, now),
        },
      })
      .eq("person_id", recruitPersonId);

    if (updateError) {
      throw new TodayBetaRepositoryError(
        `Failed to mark recruit UTR checked: ${updateError.message}`,
      );
    }
    return { lastCheckedAt: now };
  }

  if (!externalProfiles.trn) {
    throw new TodayBetaRepositoryError("TRN profile not configured for this recruit.");
  }

  const { error: updateError } = await client
    .from(PROFILES_TABLE)
    .update({
      external_profiles: {
        ...externalProfiles,
        trn: applyCheckedNoNewToTrnProfile(externalProfiles.trn, now),
      },
    })
    .eq("person_id", recruitPersonId);

  if (updateError) {
    throw new TodayBetaRepositoryError(
      `Failed to mark recruit checked: ${updateError.message}`,
    );
  }

  return { lastCheckedAt: now };
}

export async function saveUtrExternalProfile(input: {
  recruitPersonId: string;
  playerId: string;
}): Promise<{ utr: RecruitExternalProfiles["utr"] }> {
  const client = await createSupabaseServerClient();
  const { data: profileRow, error: readError } = await client
    .from(PROFILES_TABLE)
    .select("external_profiles")
    .eq("person_id", input.recruitPersonId)
    .maybeSingle();

  if (readError) {
    throw new TodayBetaRepositoryError(
      `Failed to read external profiles: ${readError.message}`,
    );
  }

  const externalProfiles = asExternalProfiles(profileRow?.external_profiles);
  const utr = buildUtrExternalProfile({
    playerId: input.playerId,
    existing: externalProfiles.utr,
  });

  const { error: updateError } = await client
    .from(PROFILES_TABLE)
    .update({
      external_profiles: {
        ...externalProfiles,
        utr,
      },
    })
    .eq("person_id", input.recruitPersonId);

  if (updateError) {
    throw new TodayBetaRepositoryError(
      `Failed to save UTR profile: ${updateError.message}`,
    );
  }

  return { utr };
}

export async function recordUtrAgentRecruitOutcome(input: {
  recruitPersonId: string;
  status: UtrAgentCheckStatus;
  errorCode?: string;
  errorMessage?: string;
  touchLastCheckAt?: boolean;
}): Promise<void> {
  const client = await createSupabaseServerClient();
  const { data: profileRow, error: readError } = await client
    .from(PROFILES_TABLE)
    .select("external_profiles")
    .eq("person_id", input.recruitPersonId)
    .maybeSingle();

  if (readError) {
    throw new TodayBetaRepositoryError(
      `Failed to read external profiles: ${readError.message}`,
    );
  }

  const externalProfiles = asExternalProfiles(profileRow?.external_profiles);
  const now = new Date().toISOString();
  const errorLabel = input.errorMessage ?? input.errorCode;
  const isSuccess = input.status === "Checked" || input.status === "New Results";

  const { error: updateError } = await client
    .from(PROFILES_TABLE)
    .update({
      external_profiles: {
        ...externalProfiles,
        utrAgent: {
          lastCheckStatus: input.status,
          ...(input.touchLastCheckAt === false ? {} : { lastCheckAt: now }),
          lastCheckError: isSuccess ? undefined : errorLabel,
        },
      },
    })
    .eq("person_id", input.recruitPersonId);

  if (updateError) {
    throw new TodayBetaRepositoryError(
      `Failed to record UTR agent check: ${updateError.message}`,
    );
  }
}

/** Patch applied when UTR enriches an existing TRN row on confident cross-source match. */
export function buildUtrCrossSourceEnrichmentPatch(
  row: Pick<
    NormalizedUtrImportRow,
    "externalMatchId" | "recruitUtr" | "opponentUtr" | "matchDate" | "tournamentUrl"
  >,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    last_verified_at: new Date().toISOString(),
    rating_type: "UTR",
  };

  if (row.externalMatchId) patch.external_match_id = row.externalMatchId;
  if (row.recruitUtr) patch.recruit_rating = row.recruitUtr;
  if (row.opponentUtr) patch.opponent_rating = row.opponentUtr;

  const utrDate = normalizeDateForDb(row.matchDate);
  if (utrDate) {
    patch.tournament_date = utrDate;
    patch.tournament_date_raw = tournamentDateRawForDb(row.matchDate);
  }
  if (row.tournamentUrl) {
    patch.tournament_url = row.tournamentUrl;
  }

  return patch;
}

async function enrichExistingResultWithUtrData(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  existingId: string,
  row: NormalizedUtrImportRow,
): Promise<void> {
  const patch = buildUtrCrossSourceEnrichmentPatch(row);
  await client.from(RESULTS_TABLE).update(patch).eq("id", existingId);
}

/** Backfill tournament_url on existing rows after UTR re-import (including duplicates). */
async function backfillTournamentUrlsForRecruit(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  recruitPersonId: string,
  rows: readonly NormalizedUtrImportRow[],
): Promise<void> {
  const now = new Date().toISOString();

  for (const row of rows) {
    if (!row.tournamentUrl) continue;

    if (row.externalMatchId) {
      await client
        .from(RESULTS_TABLE)
        .update({
          tournament_url: row.tournamentUrl,
          last_verified_at: now,
        })
        .eq("recruit_person_id", recruitPersonId)
        .eq("external_match_id", row.externalMatchId);
    }
  }
}

export async function saveUtrCapturedResults(
  input: SaveUtrCapturedResultsInput,
): Promise<SaveMatchResultsOutcome> {
  const client = await createSupabaseServerClient();
  const errors: string[] = [];
  let saved = 0;
  let savedAsBaseline = 0;
  let savedAsNew = 0;
  let duplicatesIgnored = 0;
  let crossSourceMatched = 0;
  let needsReview = 0;
  const savedResults: RecruitMatchResult[] = [];

  const normalizedRows = normalizeUtrCapturedMatches(input.matches);

  const { data: profileRow } = await client
    .from(PROFILES_TABLE)
    .select("external_profiles")
    .eq("person_id", input.recruitPersonId)
    .maybeSingle();

  const externalProfiles = asExternalProfiles(profileRow?.external_profiles);
  const baselineEstablished = isBaselineEstablished(externalProfiles);
  const baselineEstablishedAt =
    externalProfiles.trn?.baselineEstablishedAt ??
    externalProfiles.utr?.baselineEstablishedAt;

  const { data: existingRows, error: existingError } = await client
    .from(RESULTS_TABLE)
    .select("*")
    .eq("recruit_person_id", input.recruitPersonId);

  if (existingError) {
    throw new TodayBetaRepositoryError(
      `Failed to load existing results: ${existingError.message}`,
    );
  }

  const existingResults = ((existingRows as MatchResultRow[] | null) ?? []).map(
    rowToMatchResult,
  );

  for (const row of normalizedRows) {
    const fingerprint = buildResultFingerprint({
      recruitPersonId: input.recruitPersonId,
      tournamentName: row.tournamentName,
      round: row.round,
      opponentName: row.opponentName,
      score: row.score,
    });

    const warnings = [...row.warnings];
    if (row.needsReview) {
      needsReview += 1;
    }

    const crossSource = findCrossSourceMatch(existingResults, {
      opponentName: row.opponentName,
      tournamentName: row.tournamentName,
      tournamentDate: row.matchDate,
      score: row.score,
      round: row.round,
    });

    if (row.externalMatchId) {
      const existingByExternalId = existingResults.find(
        (existing) => existing.externalMatchId === row.externalMatchId,
      );
      if (existingByExternalId) {
        crossSourceMatched += 1;
        duplicatesIgnored += 1;
        await enrichExistingResultWithUtrData(client, existingByExternalId.id, row);
        continue;
      }
    }

    if (crossSource.kind === "confident") {
      crossSourceMatched += 1;
      await enrichExistingResultWithUtrData(client, crossSource.existing.id, row);
      continue;
    }

    if (crossSource.kind === "ambiguous") {
      needsReview += 1;
      warnings.push(crossSource.reason);
    }

    const walkoverScore = row.score === "WO" || row.score === "Ret.";
    const rowNeedsReview =
      (row.needsReview && !walkoverScore) ||
      crossSource.kind === "ambiguous" ||
      (!walkoverScore && warnings.length > 0) ||
      row.tournamentName.toUpperCase() === "UNKNOWN" ||
      row.opponentName.toUpperCase() === "UNKNOWN" ||
      row.score.toUpperCase() === "UNKNOWN";

    const rowDetectionStatus = detectionStatusForUtrImportRow({
      baselineEstablished,
      baselineEstablishedAt,
      matchDate: row.matchDate,
    });

    const insertRow = {
      recruit_person_id: input.recruitPersonId,
      source: "UTR",
      tournament_name: unknownToNull(row.tournamentName),
      tournament_date: normalizeDateForDb(row.matchDate),
      tournament_date_raw: tournamentDateRawForDb(row.matchDate),
      round: unknownToNull(row.round),
      opponent_name: unknownToNull(row.opponentName),
      opponent_ranking: null,
      score: unknownToNull(row.score),
      result: row.result,
      source_url: input.sourceUrl ?? externalProfiles.utr?.resultsUrl ?? null,
      tournament_url: row.tournamentUrl ?? null,
      external_match_id: row.externalMatchId ?? null,
      recruit_rating: row.recruitUtr ?? null,
      opponent_rating: row.opponentUtr ?? null,
      rating_type: "UTR",
      result_fingerprint: fingerprint,
      detection_status: rowDetectionStatus,
      needs_review: rowNeedsReview,
      parse_warnings: warnings,
      last_verified_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from(RESULTS_TABLE)
      .insert(insertRow)
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        duplicatesIgnored += 1;
        continue;
      }
      errors.push(`UTR import failed for ${row.opponentName}: ${error.message}`);
      continue;
    }

    if (data) {
      saved += 1;
      const savedRow = rowToMatchResult(data as MatchResultRow);
      savedResults.push(savedRow);
      existingResults.push(savedRow);
      if (rowDetectionStatus === "BASELINE") {
        savedAsBaseline += 1;
      } else {
        savedAsNew += 1;
      }
    }
  }

  const now = new Date().toISOString();
  const nextBaselineEstablished = baselineEstablished || savedAsBaseline > 0;
  const currentUtr =
    externalProfiles.utr ??
    buildUtrExternalProfile({ playerId: input.utrPlayerId });

  await client
    .from(PROFILES_TABLE)
    .update({
      external_profiles: {
        ...externalProfiles,
        utr: applyImportCheckToUtrProfile(
          currentUtr,
          now,
          savedAsNew,
          savedAsBaseline > 0 ? now : undefined,
        ),
      },
    })
    .eq("person_id", input.recruitPersonId);

  await backfillTournamentUrlsForRecruit(client, input.recruitPersonId, normalizedRows);

  return {
    found: normalizedRows.length,
    saved,
    savedAsBaseline,
    savedAsNew,
    duplicatesIgnored,
    crossSourceMatched,
    needsReview,
    baselineEstablished: nextBaselineEstablished,
    savedResults,
    errors,
  };
}

export async function listExistingFingerprints(recruitPersonId: string): Promise<Set<string>> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(RESULTS_TABLE)
    .select("result_fingerprint")
    .eq("recruit_person_id", recruitPersonId);

  if (error) {
    throw new TodayBetaRepositoryError(`Failed to load fingerprints: ${error.message}`);
  }

  return new Set(
    ((data as Array<{ result_fingerprint: string }> | null) ?? []).map(
      (row) => row.result_fingerprint,
    ),
  );
}
