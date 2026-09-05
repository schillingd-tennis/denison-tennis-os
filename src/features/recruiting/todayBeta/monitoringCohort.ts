/**
 * Rank Board-driven UTR monitoring cohort for Today Beta.
 *
 * Single source of truth: a recruit is monitored when they appear on the
 * Recruiting Rank Board (`recruit_profiles.coach_rank IS NOT NULL`).
 *
 * UTR automatic checking requires Rank Board membership plus a configured UTR ID.
 *
 * @deprecated `external_profiles.utrMonitoring.enabled` — no longer used for cohort
 * selection. Kept on records for backward compatibility only.
 */
import { listPeople } from "@/features/people/repository";
import { getDisplayName } from "@/features/people/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { listRecruitProfiles } from "../repository";
import type { RecruitProfile } from "../types";
import {
  personNameMatchesConfig,
  TODAY_BETA_TEST_PLAYERS,
  type TodayBetaTestPlayerConfig,
} from "./config";
import type { RecruitExternalProfiles } from "./types";
import { parseUtrPlayerIdFromUrl } from "./utrProfile";

export type MonitoredRecruit = {
  personId: string;
  displayName: string;
  nameAliases: string[];
  recruitClassYear?: number;
  coachRank?: number;
  /** Coach Rank Board tier 1–5; undefined = unassigned. */
  tier?: 1 | 2 | 3 | 4 | 5;
  trnPlayerId?: string;
  trnProfileUrl?: string;
  utrPlayerId?: string;
  utrProfileUrl?: string;
  legacyConfig?: TodayBetaTestPlayerConfig;
};

export type RankBoardMonitoringCohortSummary = {
  rankBoardCount: number;
  configuredCount: number;
  missingUtrCount: number;
  countsByClass: Record<number, number>;
  configuredRecruits: MonitoredRecruit[];
  missingUtrRecruits: MonitoredRecruit[];
};

export function asExternalProfiles(value: unknown): RecruitExternalProfiles {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as RecruitExternalProfiles;
}

/** @deprecated No longer used for cohort selection. */
export function isUtrMonitoringEnabled(externalProfiles: RecruitExternalProfiles): boolean {
  return externalProfiles.utrMonitoring?.enabled === true;
}

/** Rank Board membership: coach rank is set on the recruit profile. */
export function isOnRankBoard(profile: Pick<RecruitProfile, "coachRank">): boolean {
  return profile.coachRank !== undefined;
}

function legacyConfigForPerson(displayName: string): TodayBetaTestPlayerConfig | undefined {
  return TODAY_BETA_TEST_PLAYERS.find((config) =>
    personNameMatchesConfig(displayName, config.nameAliases),
  );
}

function parseTrnPlayerIdFromUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const match = url.match(/[?&]id=(\d+)/i) ?? url.match(/player(?:\/overview)?\.asp\?id=(\d+)/i);
  return match?.[1];
}

export function resolveMonitoredRecruit(input: {
  personId: string;
  displayName: string;
  utrUrl?: string;
  trnUrl?: string;
  externalProfiles: RecruitExternalProfiles;
  recruitClassYear?: number;
  coachRank?: number;
  tier?: 1 | 2 | 3 | 4 | 5;
}): MonitoredRecruit {
  const legacyConfig = legacyConfigForPerson(input.displayName);
  const utrPlayerId =
    input.externalProfiles.utr?.playerId ??
    legacyConfig?.utrPlayerId ??
    (input.utrUrl ? parseUtrPlayerIdFromUrl(input.utrUrl) ?? undefined : undefined);
  const trnPlayerId =
    input.externalProfiles.trn?.playerId ??
    legacyConfig?.trnPlayerId ??
    parseTrnPlayerIdFromUrl(input.trnUrl);
  const trnProfileUrl =
    input.externalProfiles.trn?.profileUrl ?? legacyConfig?.trnProfileUrl ?? input.trnUrl;

  return {
    personId: input.personId,
    displayName: legacyConfig?.displayName ?? input.displayName,
    nameAliases: legacyConfig?.nameAliases ?? [input.displayName],
    recruitClassYear: input.recruitClassYear,
    coachRank: input.coachRank,
    tier: input.tier,
    trnPlayerId,
    trnProfileUrl,
    utrPlayerId,
    utrProfileUrl:
      input.externalProfiles.utr?.profileUrl ??
      (utrPlayerId ? `https://app.utrsports.net/profiles/${utrPlayerId}` : undefined),
    legacyConfig,
  };
}

