import { isIsoCalendarDate } from "./dates";
import { parseScoreSets } from "./parseScore";
import {
  INTRA_SQUAD_WEIGHTS,
  MATCH_STATUSES,
  type IntraSquadMatch,
  type IntraSquadMatchInput,
  type IntraSquadWeight,
  type MatchStatus,
  type ScoreSet,
} from "./types";

export type IntraSquadMatchRow = {
  id: string;
  played_at: string;
  status?: string | null;
  winner_player_id: string | null;
  loser_player_id: string | null;
  leader_player_id?: string | null;
  trailing_player_id?: string | null;
  score_text: string;
  score_sets: unknown;
  weight: number;
  source_text: string | null;
  created_at: string;
  updated_at: string;
};

export function isIntraSquadWeight(value: number): value is IntraSquadWeight {
  return (INTRA_SQUAD_WEIGHTS as readonly number[]).includes(value);
}

export function isMatchStatus(value: string): value is MatchStatus {
  return (MATCH_STATUSES as readonly string[]).includes(value);
}

function parseScoreSetsJson(value: unknown): ScoreSet[] {
  if (!Array.isArray(value)) return [];
  const sets: ScoreSet[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { winner_games?: unknown; winnerGames?: unknown; loser_games?: unknown; loserGames?: unknown };
    const winnerGames = Number(row.winner_games ?? row.winnerGames);
    const loserGames = Number(row.loser_games ?? row.loserGames);
    if (!Number.isInteger(winnerGames) || !Number.isInteger(loserGames)) continue;
    sets.push({ winnerGames, loserGames });
  }
  return sets;
}

function nullableId(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

export function rowToIntraSquadMatch(row: IntraSquadMatchRow): IntraSquadMatch {
  const weight = isIntraSquadWeight(row.weight) ? row.weight : 1;
  const playedAt = String(row.played_at).slice(0, 10);
  const status: MatchStatus = row.status === "unfinished" ? "unfinished" : "completed";
  return {
    id: row.id,
    playedAt,
    status,
    winnerPlayerId: nullableId(row.winner_player_id),
    loserPlayerId: nullableId(row.loser_player_id),
    leaderPlayerId: nullableId(row.leader_player_id),
    trailingPlayerId: nullableId(row.trailing_player_id),
    scoreText: row.score_text,
    scoreSets: parseScoreSetsJson(row.score_sets),
    weight,
    sourceText: row.source_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function inputToRow(
  input: IntraSquadMatchInput,
): Omit<IntraSquadMatchRow, "id" | "created_at" | "updated_at"> {
  const status = input.status === "unfinished" ? "unfinished" : "completed";
  return {
    played_at: input.playedAt,
    status,
    winner_player_id: status === "completed" ? nullableId(input.winnerPlayerId) : null,
    loser_player_id: status === "completed" ? nullableId(input.loserPlayerId) : null,
    leader_player_id: status === "unfinished" ? nullableId(input.leaderPlayerId) : null,
    trailing_player_id: status === "unfinished" ? nullableId(input.trailingPlayerId) : null,
    score_text: input.scoreText,
    score_sets: input.scoreSets.map((set) => ({
      winner_games: set.winnerGames,
      loser_games: set.loserGames,
    })),
    weight: input.weight,
    source_text: input.sourceText,
  };
}

export function normalizeIntraSquadInput(
  input: Partial<IntraSquadMatchInput> & { scoreText?: string },
): { input: IntraSquadMatchInput } | { error: string } {
  const playedAt = String(input.playedAt ?? "").trim();
  if (!isIsoCalendarDate(playedAt)) return { error: "Enter a valid match date." };

  const statusRaw = String(input.status ?? "completed").trim();
  if (!isMatchStatus(statusRaw)) return { error: "Status must be completed or unfinished." };
  const status = statusRaw;

  const winnerPlayerId = nullableId(input.winnerPlayerId);
  const loserPlayerId = nullableId(input.loserPlayerId);
  const leaderPlayerId = nullableId(input.leaderPlayerId);
  const trailingPlayerId = nullableId(input.trailingPlayerId);

  if (status === "unfinished") {
    if (!leaderPlayerId || !trailingPlayerId) {
      return { error: "Select a leader and a trailing player." };
    }
    if (leaderPlayerId === trailingPlayerId) {
      return { error: "Leader and trailing player must be different players." };
    }
  } else {
    if (!winnerPlayerId || !loserPlayerId) return { error: "Select a winner and a loser." };
    if (winnerPlayerId === loserPlayerId) return { error: "Winner and loser must be different players." };
  }

  const parsedScore = parseScoreSets(String(input.scoreText ?? ""), {
    allowPartialSets: status === "unfinished",
  });
  if ("error" in parsedScore) return parsedScore;

  const weight = Number(input.weight ?? 1);
  if (!isIntraSquadWeight(weight)) return { error: "Weight must be 1, 2, or 3." };

  const sourceText = input.sourceText?.trim() ? input.sourceText.trim() : null;
  const scoreSets = input.scoreSets && input.scoreSets.length > 0 ? input.scoreSets : parsedScore.sets;

  return {
    input: {
      playedAt,
      status,
      winnerPlayerId: status === "completed" ? winnerPlayerId : null,
      loserPlayerId: status === "completed" ? loserPlayerId : null,
      leaderPlayerId: status === "unfinished" ? leaderPlayerId : null,
      trailingPlayerId: status === "unfinished" ? trailingPlayerId : null,
      scoreText: parsedScore.scoreText,
      scoreSets,
      weight,
      sourceText,
    },
  };
}
