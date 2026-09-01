import type { MatchResultOutcome, ParsedMatchPreview } from "./types";
import { isTournamentDateLine, normalizeTrnTournamentDate } from "./tournamentDate";

const UNKNOWN = "UNKNOWN";

const ROUND_TOKEN = /^(?:256|128|64|32|16|QF|SF|F|\d+-Q|\d+)$/;

const SKIP_LINE = /^complete results$/i;
const HEADER_LINE = /^round\s+wins\s+losses\s+score$/i;

const SCORE_TAIL =
  /((?:\d+-\d+(?:\(\d+\))?(?:\s+\d+-\d+(?:\(\d+\))?)*(?:\s+\[\d+-\d+\])?|\d+-\d+\s+Ret\.))\.?\s*$/;

type TournamentMetadata = {
  tournamentName: string;
  tournamentDate: string;
  location: string;
  eventType: string;
};

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeLines(rawText: string): string[] {
  return rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .filter((line) => line.trim().length > 0);
}

function isSkippableLine(line: string): boolean {
  return SKIP_LINE.test(line.trim()) || HEADER_LINE.test(line.trim().replace(/\s+/g, " "));
}

function isMatchRow(line: string): boolean {
  const trimmed = line.trim();
  const round = trimmed.split(/\s+/)[0];
  if (!round || !ROUND_TOKEN.test(round)) return false;
  return SCORE_TAIL.test(trimmed);
}

function splitLocationEvent(line: string): { location: string; eventType: string } {
  const parts = line.split(/\t|\s{2,}/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { location: parts[0] ?? UNKNOWN, eventType: parts.slice(1).join(" ") };
  }
  return { location: line.trim() || UNKNOWN, eventType: UNKNOWN };
}

function splitTournamentBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let index = 0;

  while (index < lines.length) {
    if (index + 1 < lines.length && isTournamentDateLine(lines[index + 1]!)) {
      const block: string[] = [lines[index]!, lines[index + 1]!];
      index += 2;

      if (index < lines.length && !isSkippableLine(lines[index]!) && !isMatchRow(lines[index]!)) {
        block.push(lines[index]!);
        index += 1;
      }

      while (index < lines.length) {
        if (
          index + 1 < lines.length &&
          isTournamentDateLine(lines[index + 1]!) &&
          !isMatchRow(lines[index]!)
        ) {
          break;
        }

        const line = lines[index]!;
        if (isSkippableLine(line)) {
          index += 1;
          continue;
        }
        if (isMatchRow(line)) {
          block.push(line);
          index += 1;
          continue;
        }
        break;
      }

      blocks.push(block);
      continue;
    }

    index += 1;
  }

  return blocks;
}

function parseTournamentMetadata(block: string[]): TournamentMetadata | null {
  if (block.length < 2) return null;

  const tournamentName = block[0]?.trim() ?? UNKNOWN;
  const tournamentDate = block[1]?.trim() ?? UNKNOWN;
  const locationLine = block[2] && !isMatchRow(block[2]) ? block[2] : "";
  const { location, eventType } = locationLine
    ? splitLocationEvent(locationLine)
    : { location: UNKNOWN, eventType: UNKNOWN };

  return { tournamentName, tournamentDate, location, eventType };
}

function parseOpponentField(value: string): { name: string; ranking: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(.+?)\s*\((\d+)\)\s*$/);
  if (!match?.[1] || !match[2]) return null;

  return {
    name: match[1].trim(),
    ranking: match[2],
  };
}

function extractScore(line: string): { score: string; middle: string } | null {
  const match = line.match(SCORE_TAIL);
  if (!match?.[1] || match.index === undefined) return null;

  return {
    score: match[1].trim(),
    middle: line.slice(0, match.index).trim(),
  };
}

