import { extractNaturalDate } from "./naturalDate";
import { extractNaturalWeight } from "./naturalWeight";
import { classifyMatchScoreFromPlayerA } from "./matchState";
import {
  formatScoreSets,
  invertScoreSets,
  isScoreLikeToken,
  parseScoreSets,
  splitNameAndScoreText,
  tokenizeResultSide,
} from "./parseScore";
import { formatUnknownPlayerError, ROSTER_UNAVAILABLE_ERROR } from "./persistErrors";
import { resolveMatchPlayers, resolvePlayerName, type PlayerResolution } from "./resolvePlayers";
import {
  PARSE_ERROR_HINT,
  UNFINISHED_MISSING_SCORE,
  type IntraSquadWeight,
  type MatchStatus,
  type RosterPlayer,
  type ScoreSet,
} from "./types";

export const TIED_UNFINISHED_HINT =
  "The match looks unfinished but tied. Clarify who is leading.";

const VERSUS_SEPARATOR = /\s+(?:v\.?|vs\.?|versus|against)\s+/i;

export type ParsedMatchText = {
  status: MatchStatus;
  winnerName: string;
  loserName: string;
  leaderName: string;
  trailingName: string;
  scoreRaw: string;
  scoreText: string;
  scoreSets: ScoreSet[];
  weight: IntraSquadWeight;
  weightFromText: boolean;
  playedAt: string | null;
  dateText: string | null;
  dateFromText: boolean;
  invertScore: boolean;
  confidence: number;
  interpretation: string;
};

