import { detectResultStatusFromText, parseScoreSets } from "./scoreParse";
import { splitPairNames, toDraftParticipant } from "./resolvePlayers";
import type {
  MatchResultStatus,
  RosterPlayer,
  TournamentDraftResult,
  TournamentImportDraft,
  WinnerSide,
} from "./types";
import { DEFAULT_MATCHES_SEASON_YEAR } from "./types";

function parseDate(text: string): string | null {
  const iso = /\b(20\d{2}-\d{2}-\d{2})\b/.exec(text);
  if (iso) return iso[1]!;
  const us = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/.exec(text);
  if (us) {
    return `${us[3]}-${us[1]!.padStart(2, "0")}-${us[2]!.padStart(2, "0")}`;
  }
  return null;
}

function inferSeasonYear(date: string | null): number {
  if (!date) return DEFAULT_MATCHES_SEASON_YEAR;
  const [y, m] = date.split("-").map(Number);
  if (!y || !m) return DEFAULT_MATCHES_SEASON_YEAR;
  return m >= 8 ? y + 1 : y;
}

function parseTournamentTitle(text: string): string | null {
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  if (!firstLine) return null;
  if (/^(?:main\s*draw|consolation|singles|doubles|round)/i.test(firstLine)) return null;
  if (/\b(?:invite|invitational|regionals?|championships?|tournament)\b/i.test(firstLine)) {
    return firstLine.replace(/\s+20\d{2}.*$/, "").trim();
  }
  return firstLine.length < 80 ? firstLine : null;
}

function parseRoundLabel(line: string): string | null {
  const patterns = [
    /\b(round of \d+)\b/i,
    /\b(R(?:16|32|64))\b/i,
    /\b(quarter(?:final)?s?|QF)\b/i,
    /\b(semi(?:final)?s?|SF)\b/i,
    /\b(finals?)\b/i,
    /\b(consolation(?:\s+final)?)\b/i,
    /\b(first round|second round|third round)\b/i,
  ];
  for (const re of patterns) {
    const m = re.exec(line);
    if (m) return m[1]!;
  }
  return null;
}

function parseDrawFlight(line: string): {
  drawName: string | null;
  flightName: string | null;
  divisionName: string | null;
} {
  let drawName: string | null = null;
  let flightName: string | null = null;
  let divisionName: string | null = null;
  if (/\bmain\s*draw\b/i.test(line)) drawName = "Main Draw";
  if (/\bconsolation\b/i.test(line)) drawName = drawName ?? "Consolation";
  const flight = /\bflight\s+([A-Za-z0-9]+)\b/i.exec(line);
  if (flight) flightName = `Flight ${flight[1]}`;
  const division = /\b(?:division|div\.?)\s+([A-Za-z0-9]+)\b/i.exec(line);
  if (division) divisionName = division[1]!;
  return { drawName, flightName, divisionName };
}

function parseWinnerSide(line: string, status: MatchResultStatus): WinnerSide | null {
  if (status === "bye" || status === "cancelled" || status === "unfinished") return null;
  if (/\blost\s+to\b/i.test(line)) return "opponent";
  if (/\b(?:def\.?|d\.|beat|over|wo|w\/o)\b/i.test(line)) return "denison";
  return "unknown";
}

function extractScorePortion(line: string): string {
  const m = line.match(/(\d{1,2}\s*[-–—]\s*\d{1,2}(?:\s*\(\d{1,2}(?:[-–—]\d{1,2})?\))?(?:\s*,\s*\d{1,2}\s*[-–—]\s*\d{1,2}(?:\s*\(\d{1,2}(?:[-–—]\d{1,2})?\))?)*\s*(?:ret\.?|retired|wo|w\/o)?)\s*$/i);
  return m?.[1]?.trim() ?? "";
}

/**
 * Deterministic tournament result line parser.
 * Supports singles and doubles; multiple results per player; no lineup positions;
 * never invents a team score / dual W–L.
 */