function parseMatchRow(line: string): {
  round: string;
  opponentName: string;
  opponentRanking: string;
  score: string;
  result: MatchResultOutcome;
  warnings: string[];
} {
  const warnings: string[] = [];
  const trimmed = line.trim();
  const roundMatch = trimmed.match(/^(\S+)\s+(.*)$/);
  if (!roundMatch?.[1] || !roundMatch[2]) {
    return {
      round: UNKNOWN,
      opponentName: UNKNOWN,
      opponentRanking: UNKNOWN,
      score: UNKNOWN,
      result: UNKNOWN,
      warnings: ["Could not parse match row"],
    };
  }

  const round = roundMatch[1];
  const scoreExtract = extractScore(roundMatch[2]);
  if (!scoreExtract) {
    warnings.push("Missing score");
  }

  const score = scoreExtract?.score ?? UNKNOWN;
  const beforeScore = scoreExtract?.middle ?? roundMatch[2];

  if (trimmed.includes("\t")) {
    const columns = trimmed.split("\t").map((column) => column.trim());
    const wins = columns[1] ?? "";
    const losses = columns[2] ?? "";
    const winsOpponent = parseOpponentField(wins);
    const lossesOpponent = parseOpponentField(losses);

    if (winsOpponent) {
      return {
        round,
        opponentName: winsOpponent.name,
        opponentRanking: winsOpponent.ranking,
        score,
        result: "WIN",
        warnings,
      };
    }
    if (lossesOpponent) {
      return {
        round,
        opponentName: lossesOpponent.name,
        opponentRanking: lossesOpponent.ranking,
        score,
        result: "LOSS",
        warnings,
      };
    }
  }

  const nameMatch = beforeScore.match(/([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*)*)\s*\((\d+)\)/);
  if (!nameMatch?.[1] || !nameMatch[2]) {
    warnings.push("Could not parse opponent");
    return {
      round,
      opponentName: UNKNOWN,
      opponentRanking: UNKNOWN,
      score,
      result: UNKNOWN,
      warnings,
    };
  }

  const opponentName = nameMatch[1].trim();
  const opponentRanking = nameMatch[2];
  const nameStartInLine = trimmed.indexOf(nameMatch[0]);
  const result: MatchResultOutcome = nameStartInLine >= 11 ? "LOSS" : "WIN";

  return {
    round,
    opponentName,
    opponentRanking,
    score,
    result,
    warnings,
  };
}

/** Parse manually pasted TRN activity text into reviewable match previews. */
export function parseTrnPaste(rawText: string): ParsedMatchPreview[] {
  const lines = normalizeLines(rawText);
  const blocks = splitTournamentBlocks(lines);
  const previews: ParsedMatchPreview[] = [];

  for (const block of blocks) {
    const metadata = parseTournamentMetadata(block);
    const matchLines = block.filter((line) => isMatchRow(line));

    for (const [index, line] of matchLines.entries()) {
      const parsed = parseMatchRow(line);
      const warnings = [...parsed.warnings];

      if (!metadata?.tournamentName) {
        warnings.push("Tournament name unknown");
      }
      if (!metadata?.tournamentDate) {
        warnings.push("Tournament date unknown");
      } else if (
        isTournamentDateLine(metadata.tournamentDate) &&
        !normalizeTrnTournamentDate(metadata.tournamentDate)
      ) {
        warnings.push("Could not normalize tournament date");
      }
      if (parsed.score === UNKNOWN) {
        warnings.push("Missing score");
      }
      if (parsed.opponentName === UNKNOWN) {
        warnings.push("Could not parse opponent");
      }
      if (parsed.result === UNKNOWN) {
        warnings.push("Win/Loss unknown");
      }

      const needsReview =
        warnings.length > 0 ||
        !metadata?.tournamentName ||
        !metadata?.tournamentDate ||
        parsed.opponentName === UNKNOWN ||
        parsed.score === UNKNOWN ||
        parsed.result === UNKNOWN;

      previews.push({
        key: `${slug(metadata?.tournamentName ?? "unknown")}-${slug(parsed.opponentName)}-${index}`,
        tournamentName: metadata?.tournamentName ?? UNKNOWN,
        tournamentDate: metadata?.tournamentDate ?? UNKNOWN,
        round: parsed.round,
        opponentName: parsed.opponentName,
        opponentRanking: parsed.opponentRanking,
        score: parsed.score,
        result: parsed.result,
        warnings,
        needsReview,
      });
    }
  }

  return previews;
}
