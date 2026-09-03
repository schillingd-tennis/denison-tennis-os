import { listPeople } from "@/features/people/repository";

import { peopleToRoster } from "./peopleToRoster";
import { listIntraSquadMatches } from "./repository";
import type { IntraSquadMatch, RosterPlayer } from "./types";

export async function loadIntraSquadWorkspaceData(): Promise<{
  matches: IntraSquadMatch[];
  roster: RosterPlayer[];
  loadError: string | null;
}> {
  const [matchesOutcome, peopleOutcome] = await Promise.allSettled([
    listIntraSquadMatches(),
    listPeople(),
  ]);

  const matches = matchesOutcome.status === "fulfilled" ? matchesOutcome.value : [];
  const roster = peopleOutcome.status === "fulfilled" ? peopleToRoster(peopleOutcome.value) : [];

  const errors: string[] = [];
  if (peopleOutcome.status === "rejected") {
    errors.push(
      peopleOutcome.reason instanceof Error
        ? peopleOutcome.reason.message
        : "Couldn’t load the current roster.",
    );
  }
  if (matchesOutcome.status === "rejected") {
    errors.push(
      matchesOutcome.reason instanceof Error
        ? matchesOutcome.reason.message
        : "Couldn’t load intra-squad matches.",
    );
  }

  return { matches, roster, loadError: errors.length > 0 ? errors.join(" ") : null };
}
