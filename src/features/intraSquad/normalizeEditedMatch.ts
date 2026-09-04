import { classifyMatchScoreFromPlayerA, isCompletedTennisSet } from "./matchState";
import { formatScoreSets, invertScoreSets, parseScoreSets } from "./parseScore";
import { TIED_UNFINISHED_HINT } from "./parseMatchText";
import type { IntraSquadMatchInput, IntraSquadWeight, MatchStatus, ScoreSet } from "./types";

export type ScoreStatusImplication = "completed" | "unfinished" | "ambiguous" | "tied";

export type EditedMatchPlayers = {
  /** Form primary: winner when completed, leader when unfinished. */
  primaryPlayerId: string;
  /** Form opponent: loser when completed, trailing when unfinished. */
  opponentPlayerId: string;
};

/**
 * What the score itself implies for Intra Squad status.
 *
 * - completed: decided best-of-3 (someone reached 2 sets, all sets finished)
 * - unfinished: any incomplete set, or finished sets that do not decide the match (e.g. 6-4, 2-6)
 * - ambiguous: exactly one completed set (may be one-set completed OR unfinished after set 1)
 * - tied: unfinished with no leader (do not guess)
 */
export function scoreImpliesMatchStatus(sets: readonly ScoreSet[]): ScoreStatusImplication {
  if (sets.length === 0) return "tied";

  const classification = classifyMatchScoreFromPlayerA(sets);
  if (classification.kind === "tied_unfinished") return "tied";
  if (classification.kind === "completed_match") return "completed";

  const anyIncomplete = sets.some((set) => !isCompletedTennisSet(set));
  if (anyIncomplete) return "unfinished";

  // All sets completed tennis sets but match not decided (e.g. 6-4, 2-6).
  if (sets.length === 1) return "ambiguous";
  return "unfinished";
}

/**
 * Resolve final status: score wins when it clearly determines; otherwise use the form hint
 * (needed for one completed set → one-set completed vs unfinished).
 */
export function resolveEditedMatchStatus(
  sets: readonly ScoreSet[],
  statusHint: MatchStatus,
): MatchStatus | { error: string } {
  const implied = scoreImpliesMatchStatus(sets);
  if (implied === "tied") return { error: TIED_UNFINISHED_HINT };
  if (implied === "completed") return "completed";
  if (implied === "unfinished") return "unfinished";
  return statusHint;
}

export type DeriveCanonicalMatchArgs = EditedMatchPlayers & {
  playedAt: string;
  scoreText: string;
  weight: IntraSquadWeight;
  sourceText: string | null;
  /** Status from the edit form; used only when the score is ambiguous (single completed set). */
  statusHint: MatchStatus;
};

/**
 * Reclassify an edited match from score + selected players into one coherent canonical input.
 * Reuses parseScoreSets + classifyMatchScoreFromPlayerA — does not invent a second engine.
 */
export function deriveCanonicalMatchResult(
  args: DeriveCanonicalMatchArgs,
): { input: IntraSquadMatchInput } | { error: string } {
  const primaryPlayerId = args.primaryPlayerId.trim();
  const opponentPlayerId = args.opponentPlayerId.trim();
  if (!primaryPlayerId || !opponentPlayerId) {
    return { error: "Select both players." };
  }
  if (primaryPlayerId === opponentPlayerId) {
    return { error: "Players must be different." };
  }

  const parsedScore = parseScoreSets(args.scoreText, { allowPartialSets: true });
  if ("error" in parsedScore) return parsedScore;

  const statusResolved = resolveEditedMatchStatus(parsedScore.sets, args.statusHint);
  if (typeof statusResolved === "object") return statusResolved;
  const status = statusResolved;

  const classification = classifyMatchScoreFromPlayerA(parsedScore.sets);

  if (status === "completed") {
    // One-set or decided match: winner is whoever is ahead in completed sets
    // (for a single completed set, that is the set winner).
    if (classification.leader === "tied") {
      return { error: "Completed matches need a winner. Check the score." };
    }

    const primaryWon = classification.leader === "a";
    const winnerPlayerId = primaryWon ? primaryPlayerId : opponentPlayerId;
    const loserPlayerId = primaryWon ? opponentPlayerId : primaryPlayerId;
    const scoreSets = primaryWon ? parsedScore.sets : invertScoreSets(parsedScore.sets);

    // Guard: completed rows must not contain incomplete sets.
    if (scoreSets.some((set) => !isCompletedTennisSet(set))) {
      return {
        error: "That score is unfinished. Change Status to Unfinished, or enter a finished score.",
      };
    }

    return {
      input: {
        playedAt: args.playedAt,
        status: "completed",
        winnerPlayerId,
        loserPlayerId,
        leaderPlayerId: null,
        trailingPlayerId: null,
        scoreText: formatScoreSets(scoreSets),
        scoreSets,
        weight: args.weight,
        sourceText: args.sourceText,
      },
    };
  }

  // Unfinished
  if (classification.leader === "tied" || classification.kind === "tied_unfinished") {
    return { error: TIED_UNFINISHED_HINT };
  }

  const primaryLeads = classification.leader === "a";
  const leaderPlayerId = primaryLeads ? primaryPlayerId : opponentPlayerId;
  const trailingPlayerId = primaryLeads ? opponentPlayerId : primaryPlayerId;
  const scoreSets = primaryLeads ? parsedScore.sets : invertScoreSets(parsedScore.sets);

  return {
    input: {
      playedAt: args.playedAt,
      status: "unfinished",
      winnerPlayerId: null,
      loserPlayerId: null,
      leaderPlayerId,
      trailingPlayerId,
      scoreText: formatScoreSets(scoreSets),
      scoreSets,
      weight: args.weight,
      sourceText: args.sourceText,
    },
  };
}

/** Assert a fully built input is internally coherent (server-side safety net). */
export function assertCanonicalMatchCoherent(
  input: IntraSquadMatchInput,
): { ok: true } | { error: string } {
  if (input.status === "completed") {
    if (!input.winnerPlayerId || !input.loserPlayerId) {
      return { error: "Completed matches require a winner and a loser." };
    }
    if (input.leaderPlayerId || input.trailingPlayerId) {
      return { error: "Completed matches cannot have a leader or trailing player." };
    }
    if (input.scoreSets.some((set) => !isCompletedTennisSet(set))) {
      return { error: "Completed matches cannot include an unfinished set score." };
    }
    return { ok: true };
  }

  if (!input.leaderPlayerId || !input.trailingPlayerId) {
    return { error: "Unfinished matches require a leader and a trailing player." };
  }
  if (input.winnerPlayerId || input.loserPlayerId) {
    return { error: "Unfinished matches cannot have a winner or loser." };
  }
  return { ok: true };
}
