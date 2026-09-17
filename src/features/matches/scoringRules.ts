/**
 * Official match scoring / record rules.
 *
 * Team W–L: only duals with a confirmed `teamOutcome` (win/loss/tie). Tournaments
 * never contribute a fabricated team W/L.
 *
 * Singles records: from singles results only. Doubles-player credits each
 * Denison participant once per match. Doubles-pair records count once per
 * match (A/B = B/A). Overall doubles totals count once per match, not once
 * per player.
 *
 * Result status vs record / team points:
 * - completed: counts as W or L from winnerSide
 * - retired / walkover / default: count as W/L from winnerSide when known;
 *   may award team point when countsTowardTeamPoint and teamPointAwardedTo set
 * - unfinished: tracked separately; does not invent a winner or team point
 * - bye: not a loss; excluded from W–L
 * - cancelled: excluded from W–L
 * - missing / unknown winner: stays unknown; not forced into a loss
 *
 * NCAA standard dual format (`ncaa_standard`):
 * - Doubles: three courts share 1 team point (first to two doubles wins)
 * - Singles: each of six courts is 1 team point
 * - Clinch stop: unfinished courts stay unfinished; no invented winners
 *
 * `doubles_separate`: each doubles and singles court is its own team point.
 * Preserve reported team score vs calculated; flag discrepancies without
 * overwriting the reported score.
 */

import type {
  MatchResult,
  MatchResultStatus,
  TeamPointSide,
  WinnerSide,
  WinLossRecord,
} from "./types";

export const EMPTY_RECORD = (): WinLossRecord => ({
  wins: 0,
  losses: 0,
  unfinished: 0,
  retired: 0,
  walkovers: 0,
  defaults: 0,
  byes: 0,
  cancelled: 0,
});

export function cloneRecord(record: WinLossRecord): WinLossRecord {
  return { ...record };
}

export function formatRecord(record: WinLossRecord): string {
  return `${record.wins}–${record.losses}`;
}

export function resultCountsAsWinLoss(status: MatchResultStatus): boolean {
  return (
    status === "completed" ||
    status === "retired" ||
    status === "walkover" ||
    status === "default"
  );
}

export function applyResultToRecord(
  record: WinLossRecord,
  status: MatchResultStatus,
  winnerSide: WinnerSide | null,
  perspective: "denison" | "opponent" = "denison",
): void {
  if (status === "bye") {
    record.byes += 1;
    return;
  }
  if (status === "cancelled") {
    record.cancelled += 1;
    return;
  }
  if (status === "unfinished") {
    record.unfinished += 1;
    return;
  }
  if (status === "retired") record.retired += 1;
  if (status === "walkover") record.walkovers += 1;
  if (status === "default") record.defaults += 1;

  if (!resultCountsAsWinLoss(status)) return;
  if (winnerSide == null || winnerSide === "unknown") return;

  const denisonWon = winnerSide === "denison";
  const won = perspective === "denison" ? denisonWon : !denisonWon;
  if (won) record.wins += 1;
  else record.losses += 1;
}

export function sumRecords(a: WinLossRecord, b: WinLossRecord): WinLossRecord {
  return {
    wins: a.wins + b.wins,
    losses: a.losses + b.losses,
    unfinished: a.unfinished + b.unfinished,
    retired: a.retired + b.retired,
    walkovers: a.walkovers + b.walkovers,
    defaults: a.defaults + b.defaults,
    byes: a.byes + b.byes,
    cancelled: a.cancelled + b.cancelled,
  };
}

export function recordsReconcile(
  overall: WinLossRecord,
  dual: WinLossRecord,
  tournament: WinLossRecord,
): boolean {
  return (
    overall.wins === dual.wins + tournament.wins &&
    overall.losses === dual.losses + tournament.losses &&
    overall.unfinished === dual.unfinished + tournament.unfinished &&
    overall.byes === dual.byes + tournament.byes &&
    overall.cancelled === dual.cancelled + tournament.cancelled
  );
}

/** NCAA doubles point: first team to 2 doubles court wins gets 1 point. */
export function calculateNcaaDoublesPoint(
  doublesResults: readonly Pick<MatchResult, "status" | "winnerSide" | "countsTowardTeamPoint">[],
): TeamPointSide {
  let denison = 0;
  let opponent = 0;
  for (const row of doublesResults) {
    if (!row.countsTowardTeamPoint) continue;
    if (!resultCountsAsWinLoss(row.status)) continue;
    if (row.winnerSide === "denison") denison += 1;
    else if (row.winnerSide === "opponent") opponent += 1;
  }
  if (denison >= 2) return "denison";
  if (opponent >= 2) return "opponent";
  return "none";
}

export function calculateDualTeamScores(
  results: readonly MatchResult[],
  scoringFormat: "ncaa_standard" | "doubles_separate" | "custom",
): { denison: number; opponent: number } {
  const singles = results.filter((r) => r.discipline === "singles");
  const doubles = results.filter((r) => r.discipline === "doubles");
  let denison = 0;
  let opponent = 0;

  if (scoringFormat === "ncaa_standard") {
    const doublesPoint = calculateNcaaDoublesPoint(doubles);
    if (doublesPoint === "denison") denison += 1;
    if (doublesPoint === "opponent") opponent += 1;
    for (const row of singles) {
      if (!row.countsTowardTeamPoint) continue;
      if (row.teamPointAwardedTo === "denison") denison += 1;
      else if (row.teamPointAwardedTo === "opponent") opponent += 1;
      else if (resultCountsAsWinLoss(row.status) && row.winnerSide === "denison") denison += 1;
      else if (resultCountsAsWinLoss(row.status) && row.winnerSide === "opponent") opponent += 1;
    }
  } else if (scoringFormat === "doubles_separate") {
    for (const row of [...doubles, ...singles]) {
      if (!row.countsTowardTeamPoint) continue;
      if (row.teamPointAwardedTo === "denison") denison += 1;
      else if (row.teamPointAwardedTo === "opponent") opponent += 1;
      else if (resultCountsAsWinLoss(row.status) && row.winnerSide === "denison") denison += 1;
      else if (resultCountsAsWinLoss(row.status) && row.winnerSide === "opponent") opponent += 1;
    }
  } else {
    for (const row of results) {
      if (!row.countsTowardTeamPoint) continue;
      if (row.teamPointAwardedTo === "denison") denison += 1;
      else if (row.teamPointAwardedTo === "opponent") opponent += 1;
    }
  }

  return { denison, opponent };
}

export function teamOutcomeFromScores(
  denison: number | null,
  opponent: number | null,
): "win" | "loss" | "tie" | null {
  if (denison == null || opponent == null) return null;
  if (denison > opponent) return "win";
  if (denison < opponent) return "loss";
  return "tie";
}
