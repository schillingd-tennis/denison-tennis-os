"use server";

import { revalidatePath } from "next/cache";

import { listPeople } from "@/features/people/repository";
import { TEAM_OPERATIONS_INTRA_SQUAD_ROUTE } from "@/lib/module-routes";

import { todayLocalIsoDate } from "./dates";
import { normalizeIntraSquadInput } from "./mapping";
import { interpretMatchEntry } from "./parseMatchText";
import { formatPersistError, ROSTER_UNAVAILABLE_ERROR } from "./persistErrors";
import { deleteIntraSquadMatch, saveIntraSquadMatch } from "./repository";
import { currentRosterPlayers } from "./roster";
import type { IntraSquadMatch, IntraSquadMatchInput, IntraSquadWeight, MatchStatus } from "./types";
import type { PlayerResolution } from "./resolvePlayers";

function revalidateIntraSquad() {
  revalidatePath(TEAM_OPERATIONS_INTRA_SQUAD_ROUTE);
}

export async function saveIntraSquadMatchAction(
  id: string | null,
  input: Partial<IntraSquadMatchInput>,
): Promise<{ success: true; match: IntraSquadMatch } | { success: false; error: string }> {
  const parsed = normalizeIntraSquadInput(input);
  if ("error" in parsed) return { success: false, error: parsed.error };
  try {
    const match = await saveIntraSquadMatch(id, parsed.input);
    revalidateIntraSquad();
    return { success: true, match };
  } catch (error) {
    return { success: false, error: formatPersistError(error, "save") };
  }
}

export async function deleteIntraSquadMatchAction(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await deleteIntraSquadMatch(id);
    revalidateIntraSquad();
    return { success: true };
  } catch (error) {
    return { success: false, error: formatPersistError(error, "delete") };
  }
}

export type QuickMatchAmbiguity = {
  winner: PlayerResolution;
  loser: PlayerResolution;
};

export async function saveValidatedQuickMatchAction(input: {
  sourceText: string;
  status: MatchStatus;
  playedAt: string;
  primaryPlayerId: string;
  opponentPlayerId: string;
  scoreText: string;
  weight: IntraSquadWeight;
}): Promise<{ success: true; match: IntraSquadMatch } | { success: false; error: string }> {
  const payload: Partial<IntraSquadMatchInput> =
    input.status === "unfinished"
      ? {
          playedAt: input.playedAt,
          status: "unfinished",
          winnerPlayerId: null,
          loserPlayerId: null,
          leaderPlayerId: input.primaryPlayerId,
          trailingPlayerId: input.opponentPlayerId,
          scoreText: input.scoreText,
          weight: input.weight,
          sourceText: input.sourceText,
        }
      : {
          playedAt: input.playedAt,
          status: "completed",
          winnerPlayerId: input.primaryPlayerId,
          loserPlayerId: input.opponentPlayerId,
          leaderPlayerId: null,
          trailingPlayerId: null,
          scoreText: input.scoreText,
          weight: input.weight,
          sourceText: input.sourceText,
        };
  return saveIntraSquadMatchAction(null, payload);
}

export async function addQuickIntraSquadMatchAction(input: {
  sourceText: string;
  playedAt?: string;
  selectedWeight: IntraSquadWeight;
  winnerPlayerId?: string;
  loserPlayerId?: string;
}): Promise<
  | { success: true; match: IntraSquadMatch }
  | { success: false; error: string; status?: MatchStatus; ambiguous?: QuickMatchAmbiguity }
> {
  try {
    const people = await listPeople();
    const roster = currentRosterPlayers(people);
    if (roster.length === 0) {
      return { success: false, error: ROSTER_UNAVAILABLE_ERROR };
    }
    const interpreted = interpretMatchEntry(input.sourceText, roster, {
      defaultWeight: input.selectedWeight,
      winnerPlayerId: input.winnerPlayerId,
      loserPlayerId: input.loserPlayerId,
    });
    if ("error" in interpreted) {
      return {
        success: false,
        error: interpreted.error,
        status: interpreted.status,
        ambiguous: interpreted.ambiguous,
      };
    }

    const playedAt =
      interpreted.dateFromText && interpreted.playedAt
        ? interpreted.playedAt
        : input.playedAt?.trim() || todayLocalIsoDate();
    return saveValidatedQuickMatchAction({
      sourceText: input.sourceText,
      status: interpreted.status,
      playedAt,
      primaryPlayerId: interpreted.status === "unfinished" ? interpreted.leader.id : interpreted.winner.id,
      opponentPlayerId:
        interpreted.status === "unfinished" ? interpreted.trailing.id : interpreted.loser.id,
      scoreText: interpreted.scoreText,
      weight: interpreted.weight,
    });
  } catch (error) {
    const mapped = formatPersistError(error, "save");
    if (/Failed to load people/i.test(error instanceof Error ? error.message : "")) {
      return { success: false, error: ROSTER_UNAVAILABLE_ERROR };
    }
    return { success: false, error: mapped };
  }
}
