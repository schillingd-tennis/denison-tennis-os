import type { RecruitAnalyticsPersonInput, RecruitAnalyticsSubject } from "./types";

/** Map Person tennis facts into engine input. Does not copy calculated scores. */
export function subjectFromPerson(person: RecruitAnalyticsPersonInput): RecruitAnalyticsSubject {
  return {
    id: person.id,
    trnRank: person.trnRank ?? null,
    utr: person.utr ?? null,
    wtn: person.wtn ?? null,
    matchesPlayed: person.utrMatchesPlayed ?? null,
  };
}

export function subjectsFromPeople(
  people: readonly RecruitAnalyticsPersonInput[],
): RecruitAnalyticsSubject[] {
  return people.map(subjectFromPerson);
}