export type MatchSkeleton = {
  status: MatchStatus;
  winnerName: string;
  loserName: string;
  leaderName: string;
  trailingName: string;
  scoreRaw: string;
  weight: IntraSquadWeight;
  weightFromText: boolean;
  playedAt: string | null;
  dateText: string | null;
  dateFromText: boolean;
  invertScore: boolean;
  confidence: number;
  interpretation: string;
};

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function stripTrailingFluff(raw: string): string {
  return raw
    .replace(/\s*,?\s*(when they stopped|but they didn'?t finish|but they did not finish)\b.*$/i, "")
    .replace(/\s+in the second\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitOpponentAndScore(
  remainder: string,
  roster?: readonly RosterPlayer[],
): { name: string; scoreText: string } | { error: string } {
  const tokens = tokenizeResultSide(remainder);
  if (roster && roster.length > 0 && tokens.length > 0) {
    let nameEnd = 0;
    for (let i = 1; i <= tokens.length; i++) {
      if (isScoreLikeToken(tokens[i - 1]!)) break;
      const candidate = tokens.slice(0, i).join(" ");
      const resolved = resolvePlayerName(candidate, roster);
      if (resolved.status === "resolved" || resolved.status === "ambiguous") {
        nameEnd = i;
      }
    }
    if (nameEnd > 0) {
      return {
        name: tokens.slice(0, nameEnd).join(" "),
        scoreText: tokens.slice(nameEnd).join(" "),
      };
    }
  }
  return splitNameAndScoreText(remainder);
}

function collectScoreTokens(raw: string): string {
  return tokenizeResultSide(raw).filter(isScoreLikeToken).join(" ");
}

function completedSkeleton(
  winnerName: string,
  loserName: string,
  scoreRaw: string,
  extras: {
    weight: IntraSquadWeight;
    weightFromText: boolean;
    playedAt: string | null;
    dateText: string | null;
    dateFromText: boolean;
    confidence: number;
    interpretation: string;
    invertScore?: boolean;
  },
): MatchSkeleton | { error: string } {
  if (!winnerName || !loserName) return { error: PARSE_ERROR_HINT };
  if (!scoreRaw.trim()) return { error: PARSE_ERROR_HINT };
  return {
    status: "completed",
    winnerName,
    loserName,
    leaderName: "",
    trailingName: "",
    scoreRaw,
    invertScore: extras.invertScore ?? false,
    weight: extras.weight,
    weightFromText: extras.weightFromText,
    playedAt: extras.playedAt,
    dateText: extras.dateText,
    dateFromText: extras.dateFromText,
    confidence: extras.confidence,
    interpretation: extras.interpretation,
  };
}

function unfinishedSkeleton(
  leaderName: string,
  trailingName: string,
  scoreRaw: string,
  extras: {
    weight: IntraSquadWeight;
    weightFromText: boolean;
    playedAt: string | null;
    dateText: string | null;
    dateFromText: boolean;
    confidence: number;
    interpretation: string;
    invertScore?: boolean;
  },
): MatchSkeleton | { error: string } {
  if (!leaderName || !trailingName) return { error: PARSE_ERROR_HINT };
  if (!scoreRaw.trim()) return { error: UNFINISHED_MISSING_SCORE };
  return {
    status: "unfinished",
    winnerName: "",
    loserName: "",
    leaderName,
    trailingName,
    scoreRaw,
    invertScore: extras.invertScore ?? false,
    weight: extras.weight,
    weightFromText: extras.weightFromText,
    playedAt: extras.playedAt,
    dateText: extras.dateText,
    dateFromText: extras.dateFromText,
    confidence: extras.confidence,
    interpretation: extras.interpretation,
  };
}

function parseUnfinishedSkeleton(
  withoutExtras: string,
  extras: {
    weight: IntraSquadWeight;
    weightFromText: boolean;
    playedAt: string | null;
    dateText: string | null;
    dateFromText: boolean;
  },
  roster?: readonly RosterPlayer[],
): MatchSkeleton | { error: string } | null {
  const cleaned = stripTrailingFluff(withoutExtras);

  const didntFinish = cleaned.match(
    /^(.*?)\s+and\s+(.*?)\s+(?:didn'?t|did not)\s+finish[.,]?\s*(.+?)\s+won the first\s+(.+?)\s+and was up\s+(.+)$/i,
  );
  if (didntFinish) {
    const first = didntFinish[1]!.trim();
    const second = didntFinish[2]!.trim();
    const leaderName = didntFinish[3]!.trim();
    const scoreRaw = `${didntFinish[4]!.trim()} ${didntFinish[5]!.trim()}`;
    const trailingName = namesMatch(leaderName, first)
      ? second
      : namesMatch(leaderName, second)
        ? first
        : "";
    if (!trailingName) return { error: "Couldn’t determine the trailing player." };
    return unfinishedSkeleton(leaderName, trailingName, scoreRaw, {
      ...extras,
      confidence: 0.95,
      interpretation: `${leaderName} leading ${trailingName} (didn’t finish)`,
    });
  }

  const wonFirstAhead = cleaned.match(
    /^(.*?)\s+won the first\s+(.+?)\s+and was ahead of\s+(.+?)\s+(.+)$/i,
  );
  if (wonFirstAhead) {
    return unfinishedSkeleton(wonFirstAhead[1]!.trim(), wonFirstAhead[3]!.trim(), `${wonFirstAhead[2]!.trim()} ${wonFirstAhead[4]!.trim()}`, {
      ...extras,
      confidence: 0.95,
      interpretation: `${wonFirstAhead[1]!.trim()} leading ${wonFirstAhead[3]!.trim()}`,
    });
  }

  const vsUnfinished = cleaned.match(
    /^(.*?)\s+(?:vs\.?|and)\s+(.*?)\s+unfinished\b\s*,?\s*(.*)$/i,
  );
  if (vsUnfinished) {
    const first = vsUnfinished[1]!.trim();
    const second = vsUnfinished[2]!.trim();
    const rest = vsUnfinished[3]!.trim();
    if (!first || !second) return { error: PARSE_ERROR_HINT };
    const leading = rest.match(/^(.*?)\s+leading\s+(.*)$/i);
    if (!leading) {
      return { error: rest ? PARSE_ERROR_HINT : UNFINISHED_MISSING_SCORE };
    }
    const leaderName = leading[1]!.trim();
    const scoreRaw = leading[2]!.trim();
    if (!leaderName) return { error: PARSE_ERROR_HINT };
    const trailingName = namesMatch(leaderName, first)
      ? second
      : namesMatch(leaderName, second)
        ? first
        : "";
    if (!trailingName) return { error: "Couldn’t determine the trailing player." };
    return unfinishedSkeleton(leaderName, trailingName, scoreRaw, {
      ...extras,
      confidence: 1,
      interpretation: `${leaderName} leading ${trailingName}`,
    });
  }

  const trailingVerb = cleaned.match(/\s+was trailing\s+/i);
  if (trailingVerb && trailingVerb.index !== undefined) {
    const trailingName = cleaned.slice(0, trailingVerb.index).trim();
    const remainder = cleaned.slice(trailingVerb.index + trailingVerb[0].length).trim();
    const split = splitOpponentAndScore(remainder, roster);
    if ("error" in split) return split;
    if (!split.name || !split.scoreText) return { error: UNFINISHED_MISSING_SCORE };
    return unfinishedSkeleton(split.name, trailingName, split.scoreText, {
      ...extras,
      invertScore: true,
      confidence: 0.98,
      interpretation: `${split.name} leading ${trailingName}`,
    });
  }

  const leadPatterns: Array<{ pattern: RegExp; confidence: number; label: string }> = [
    { pattern: /\s+was up on\s+/i, confidence: 0.98, label: "was up on" },
    { pattern: /\s+was ahead of\s+/i, confidence: 0.98, label: "was ahead of" },
    { pattern: /\s+was beating\s+/i, confidence: 0.96, label: "was beating" },
    { pattern: /\s+((?:was\s+)?leading|led)\s+/i, confidence: 1, label: "leading" },
  ];

  for (const { pattern, confidence } of leadPatterns) {
    const match = cleaned.match(pattern);
    if (!match || match.index === undefined) continue;
    const leaderName = cleaned.slice(0, match.index).trim();
    const remainder = cleaned.slice(match.index + match[0].length).trim();
    if (!leaderName) return { error: PARSE_ERROR_HINT };
    if (!remainder) return { error: UNFINISHED_MISSING_SCORE };
    const split = splitOpponentAndScore(remainder, roster);
    if ("error" in split) {
      if (split.error.includes("loser")) {
        return { error: "Couldn’t determine the trailing player. Put the player name before the score." };
      }
      return split;
    }
    if (!split.name) {
      return { error: "Couldn’t determine the trailing player. Put the player name before the score." };
    }
    return unfinishedSkeleton(leaderName, split.name, split.scoreText, {
      ...extras,
      confidence,
      interpretation: `${leaderName} leading ${split.name}`,
    });
  }

  return null;
}

function parseVersusSkeleton(
  withoutExtras: string,
  extras: {
    weight: IntraSquadWeight;
    weightFromText: boolean;
    playedAt: string | null;
    dateText: string | null;
    dateFromText: boolean;
  },
  roster?: readonly RosterPlayer[],
): MatchSkeleton | { error: string } | null {
  const cleaned = stripTrailingFluff(withoutExtras);
  const vsMatch = cleaned.match(VERSUS_SEPARATOR);
  if (!vsMatch || vsMatch.index === undefined) return null;

  const left = cleaned.slice(0, vsMatch.index).trim();
  const right = cleaned.slice(vsMatch.index + vsMatch[0].length).trim();
  if (!left || !right) return { error: PARSE_ERROR_HINT };

  const leftHasScore = tokenizeResultSide(left).some(isScoreLikeToken);
  const rightHasScore = tokenizeResultSide(right).some(isScoreLikeToken);

  let playerAName = "";
  let playerBName = "";
  let scoreRaw = "";

  if (leftHasScore && !rightHasScore) {
    const split = splitOpponentAndScore(left, roster);
    if ("error" in split) return split;
    if (!split.name || !split.scoreText) return { error: PARSE_ERROR_HINT };
    playerAName = split.name;
    scoreRaw = split.scoreText;
    playerBName = right;
  } else if (!leftHasScore && rightHasScore) {
    const split = splitOpponentAndScore(right, roster);
    if ("error" in split) return split;
    if (!split.name || !split.scoreText) return { error: PARSE_ERROR_HINT };
    playerAName = left;
    playerBName = split.name;
    scoreRaw = split.scoreText;
  } else {
    return null;
  }

  const scored = parseScoreSets(scoreRaw, { allowPartialSets: true });
  if ("error" in scored) return scored;

  const classification = classifyMatchScoreFromPlayerA(scored.sets);

  if (classification.kind === "tied_unfinished") {
    return { error: TIED_UNFINISHED_HINT };
  }

  if (classification.kind === "completed_match") {
    if (classification.leader === "a") {
      return completedSkeleton(playerAName, playerBName, scored.scoreText, {
        ...extras,
        confidence: 0.92,
        interpretation: `${playerAName} def. ${playerBName}`,
      });
    }
    return completedSkeleton(playerBName, playerAName, scored.scoreText, {
      ...extras,
      invertScore: true,
      confidence: 0.92,
      interpretation: `${playerBName} def. ${playerAName}`,
    });
  }

  // Unfinished — keep score in player-A perspective unless B is match leader.
  if (classification.leader === "a") {
    return unfinishedSkeleton(playerAName, playerBName, scored.scoreText, {
      ...extras,
      confidence: 0.94,
      interpretation: `${playerAName} leading ${playerBName}`,
    });
  }

  return unfinishedSkeleton(playerBName, playerAName, scored.scoreText, {
    ...extras,
    invertScore: true,
    confidence: 0.94,
    interpretation: `${playerBName} leading ${playerAName}`,
  });
}

function parseCompletedSkeleton(
  withoutExtras: string,
  extras: {
    weight: IntraSquadWeight;
    weightFromText: boolean;
    playedAt: string | null;
    dateText: string | null;
    dateFromText: boolean;
  },
  roster?: readonly RosterPlayer[],
): MatchSkeleton | { error: string } | null {
  const cleaned = stripTrailingFluff(withoutExtras).replace(/\s+came back to\s+/i, " ");

  const lostTo = cleaned.match(/\s+lost to\s+/i);
  if (lostTo && lostTo.index !== undefined) {
    const loserName = cleaned.slice(0, lostTo.index).trim();
    const remainder = cleaned.slice(lostTo.index + lostTo[0].length).trim();
    const split = splitOpponentAndScore(remainder, roster);
    if ("error" in split) return split;
    return completedSkeleton(split.name, loserName, split.scoreText, {
      ...extras,
      invertScore: true,
      confidence: 0.98,
      interpretation: `${split.name} def. ${loserName}`,
    });
  }

  const winPatterns: Array<{ pattern: RegExp; confidence: number }> = [
    { pattern: /\s+won over\s+/i, confidence: 0.98 },
    { pattern: /\s+won against\s+/i, confidence: 0.98 },
    { pattern: /\s+(defeated|beats|beat|def\.?)\s+/i, confidence: 1 },
  ];

  for (const { pattern, confidence } of winPatterns) {
    const match = cleaned.match(pattern);
    if (!match || match.index === undefined) continue;
    const winnerName = cleaned.slice(0, match.index).trim();
    const remainder = cleaned.slice(match.index + match[0].length).trim();
    if (!winnerName || !remainder) return { error: PARSE_ERROR_HINT };
    const split = splitOpponentAndScore(remainder, roster);
    if ("error" in split) return split;
    return completedSkeleton(winnerName, split.name, split.scoreText, {
      ...extras,
      confidence,
      interpretation: `${winnerName} def. ${split.name}`,
    });
  }

  return null;
}

export function parseMatchSkeleton(
  raw: string,
  {
    defaultWeight = 1,
    roster,
    now = new Date(),
  }: { defaultWeight?: IntraSquadWeight; roster?: readonly RosterPlayer[]; now?: Date } = {},
): MatchSkeleton | { error: string } {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return { error: PARSE_ERROR_HINT };

  const weightInfo = extractNaturalWeight(trimmed, defaultWeight);
  const dateInfo = extractNaturalDate(weightInfo.remainder, now);
  const withoutExtras = dateInfo.remainder;
  const extras = {
    weight: weightInfo.weight,
    weightFromText: weightInfo.weightFromText,
    playedAt: dateInfo.dateIso,
    dateText: dateInfo.dateText,
    dateFromText: Boolean(dateInfo.dateIso),
  };

  const unfinished = parseUnfinishedSkeleton(withoutExtras, extras, roster);
  if (unfinished) return unfinished;

  const completed = parseCompletedSkeleton(withoutExtras, extras, roster);
  if (completed) return completed;

  const versus = parseVersusSkeleton(withoutExtras, extras, roster);
  if (versus) return versus;

  return { error: PARSE_ERROR_HINT };
}

function finalizeScore(
  scoreRaw: string,
  {
    allowPartialSets,
    invertScore,
  }: { allowPartialSets: boolean; invertScore: boolean },
): { scoreText: string; scoreSets: ScoreSet[] } | { error: string } {
  const parsedScore = parseScoreSets(scoreRaw, { allowPartialSets });
  if ("error" in parsedScore) return parsedScore;
  if (!invertScore) {
    return { scoreText: parsedScore.scoreText, scoreSets: parsedScore.sets };
  }
  const inverted = invertScoreSets(parsedScore.sets);
  return { scoreSets: inverted, scoreText: formatScoreSets(inverted) };
}

export function parseMatchText(
  raw: string,
  { defaultWeight = 1, now = new Date() }: { defaultWeight?: IntraSquadWeight; now?: Date } = {},
): ParsedMatchText | { error: string } {
  const skeleton = parseMatchSkeleton(raw, { defaultWeight, now });
  if ("error" in skeleton) return skeleton;

  const scored = finalizeScore(skeleton.scoreRaw, {
    allowPartialSets: skeleton.status === "unfinished",
    invertScore: skeleton.invertScore,
  });
  if ("error" in scored) return scored;

  return {
    ...skeleton,
    scoreText: scored.scoreText,
    scoreSets: scored.scoreSets,
  };
}

export type InterpretedMatchEntry =
  | {
      ok: true;
      status: MatchStatus;
      winnerName: string;
      loserName: string;
      leaderName: string;
      trailingName: string;
      winner: RosterPlayer;
      loser: RosterPlayer;
      leader: RosterPlayer;
      trailing: RosterPlayer;
      scoreText: string;
      scoreSets: ScoreSet[];
      weight: IntraSquadWeight;
      weightFromText: boolean;
      playedAt: string | null;
      dateText: string | null;
      dateFromText: boolean;
      confidence: number;
      interpretation: string;
      source: "deterministic";
    }
  | {
      error: string;
      status?: MatchStatus;
      ambiguous?: { winner: PlayerResolution; loser: PlayerResolution };
    };

export function interpretMatchEntry(
  raw: string,
  roster: readonly RosterPlayer[],
  {
    defaultWeight = 1,
    winnerPlayerId,
    loserPlayerId,
    now = new Date(),
  }: {
    defaultWeight?: IntraSquadWeight;
    winnerPlayerId?: string;
    loserPlayerId?: string;
    now?: Date;
  } = {},
): InterpretedMatchEntry {
  const skeleton = parseMatchSkeleton(raw, { defaultWeight, roster, now });
  if ("error" in skeleton) return skeleton;

  const firstName = skeleton.status === "unfinished" ? skeleton.leaderName : skeleton.winnerName;
  const secondName = skeleton.status === "unfinished" ? skeleton.trailingName : skeleton.loserName;

  if (skeleton.status === "unfinished" && !skeleton.scoreRaw.trim()) {
    return { error: UNFINISHED_MISSING_SCORE, status: "unfinished" };
  }

  if (roster.length === 0) {
    const scored = finalizeScore(skeleton.scoreRaw, {
      allowPartialSets: skeleton.status === "unfinished",
      invertScore: skeleton.invertScore,
    });
    if ("error" in scored) return scored;
    return { error: ROSTER_UNAVAILABLE_ERROR, status: skeleton.status };
  }

  const resolved = resolveMatchPlayers(firstName, secondName, roster, {
    winnerPlayerId,
    loserPlayerId,
  });
  if (resolved.status === "unknown") {
    return { error: formatUnknownPlayerError(resolved.token), status: skeleton.status };
  }
  if (resolved.status === "same-player") {
    return {
      error:
        skeleton.status === "unfinished"
          ? "Leader and trailing player must be different players."
          : "Winner and loser must be different players.",
      status: skeleton.status,
    };
  }
  if (resolved.status === "ambiguous") {
    return {
      error: "That first name matches more than one roster player. Choose the correct player.",
      status: skeleton.status,
      ambiguous: { winner: resolved.winner, loser: resolved.loser },
    };
  }

  const scored = finalizeScore(skeleton.scoreRaw, {
    allowPartialSets: skeleton.status === "unfinished",
    invertScore: skeleton.invertScore,
  });
  if ("error" in scored) return { ...scored, status: skeleton.status };

  const first = resolved.winner;
  const second = resolved.loser;

  return {
    ok: true,
    status: skeleton.status,
    winnerName: skeleton.status === "completed" ? skeleton.winnerName : "",
    loserName: skeleton.status === "completed" ? skeleton.loserName : "",
    leaderName: skeleton.status === "unfinished" ? skeleton.leaderName : "",
    trailingName: skeleton.status === "unfinished" ? skeleton.trailingName : "",
    winner: first,
    loser: second,
    leader: first,
    trailing: second,
    scoreText: scored.scoreText,
    scoreSets: scored.scoreSets,
    weight: skeleton.weight,
    weightFromText: skeleton.weightFromText,
    playedAt: skeleton.playedAt,
    dateText: skeleton.dateText,
    dateFromText: skeleton.dateFromText,
    confidence: skeleton.confidence,
    interpretation: skeleton.interpretation,
    source: "deterministic",
  };
}

export { collectScoreTokens };
