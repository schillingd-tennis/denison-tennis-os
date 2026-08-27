/**
 * Recruiting directory join (BP-045).
 *
 * Directory + current analytics cohort = Person role `recruit` AND a Recruit
 * Profile. Historical profiles on Players are kept but are not scored in the
 * live WTN pool.
 */
import { listPeople } from "@/features/people/repository";
import type { Person } from "@/features/people/types";
import { getDisplayName } from "@/features/people/utils";

import { isEligibleForRecruiting, isCurrentRecruitingPerson } from "./eligibility";

import { computeRecruitingAnalytics, subjectsFromPeople } from "./analytics";
import type { RecruitAnalyticsResult } from "./analytics/types";
import { RECRUIT_OUTCOME_KEYS } from "./lookupSeed";
import { getRecruitProfileByPersonId, listRecruitProfiles } from "./repository";
import type { RecruitProfile } from "./types";

export type DenisonCommitRecruit = {
  personId: string;
  name: string;
  classYear?: number;
};

/** Outcome `committed_denison` is the canonical Denison commit flag. */
export function listDenisonCommitRecruits(
  profiles: readonly RecruitProfile[],
  peopleById: ReadonlyMap<string, Person>,
): DenisonCommitRecruit[] {
  return profiles
    .filter((profile) => profile.outcome?.key === RECRUIT_OUTCOME_KEYS.committedDenison)
    .flatMap((profile) => {
      const person = peopleById.get(profile.personId);
      if (!person) return [];
      return [
        {
          personId: person.id,
          name: getDisplayName(person),
          classYear: profile.recruitClassYear,
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export type RecruitDirectoryRow = {
  person: Person;
  profile: RecruitProfile;
  analytics: RecruitAnalyticsResult;
};

export type RecruitWorkspaceRecord = {
  person: Person;
  profile: RecruitProfile;
  /** Null when this is a historical profile on a non-recruit Person. */
  analytics: RecruitAnalyticsResult | null;
  inCurrentCohort: boolean;
};

export { isCurrentRecruitingPerson, isEligibleForRecruiting } from "./eligibility";

function attachAnalytics(
  joined: { person: Person; profile: RecruitProfile }[],
): RecruitDirectoryRow[] {
  const results = computeRecruitingAnalytics(subjectsFromPeople(joined.map((row) => row.person)));
  const analyticsById = new Map(results.map((row) => [row.id, row]));

  return joined.map((row) => {
    const analytics = analyticsById.get(row.person.id);
    if (!analytics) {
      throw new Error(`Missing analytics for ${getDisplayName(row.person)}.`);
    }
    return { ...row, analytics };
  });
}

function sortJoined(
  joined: { person: Person; profile: RecruitProfile }[],
): { person: Person; profile: RecruitProfile }[] {
  return [...joined].sort((a, b) => {
    const last = a.person.lastName.localeCompare(b.person.lastName);
    if (last !== 0) return last;
    return a.person.firstName.localeCompare(b.person.firstName);
  });
}

export async function loadRecruitingDirectory(): Promise<{
  rows: RecruitDirectoryRow[];
  denisonCommits: number;
  denisonCommitRecruits: DenisonCommitRecruit[];
}> {
  const [profiles, people] = await Promise.all([listRecruitProfiles(), listPeople()]);
  const peopleById = new Map(people.map((person) => [person.id, person]));

  const joined: { person: Person; profile: RecruitProfile }[] = [];
  for (const profile of profiles) {
    const person = peopleById.get(profile.personId);
    if (!person || !isEligibleForRecruiting(person, profile)) continue;
    joined.push({ person, profile });
  }

  const denisonCommitRecruits = listDenisonCommitRecruits(profiles, peopleById);
  return {
    rows: attachAnalytics(sortJoined(joined)),
    denisonCommits: denisonCommitRecruits.length,
    denisonCommitRecruits,
  };
}

export async function listRecruitDirectoryRows(): Promise<RecruitDirectoryRow[]> {
  const { rows } = await loadRecruitingDirectory();
  return rows;
}

export async function getRecruitWorkspaceRecord(
  personId: string,
): Promise<RecruitWorkspaceRecord | null> {
  const [people, profile] = await Promise.all([
    listPeople(),
    getRecruitProfileByPersonId(personId),
  ]);
  const person = people.find((entry) => entry.id === personId);
  if (!person || !profile) return null;

  if (!isCurrentRecruitingPerson(person)) {
    return { person, profile, analytics: null, inCurrentCohort: false };
  }

  const rows = await listRecruitDirectoryRows();
  const row = rows.find((entry) => entry.person.id === personId);
  if (!row) return { person, profile, analytics: null, inCurrentCohort: false };

  return {
    person,
    profile,
    analytics: row.analytics,
    inCurrentCohort: true,
  };
}
