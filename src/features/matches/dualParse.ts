import { detectResultStatusFromText, parseScoreSets } from "./scoreParse";
import { resolveForcedEventType, detectMatchEventType } from "./detectEventType";
import { splitPairNames, toDraftParticipant } from "./resolvePlayers";
import {
  calculateDualTeamScores,
  teamOutcomeFromScores,
} from "./scoringRules";
import type {
  DualDraftLineResult,
  DualImportDraft,
  MatchResult,
  MatchResultStatus,
  MatchSite,
  MatchScoringFormat,
  RosterPlayer,
  WinnerSide,
} from "./types";
import { DEFAULT_MATCHES_SEASON_YEAR } from "./types";

const DENISON_ALIASES = /\b(?:denison|du|big\s*red)\b/i;

function parseTeamScore(text: string): { denison: number; opponent: number } | null {
  const patterns = [
    /(?:denison|du|big\s*red)\s+(\d+)\s*[,|-]\s*(\d+)/i,
    /(?:final|score)\s*:?\s*(\d+)\s*[-–—]\s*(\d+)/i,
    /\b(\d+)\s*[-–—]\s*(\d+)\s*(?:final|overall)?\b/i,
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (DENISON_ALIASES.test(m[0]) || /denison|du|big\s*red/i.test(text.slice(0, m.index + m[0].length))) {
      return { denison: a, opponent: b };
    }
    // Prefer first number as Denison when "Denison" appears before the score elsewhere
    if (DENISON_ALIASES.test(text)) return { denison: a, opponent: b };
    return { denison: a, opponent: b };
  }
  return null;
}