export function summarizeRankBoardMonitoringCohort(
  recruits: readonly MonitoredRecruit[],
): RankBoardMonitoringCohortSummary {
  const configuredRecruits = recruits.filter((recruit) => Boolean(recruit.utrPlayerId));
  const missingUtrRecruits = recruits.filter((recruit) => !recruit.utrPlayerId);
  const countsByClass: Record<number, number> = {};

  for (const recruit of recruits) {
    if (recruit.recruitClassYear == null) continue;
    countsByClass[recruit.recruitClassYear] = (countsByClass[recruit.recruitClassYear] ?? 0) + 1;
  }

  return {
    rankBoardCount: recruits.length,
    configuredCount: configuredRecruits.length,
    missingUtrCount: missingUtrRecruits.length,
    countsByClass,
    configuredRecruits,
    missingUtrRecruits,
  };
}

export function filterRankBoardRecruits(input: {
  profiles: readonly RecruitProfile[];
  externalProfilesByPersonId: ReadonlyMap<string, RecruitExternalProfiles>;
  peopleById: ReadonlyMap<string, { id: string; utrUrl?: string | null; trnUrl?: string | null }>;
  displayNameForPersonId: (personId: string) => string;
}): MonitoredRecruit[] {
  const monitored: MonitoredRecruit[] = [];

  for (const profile of input.profiles) {
    if (!isOnRankBoard(profile)) continue;

    const person = input.peopleById.get(profile.personId);
    if (!person) continue;

    monitored.push(
      resolveMonitoredRecruit({
        personId: profile.personId,
        displayName: input.displayNameForPersonId(profile.personId),
        utrUrl: person.utrUrl ?? undefined,
        trnUrl: person.trnUrl ?? undefined,
        externalProfiles: input.externalProfilesByPersonId.get(profile.personId) ?? {},
        recruitClassYear: profile.recruitClassYear,
        coachRank: profile.coachRank,
        tier: profile.tier,
      }),
    );
  }

  monitored.sort((a, b) => {
    const classDiff = (a.recruitClassYear ?? 9999) - (b.recruitClassYear ?? 9999);
    if (classDiff !== 0) return classDiff;
    const rankDiff = (a.coachRank ?? 9999) - (b.coachRank ?? 9999);
    if (rankDiff !== 0) return rankDiff;
    return a.displayName.localeCompare(b.displayName);
  });

  return monitored;
}

export async function listAllMonitoredRecruits(): Promise<MonitoredRecruit[]> {
  const [people, profiles, client] = await Promise.all([
    listPeople(),
    listRecruitProfiles(),
    createSupabaseServerClient(),
  ]);

  const rankBoardPersonIds = profiles
    .filter((profile) => isOnRankBoard(profile))
    .map((profile) => profile.personId);

  if (rankBoardPersonIds.length === 0) {
    return [];
  }

  const { data: externalRows, error } = await client
    .from("recruit_profiles")
    .select("person_id, external_profiles")
    .in("person_id", rankBoardPersonIds);

  if (error) {
    throw new Error(`Failed to load recruit external profiles: ${error.message}`);
  }

  const externalProfilesByPersonId = new Map<string, RecruitExternalProfiles>();
  for (const row of externalRows ?? []) {
    externalProfilesByPersonId.set(
      String(row.person_id),
      asExternalProfiles(row.external_profiles),
    );
  }

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const displayNameByPersonId = new Map(
    people.map((person) => [person.id, getDisplayName(person)]),
  );

  return filterRankBoardRecruits({
    profiles,
    externalProfilesByPersonId,
    peopleById,
    displayNameForPersonId: (personId) => displayNameByPersonId.get(personId) ?? personId,
  });
}

export async function listUtrConfiguredMonitoredRecruits(): Promise<MonitoredRecruit[]> {
  return (await listAllMonitoredRecruits()).filter((recruit) => Boolean(recruit.utrPlayerId));
}

export function isAllowedUtrPlayerId(
  playerId: string,
  monitoredRecruits: readonly MonitoredRecruit[],
): boolean {
  const normalized = playerId.trim();
  return monitoredRecruits.some((recruit) => recruit.utrPlayerId === normalized);
}
