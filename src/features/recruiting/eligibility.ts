import { ROLE_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";
import { hasRole, isCurrentDenisonTeamMember } from "@/features/people/utils";
import type { RecruitInteraction } from "@/features/interactions/types";

import type { RecruitProfile } from "./types";

/** Current recruiting-directory membership: role key `recruit`. */
export function isCurrentRecruitingPerson(person: Person): boolean {
  return hasRole(person, ROLE_KEYS.recruit);
}

/**
 * Shared Recruiting eligibility. Current Denison team membership always wins
 * over a leftover recruit profile. Missing identity keys are not guessed.
 */
export function isEligibleForRecruiting(
  person: Person,
  recruitProfile?: RecruitProfile | null,
): boolean {
  if (isCurrentDenisonTeamMember(person)) return false;
  if (!person.role?.key) return false;
  if (!isCurrentRecruitingPerson(person)) return false;
  if (recruitProfile === null) return false;
  return true;
}

/** Visible central Recruiting interactions. Missing people are left as-is. */
export function filterVisibleRecruitingInteractions(
  rows: readonly RecruitInteraction[],
  peopleById: ReadonlyMap<string, Person>,
): RecruitInteraction[] {
  return rows.filter((row) => {
    const person = peopleById.get(row.recruitPersonId);
    if (!person) return true;
    if (!person.role?.key || !person.status?.key) return true;
    return isEligibleForRecruiting(person);
  });
}

export function ineligibleCurrentTeamPersonIds(people: readonly Person[]): string[] {
  return people.filter(isCurrentDenisonTeamMember).map((person) => person.id);
}
