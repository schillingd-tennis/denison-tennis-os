import type { ScoutingDirectReport, ScoutingOpponentPlayer } from "./types";

/** Active opponents have no archive timestamp. */
export function isOpponentActive(player: Pick<ScoutingOpponentPlayer, "archivedAt">): boolean {
  return player.archivedAt == null;
}

export function isOpponentArchived(player: Pick<ScoutingOpponentPlayer, "archivedAt">): boolean {
  return player.archivedAt != null;
}

export function activeOpponentPlayers(
  players: ScoutingOpponentPlayer[],
): ScoutingOpponentPlayer[] {
  return players.filter(isOpponentActive);
}

export function archivedOpponentPlayers(
  players: ScoutingOpponentPlayer[],
): ScoutingOpponentPlayer[] {
  return players.filter(isOpponentArchived);
}

/**
 * When the selected opponent is archived (or removed from the active roster),
 * pick the next active player in sort order, else previous, else empty.
 */
export function selectNextActivePlayerId(
  sortedActiveRoster: ReadonlyArray<{ id: string }>,
  removedId: string,
): string {
  const idx = sortedActiveRoster.findIndex((player) => player.id === removedId);
  if (idx < 0) {
    return sortedActiveRoster.find((player) => player.id !== removedId)?.id ?? "";
  }
  for (let i = idx + 1; i < sortedActiveRoster.length; i += 1) {
    const candidate = sortedActiveRoster[i];
    if (candidate && candidate.id !== removedId) return candidate.id;
  }
  for (let i = idx - 1; i >= 0; i -= 1) {
    const candidate = sortedActiveRoster[i];
    if (candidate && candidate.id !== removedId) return candidate.id;
  }
  return "";
}

/** AI generation requires an active (non-archived) opponent. */
export function canGeneratePlayerAi(player: Pick<ScoutingOpponentPlayer, "archivedAt">): boolean {
  return isOpponentActive(player);
}

export function playerMatchesLinkedReportQuery(
  playerId: string,
  query: string,
  reports: ScoutingDirectReport[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return reports.some((report) => {
    if (report.opponentPlayerId !== playerId) return false;
    const haystack = [
      report.opponentDisplayName,
      report.strengthsWeaknesses,
      report.scoutingReport,
      report.reportBy,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