export function parseTournamentResults(input: {
  text: string;
  roster: readonly RosterPlayer[];
  seasonYear?: number | null;
}): TournamentImportDraft {
  const text = input.text.trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: TournamentDraftResult[] = [];
  const flags: string[] = [];
  let currentDraw: string | null = null;
  let currentFlight: string | null = null;
  let currentDivision: string | null = null;

  const startDate = parseDate(text);
  const endMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\s*(?:to|-|–|—)\s*(20\d{2}-\d{2}-\d{2})\b/);
  const endDate = endMatch?.[2] ?? startDate;
  const title = parseTournamentTitle(text);

  for (const line of lines) {
    const header = parseDrawFlight(line);
    if (
      (header.drawName || header.flightName || header.divisionName) &&
      !/\b(?:def\.?|d\.|lost\s+to|wo)\b/i.test(line)
    ) {
      if (header.drawName) currentDraw = header.drawName;
      if (header.flightName) currentFlight = header.flightName;
      if (header.divisionName) currentDivision = header.divisionName;
      continue;
    }

    if (!/\b(?:def\.?|d\.|lost\s+to|wo|w\/o|retired|bye)\b/i.test(line) && !detectResultStatusFromText(line)) {
      continue;
    }

    const status = detectResultStatusFromText(line) ?? "completed";
    const winnerSide = parseWinnerSide(line, status);
    const roundLabel = parseRoundLabel(line);
    const lineDraw = parseDrawFlight(line);
    const scoreRaw = extractScorePortion(line);
    const parsedScore = scoreRaw ? parseScoreSets(scoreRaw) : { sets: [], scoreText: "" };
    const scoreSets = "sets" in parsedScore ? parsedScore.sets : [];
    const scoreText = "scoreText" in parsedScore ? parsedScore.scoreText : scoreRaw || null;
    const rowFlags: string[] = [];
    if ("error" in parsedScore && scoreRaw) rowFlags.push(parsedScore.error);

    const split = line.split(/\b(?:def\.?|d\.|wo|w\/o|retired|ret\.?|lost\s+to)\b/i);
    let left = (split[0] ?? "").replace(/^(?:singles|doubles)\s*/i, "").trim();
    left = left.replace(/\b(?:round of \d+|R(?:16|32|64)|quarter(?:final)?s?|semi(?:final)?s?|finals?|consolation)\b/gi, "").trim();
    left = left.replace(/^[-:.\s]+/, "").trim();

    let right = (split[1] ?? "").replace(/\d{1,2}\s*[-–—].*$/, "").trim();
    let opponentSchool: string | null = null;
    const school = /\(([^)]+)\)\s*$/.exec(right);
    if (school) {
      opponentSchool = school[1]!.trim();
      right = right.replace(/\(([^)]+)\)\s*$/, "").trim();
    }

    let discipline: "singles" | "doubles" = /doubles/i.test(line) ? "doubles" : "singles";
    let denisonAName = left;
    let denisonBName: string | null = null;
    const pair = splitPairNames(left);
    if (pair) {
      discipline = "doubles";
      denisonAName = pair[0];
      denisonBName = pair[1];
    }

    let opponentAName: string | null = right || null;
    let opponentBName: string | null = null;
    const oppPair = right ? splitPairNames(right) : null;
    if (oppPair) {
      discipline = "doubles";
      opponentAName = oppPair[0];
      opponentBName = oppPair[1];
    }

    if (!denisonAName) continue;

    const denisonA = toDraftParticipant(denisonAName, input.roster);
    const denisonB = denisonBName ? toDraftParticipant(denisonBName, input.roster) : null;
    if (denisonA.resolution !== "resolved") rowFlags.push(`Denison player needs review: ${denisonA.rawName}`);
    if (denisonB && denisonB.resolution !== "resolved") {
      rowFlags.push(`Denison partner needs review: ${denisonB.rawName}`);
    }
    if (winnerSide === "unknown" && status === "completed") rowFlags.push("Winner side unknown");

    results.push({
      discipline,
      drawName: lineDraw.drawName ?? currentDraw,
      flightName: lineDraw.flightName ?? currentFlight,
      divisionName: lineDraw.divisionName ?? currentDivision,
      roundLabel,
      matchDate: parseDate(line) ?? startDate,
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
      sourceExcerpt: line,
      flags: rowFlags,
    });
    flags.push(...rowFlags);
  }

  return {
    kind: "tournament",
    title,
    seasonYear: input.seasonYear ?? inferSeasonYear(startDate),
    seasonSegment: null,
    startDate,
    endDate,
    locationText: null,
    results,
    confidence: results.length > 0 ? 0.7 : 0.3,
    interpretation:
      results.length > 0
        ? `Tournament draft with ${results.length} result(s) — no team W/L invented`
        : "No tournament results detected — review or enter manually",
    flags: [...new Set(flags)],
  };
}
