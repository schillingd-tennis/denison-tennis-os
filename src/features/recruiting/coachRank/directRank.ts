/**
 * Parse a typed Coach Rank destination against the master class board.
 * Direct entry always means master rank, never a filtered visible index.
 */
export type DirectCoachRankParse =
  | { status: "same" }
  | { status: "move"; toRank: number }
  | { status: "invalid" };

export function parseDirectCoachRank(
  raw: string,
  currentRank: number,
  rankedCount: number,
): DirectCoachRankParse {
  const trimmed = raw.trim();
  if (trimmed === "") return { status: "invalid" };
  if (!/^\d+$/.test(trimmed)) return { status: "invalid" };

  const toRank = Number(trimmed);
  if (!Number.isInteger(toRank) || toRank < 1 || toRank > rankedCount) {
    return { status: "invalid" };
  }
  if (toRank === currentRank) return { status: "same" };
  return { status: "move", toRank };
}