function parseOpponentName(text: string): string | null {
  const vs = /(?:denison|du|big\s*red)\s+(?:vs\.?|versus|at)\s+([A-Za-z0-9 .&'()-]+)/i.exec(text);
  if (vs?.[1]) return vs[1].trim().split(/[\n,]/)[0]!.trim();
  const at = /\bat\s+([A-Za-z0-9 .&'()-]+)/i.exec(text);
  if (at?.[1] && !DENISON_ALIASES.test(at[1])) return at[1].trim().split(/[\n,]/)[0]!.trim();
  const vs2 = /\bvs\.?\s+([A-Za-z0-9 .&'()-]+)/i.exec(text);
  if (vs2?.[1]) return vs2[1].trim().split(/[\n,]/)[0]!.trim();
  return null;
}

function parseSite(text: string): MatchSite | null {
  if (/\bhome\b/i.test(text) || /\bat\s+denison\b/i.test(text)) return "home";
  if (/\baway\b/i.test(text) || /\bat\s+(?!denison)/i.test(text)) return "away";
  if (/\bneutral\b/i.test(text)) return "neutral";
  return null;
}

function parseDate(text: string): string | null {
  const iso = /\b(20\d{2}-\d{2}-\d{2})\b/.exec(text);
  if (iso) return iso[1]!;
  const us = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/.exec(text);
  if (us) {
    const mm = us[1]!.padStart(2, "0");
    const dd = us[2]!.padStart(2, "0");
    return `${us[3]}-${mm}-${dd}`;
  }
  return null;
}

function inferSeasonYear(date: string | null): number {
  if (!date) return DEFAULT_MATCHES_SEASON_YEAR;
  const [y, m] = date.split("-").map(Number);
  if (!y || !m) return DEFAULT_MATCHES_SEASON_YEAR;
  // Academic/athletic season year = spring calendar year (Aug–Jul → next spring year)
  return m >= 8 ? y + 1 : y;
}

function parseWinnerSide(
  line: string,
  status: MatchResultStatus,
): WinnerSide | null {
  if (status === "bye" || status === "cancelled" || status === "unfinished") return null;
  if (/\b(?:denison|du)\s+(?:def\.?|d\.|beat|over)\b/i.test(line)) return "denison";
  if (/\b(?:def\.?|d\.)\s+/i.test(line) && DENISON_ALIASES.test(line.split(/\b(?:def\.?|d\.)\b/i)[0] ?? "")) {
    return "denison";
  }
  if (/\b(?:lost|loss)\s+to\b/i.test(line)) return "opponent";
  if (/\b(?:def\.?|d\.)\b/i.test(line)) {
    // "Name def. Opponent" with Denison name first → denison
    const before = line.split(/\b(?:def\.?|d\.|wo|w\/o|retired)\b/i)[0] ?? "";
    if (DENISON_ALIASES.test(before) || /[A-Za-z]/.test(before)) return "denison";
  }
  return "unknown";
}

function extractScorePortion(line: string): string {
  const afterDef = line.split(/\b(?:def\.?|d\.|wo|w\/o|retired|ret\.?)\b/i)[1];
  if (afterDef) {
    const scoreMatch = afterDef.match(/(\d{1,2}\s*[-–—]\s*\d{1,2}(?:\s*\(\d{1,2}(?:[-–—]\d{1,2})?\))?.*)$/);
    if (scoreMatch) return scoreMatch[1]!.trim();
  }
  const anyScore = line.match(/(\d{1,2}\s*[-–—]\s*\d{1,2}.*)$/);
  return anyScore?.[1]?.trim() ?? "";
}

function parseLineupLine(
  line: string,
  roster: readonly RosterPlayer[],
): DualDraftLineResult | null {
  const trimmed = line.trim();
  if (!trimmed || /^#|^final|^score|^doubles\s*point/i.test(trimmed)) return null;

  const singlesPos = /^(?:#?\s*)?(?:singles\s+)?([1-6])[\.:)\s-]+(.+)$/i.exec(trimmed);
  const doublesPos = /^(?:#?\s*)?(?:doubles\s+|d)([1-3])[\.:)\s-]+(.+)$/i.exec(trimmed);

  let discipline: "singles" | "doubles" = "singles";
  let position: number | null = null;
  let body = trimmed;

  // Skip event header / score lines that are not court results
  if (
    /^(?:denison\s+(?:vs\.?|versus|at)|final\s*:|score\s*:|ncaa|doubles\s+point|doubles\s+separate)/i.test(
      trimmed,
    ) ||
    (/^20\d{2}-\d{2}-\d{2}/.test(trimmed) && !/\bdef\.?\b/i.test(trimmed)) ||
    /^(?:home|away|neutral)\b/i.test(trimmed)
  ) {
    return null;
  }

  if (doublesPos) {
    discipline = "doubles";
    position = Number(doublesPos[1]);
    body = doublesPos[2]!.trim();
  } else if (singlesPos) {
    position = Number(singlesPos[1]);
    body = singlesPos[2]!.trim();
  } else if (/^doubles\b/i.test(trimmed) && !/\b(?:def\.?|d\.|lost\s+to|wo)\b/i.test(trimmed)) {
    return null;
  }

  const status = detectResultStatusFromText(trimmed) ?? "completed";
  const winnerSide = parseWinnerSide(trimmed, status);
  const scoreRaw = extractScorePortion(body);
  const parsedScore = scoreRaw ? parseScoreSets(scoreRaw) : { sets: [], scoreText: "" };
  const scoreSets = "sets" in parsedScore ? parsedScore.sets : [];
  const scoreText = "scoreText" in parsedScore ? parsedScore.scoreText : scoreRaw || null;
  const flags: string[] = [];
  if ("error" in parsedScore && scoreRaw) flags.push(parsedScore.error);

  // Name extraction: "Player def. Opponent 6-1, 6-2" or "Player/Partner def. A/B (School)"
  const defSplit = body.split(/\b(?:def\.?|d\.|wo|w\/o|retired|ret\.?|lost\s+to)\b/i);
  const left = (defSplit[0] ?? "").trim();
  const right = (defSplit[1] ?? "").replace(/\d{1,2}\s*[-–—].*$/, "").trim();

  let denisonAName = left;
  let denisonBName: string | null = null;
  const pair = splitPairNames(left);
  if (pair) {
    discipline = "doubles";
    denisonAName = pair[0];
    denisonBName = pair[1];
  }

  let opponentAName: string | null = null;
  let opponentBName: string | null = null;
  let opponentSchool: string | null = null;
  if (right) {
    const school = /\(([^)]+)\)\s*$/.exec(right);
    opponentSchool = school?.[1]?.trim() ?? null;
    const oppBody = right.replace(/\(([^)]+)\)\s*$/, "").trim();
    const oppPair = splitPairNames(oppBody);
    if (oppPair) {
      opponentAName = oppPair[0];
      opponentBName = oppPair[1];
      discipline = "doubles";
    } else {
      opponentAName = oppBody || null;
    }
  }

  const denisonA = toDraftParticipant(denisonAName, roster);
  const denisonB = denisonBName ? toDraftParticipant(denisonBName, roster) : null;
  if (denisonA.resolution !== "resolved") flags.push(`Denison player needs review: ${denisonA.rawName}`);
  if (denisonB && denisonB.resolution !== "resolved") {
    flags.push(`Denison partner needs review: ${denisonB.rawName}`);
  }
  if (winnerSide === "unknown" && status === "completed") {
    flags.push("Winner side unknown");
  }

  return {
    discipline,
    lineupPosition: position,
    denisonA,
    denisonB,
    opponentAName,
    opponentBName,
    opponentSchool,
    status,
    winnerSide,
    scoreText,
    scoreSets,
    originalScoreText: scoreRaw || null,
    sourceExcerpt: trimmed,
    countsTowardTeamPoint: status !== "bye" && status !== "cancelled",
    teamPointAwardedTo:
      status === "unfinished" || status === "bye" || status === "cancelled"
        ? "none"
        : winnerSide === "denison"
          ? "denison"
          : winnerSide === "opponent"
            ? "opponent"
            : null,
    flags,
  };
}

function detectScoringFormat(text: string): MatchScoringFormat {
  if (/doubles\s+separate|each\s+doubles\s+(?:counts|worth)/i.test(text)) return "doubles_separate";
  if (/ncaa|doubles\s+point|collective/i.test(text)) return "ncaa_standard";
  return "ncaa_standard";
}

export function parseDualBoxScore(input: {
  text: string;
  roster: readonly RosterPlayer[];
  seasonYear?: number | null;
}): DualImportDraft {
  const text = input.text.trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: DualDraftLineResult[] = [];
  const flags: string[] = [];

  for (const line of lines) {
    const parsed = parseLineupLine(line, input.roster);
    if (parsed) results.push(parsed);
  }

  const reported = parseTeamScore(text);
  const startDate = parseDate(text);
  const scoringFormat = detectScoringFormat(text);

  // Calculate from draft-shaped results
  const synthetic: MatchResult[] = results.map((r, index) => ({
    id: `draft-${index}`,
    eventId: "draft",
    discipline: r.discipline,
    resultKind: "dual_lineup",
    lineupPosition: r.lineupPosition,
    drawName: null,
    flightName: null,
    divisionName: null,
    roundLabel: null,
    matchDate: startDate,
    status: r.status,
    winnerSide: r.winnerSide,
    scoreText: r.scoreText,
    scoreSets: r.scoreSets,
    originalScoreText: r.originalScoreText,
    sourceExcerpt: r.sourceExcerpt,
    notes: null,
    denisonPlayerAId: r.denisonA.personId,
    denisonPlayerBId: r.denisonB?.personId ?? null,
    doublesPairId: null,
    opponentPlayerAName: r.opponentAName,
    opponentPlayerBName: r.opponentBName,
    opponentSchool: r.opponentSchool,
    countsTowardTeamPoint: r.countsTowardTeamPoint,
    teamPointAwardedTo: r.teamPointAwardedTo,
    importFingerprint: null,
    createdAt: "",
    updatedAt: "",
  }));

  const calculated = calculateDualTeamScores(synthetic, scoringFormat);
  const discrepancy =
    reported != null &&
    (reported.denison !== calculated.denison || reported.opponent !== calculated.opponent);

  if (discrepancy) {
    flags.push(
      `Reported team score ${reported!.denison}–${reported!.opponent} differs from calculated ${calculated.denison}–${calculated.opponent}`,
    );
  }
  if (results.some((r) => r.status === "unfinished")) {
    flags.push("Includes unfinished/clinch-stop courts — winners were not invented");
  }
  for (const r of results) flags.push(...r.flags);

  const outcome = teamOutcomeFromScores(
    reported?.denison ?? calculated.denison,
    reported?.opponent ?? calculated.opponent,
  );

  return {
    kind: "dual",
    opposingTeamName: parseOpponentName(text),
    seasonYear: input.seasonYear ?? inferSeasonYear(startDate),
    seasonSegment: null,
    startDate,
    site: parseSite(text),
    locationText: null,
    venueName: null,
    scoringFormat,
    reportedTeamScoreDenison: reported?.denison ?? null,
    reportedTeamScoreOpponent: reported?.opponent ?? null,
    calculatedTeamScoreDenison: calculated.denison,
    calculatedTeamScoreOpponent: calculated.opponent,
    teamOutcome: outcome,
    teamScoreDiscrepancy: Boolean(discrepancy),
    results,
    confidence: results.length > 0 ? 0.7 : 0.3,
    interpretation:
      results.length > 0
        ? `Dual draft with ${results.length} court result(s)`
        : "No lineup rows detected — review or enter manually",
    flags: [...new Set(flags)],
  };
}

export function canParseAsDual(text: string): boolean {
  const detection = detectMatchEventType(text);
  const resolved = resolveForcedEventType(detection, "auto");
  return resolved.eventType === "dual" || detection.status === "ambiguous";
}
