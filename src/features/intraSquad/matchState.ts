import type { ScoreSet } from "./types";

export type MatchScoreLeader = "a" | "b" | "tied";

export type MatchScoreClassification = {
  /** Best-of-3 completed match (someone reached 2 sets, no unfinished set). */
  kind: "completed_match" | "unfinished" | "tied_unfinished";
  playerASets: number;
  playerBSets: number;
  /** Who is ahead in the match from player-A score perspective. */
  leader: MatchScoreLeader;
};

/**
 * Tennis set completion from a single set score.
 * `winnerGames` / `loserGames` are treated as player-A / player-B games.
 */
export function isCompletedTennisSet(set: ScoreSet): boolean {
  const a = set.winnerGames;
  const b = set.loserGames;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false;
  const high = Math.max(a, b);
  const low = Math.min(a, b);
  if (high < 6) return false;
  if (high === 6 && high - low >= 2) return true;
  if (high === 7 && (low === 5 || low === 6)) return true;
  if (high > 7 && high - low >= 2) return true;
  return false;
}

/**
 * Classify a score written from player A's perspective.
 * Leader means ahead in the MATCH (completed sets first, then current set).
 */
export function classifyMatchScoreFromPlayerA(sets: readonly ScoreSet[]): MatchScoreClassification {
  if (sets.length === 0) {
    return { kind: "tied_unfinished", playerASets: 0, playerBSets: 0, leader: "tied" };
  }

  let playerASets = 0;
  let playerBSets = 0;
  let currentSet: ScoreSet | null = null;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i]!;
    if (isCompletedTennisSet(set)) {
      if (set.winnerGames > set.loserGames) playerASets += 1;
      else if (set.loserGames > set.winnerGames) playerBSets += 1;
      // equal completed games is invalid as a set result; ignore for leadership
    } else {
      // Only the final set may be in progress; earlier non-completed sets still mark unfinished.
      currentSet = set;
      if (i < sets.length - 1) {
        // Non-terminal incomplete set → treat remaining as unfinished match state.
      }
    }
  }

  const hasIncompleteSet = sets.some((set) => !isCompletedTennisSet(set));
  const decided = !hasIncompleteSet && (playerASets >= 2 || playerBSets >= 2);

  if (decided) {
    return {
      kind: "completed_match",
      playerASets,
      playerBSets,
      leader: playerASets > playerBSets ? "a" : "b",
    };
  }

  if (playerASets !== playerBSets) {
    return {
      kind: "unfinished",
      playerASets,
      playerBSets,
      leader: playerASets > playerBSets ? "a" : "b",
    };
  }

  // Completed sets tied (0-0, 1-1, …): use current unfinished set if present.
  if (currentSet) {
    if (currentSet.winnerGames === currentSet.loserGames) {
      return {
        kind: "tied_unfinished",
        playerASets,
        playerBSets,
        leader: "tied",
      };
    }
    return {
      kind: "unfinished",
      playerASets,
      playerBSets,
      leader: currentSet.winnerGames > currentSet.loserGames ? "a" : "b",
    };
  }

  return {
    kind: "tied_unfinished",
    playerASets,
    playerBSets,
    leader: "tied",
  };
}
