/**
 * Conservative CSV import for Team Operations → Scouting.
 * Source: data/scouting-reports.csv (43 logical rows). Treat CSV as data only.
 */
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";

export type Handedness = "Right" | "Left" | "";

export type DirectReportSource = "csv_import" | "coach_entry" | "player_form";

export type ImportRowKind =
  | "player_report"
  | "compound_opponent"
  | "team_level"
  | "unresolved_incomplete";

export type NormalizedCsvRow = {
  rowIndex: number;
  sourceKey: string;
  kind: ImportRowKind;
  dateRaw: string;
  matchDate: string | null;
  opponentRaw: string;
  opponentDisplayName: string;
  teamRaw: string;
  teamDisplayName: string;
  handednessRaw: string;
  handedness: Handedness;
  strengthsWeaknesses: string;
  scoutingReport: string;
  reportBy: string;
  isDoubles: boolean;
  isDoublesRaw: string;
  attachmentRefs: string[];
  decision: string;
  /** Exact player name for linking when kind=player_report; null for compound/team/unresolved. */
  playerLinkName: string | null;
};

export type ImportAudit = {
  sourceLogicalRows: number;
  rowsImported: number;
  rowsUnresolved: number;
  teams: Record<string, number>;
  opponentPlayersCreated: number;
  compoundOpponentRecords: number;
  repeatedPlayerGroups: Array<{ team: string; name: string; count: number; sourceKeys: string[] }>;
  teamLevelRecords: number;
  amherstFileReferences: string[];
  decisions: Array<{ rowIndex: number; opponent: string; team: string; decision: string }>;
};

const COMPOUND_PATTERN =
  /\band\b|\s\/\s|\/|\s&\s|\+|,\s*(?=[A-Z])/i;

/** Names that look like two players jammed without a separator (e.g. "Ethan Wu Case Fagan"). */
function looksLikeUnspacedCompound(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  // 4+ tokens with no separator is ambiguous; keep as compound display, do not invent players.
  // Exception: we still link exact repeats of the same display string across rows.
  return parts.length >= 4;
}

export function normalizeTeamDisplayName(raw: string): string {
  return raw.trim();
}

export function normalizeHandedness(raw: string): Handedness {
  const t = raw.trim().toLowerCase();
  if (!t) return "";
  if (t.startsWith("right")) return "Right";
  if (t.startsWith("left")) return "Left";
  return "";
}

/** Parse CSV date like 6/27/2026 → 2026-06-27; invalid/blank → null. */
export function parseMatchDate(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDoublesFlag(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  return t === "true" || t === "1" || t === "yes";
}

/** Safe title-ish caps for single-player names; preserve unclear / compound raw. */
export function safeCapsPersonName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (COMPOUND_PATTERN.test(trimmed) || looksLikeUnspacedCompound(trimmed)) {
    return trimmed;
  }
  return trimmed
    .split(" ")
    .map((part) => {
      if (!part) return part;
      // Preserve all-caps initials / parentheticals as-is when mixed
      if (part.includes("(") || part.includes(")")) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

export function normalizePlayerKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isCompoundOpponentName(name: string): boolean {
  const t = name.trim();
  if (!t) return false;
  if (/^TEAM\b/i.test(t)) return false;
  return COMPOUND_PATTERN.test(t) || looksLikeUnspacedCompound(t);
}

export function isTeamLevelOpponent(name: string): boolean {
  return /^TEAM\b/i.test(name.trim());
}

export function parseAttachmentRefs(scoutingReport: string): string[] {
  return scoutingReport
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /\.pdf$/i.test(part));
}

export function directReportSourceKey(input: {
  dateRaw: string;
  opponentRaw: string;
  teamRaw: string;
  reportBy: string;
  strengthsWeaknesses: string;
  scoutingReport: string;
  isDoublesRaw: string;
  rowIndex: number;
}): string {
  const payload = [
    "scouting-reports.csv",
    input.rowIndex,
    input.dateRaw,
    input.opponentRaw,
    input.teamRaw,
    input.reportBy,
    input.strengthsWeaknesses,
    input.scoutingReport,
    input.isDoublesRaw,
  ].join("\u001f");
  return createHash("md5").update(payload).digest("hex");
}

export function classifyCsvRow(input: {
  rowIndex: number;
  dateRaw: string;
  opponentRaw: string;
  teamRaw: string;
  handednessRaw: string;
  strengthsWeaknesses: string;
  scoutingReport: string;
  reportBy: string;
  doublesRaw: string;
}): NormalizedCsvRow {
  const dateRaw = input.dateRaw.trim();
  const opponentRaw = input.opponentRaw.trim();
  const teamRaw = input.teamRaw.trim();
  const strengthsWeaknesses = input.strengthsWeaknesses; // preserve internal newlines/bullets
  const scoutingReport = input.scoutingReport;
  const reportBy = input.reportBy.trim();
  const isDoublesRaw = input.doublesRaw.trim();
  const isDoubles = parseDoublesFlag(isDoublesRaw);
  const matchDate = parseMatchDate(dateRaw);
  const handedness = normalizeHandedness(input.handednessRaw);
  const teamDisplayName = normalizeTeamDisplayName(teamRaw);
  const sourceKey = directReportSourceKey({
    dateRaw,
    opponentRaw,
    teamRaw,
    reportBy,
    strengthsWeaknesses,
    scoutingReport,
    isDoublesRaw,
    rowIndex: input.rowIndex,
  });

  if (isTeamLevelOpponent(opponentRaw)) {
    const attachmentRefs = parseAttachmentRefs(scoutingReport);
    return {
      rowIndex: input.rowIndex,
      sourceKey,
      kind: "team_level",
      dateRaw,
      matchDate,
      opponentRaw,
      opponentDisplayName: opponentRaw,
      teamRaw,
      teamDisplayName,
      handednessRaw: input.handednessRaw.trim(),
      handedness,
      strengthsWeaknesses,
      scoutingReport,
      reportBy,
      isDoubles,
      isDoublesRaw,
      attachmentRefs,
      decision:
        "Team-level Amherst record. PDF filenames stored as attachment refs only (files unavailable until uploaded). Not a player.",
      playerLinkName: null,
    };
  }

  if (!dateRaw && !opponentRaw) {
    return {
      rowIndex: input.rowIndex,
      sourceKey,
      kind: "unresolved_incomplete",
      dateRaw,
      matchDate,
      opponentRaw,
      opponentDisplayName: opponentRaw,
      teamRaw,
      teamDisplayName,
      handednessRaw: input.handednessRaw.trim(),
      handedness,
      strengthsWeaknesses,
      scoutingReport,
      reportBy,
      isDoubles,
      isDoublesRaw,
      attachmentRefs: [],
      decision:
        "Incomplete Chicago row (no date/opponent). Marked unresolved import-review. Author/handedness/notes preserved. No player invented.",
      playerLinkName: null,
    };
  }

  if (isCompoundOpponentName(opponentRaw)) {
    return {
      rowIndex: input.rowIndex,
      sourceKey,
      kind: "compound_opponent",
      dateRaw,
      matchDate,
      opponentRaw,
      opponentDisplayName: opponentRaw,
      teamRaw,
      teamDisplayName,
      handednessRaw: input.handednessRaw.trim(),
      handedness,
      strengthsWeaknesses,
      scoutingReport,
      reportBy,
      isDoubles,
      isDoublesRaw,
      attachmentRefs: [],
      decision:
        "Compound/ambiguous opponent display preserved unresolved. No fuzzy player invent. Doubles flag left exactly as CSV.",
      playerLinkName: null,
    };
  }

  const playerLinkName = safeCapsPersonName(opponentRaw);
  return {
    rowIndex: input.rowIndex,
    sourceKey,
    kind: "player_report",
    dateRaw,
    matchDate,
    opponentRaw,
    opponentDisplayName: playerLinkName || opponentRaw,
    teamRaw,
    teamDisplayName,
    handednessRaw: input.handednessRaw.trim(),
    handedness,
    strengthsWeaknesses,
    scoutingReport,
    reportBy,
    isDoubles,
    isDoublesRaw,
    attachmentRefs: [],
    decision: "Single-player direct match report. Linked by exact normalized name+team.",
    playerLinkName: playerLinkName || opponentRaw,
  };
}

export type CsvSourceRow = {
  Date?: string;
  Opponent?: string;
  Team?: string;
  "Handed (Right or Left)"?: string;
  "Strengths / Weaknesses"?: string;
  "Report by..."?: string;
  "Scouting Report"?: string;
  Doubles?: string;
};

export function parseScoutingCsv(csvText: string): NormalizedCsvRow[] {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  }) as CsvSourceRow[];

  return records.map((record, rowIndex) =>
    classifyCsvRow({
      rowIndex,
      dateRaw: record.Date ?? "",
      opponentRaw: record.Opponent ?? "",
      teamRaw: record.Team ?? "",
      handednessRaw: record["Handed (Right or Left)"] ?? "",
      strengthsWeaknesses: record["Strengths / Weaknesses"] ?? "",
      scoutingReport: record["Scouting Report"] ?? "",
      reportBy: record["Report by..."] ?? "",
      doublesRaw: record.Doubles ?? "",
    }),
  );
}

export function buildImportAudit(rows: NormalizedCsvRow[]): ImportAudit {
  const teams: Record<string, number> = {};
  for (const row of rows) {
    teams[row.teamDisplayName] = (teams[row.teamDisplayName] ?? 0) + 1;
  }

  const playerKeys = new Map<string, { team: string; name: string; sourceKeys: string[] }>();
  for (const row of rows) {
    if (row.kind !== "player_report" || !row.playerLinkName) continue;
    const key = `${row.teamDisplayName}\u001f${normalizePlayerKey(row.playerLinkName)}`;
    const existing = playerKeys.get(key);
    if (existing) existing.sourceKeys.push(row.sourceKey);
    else {
      playerKeys.set(key, {
        team: row.teamDisplayName,
        name: row.playerLinkName,
        sourceKeys: [row.sourceKey],
      });
    }
  }

  const amherst = rows.find((row) => row.kind === "team_level");

  return {
    sourceLogicalRows: rows.length,
    rowsImported: rows.filter((row) => row.kind !== "unresolved_incomplete").length +
      rows.filter((row) => row.kind === "unresolved_incomplete").length,
    rowsUnresolved: rows.filter(
      (row) => row.kind === "unresolved_incomplete" || row.kind === "compound_opponent",
    ).length,
    teams,
    opponentPlayersCreated: playerKeys.size,
    compoundOpponentRecords: rows.filter((row) => row.kind === "compound_opponent").length,
    repeatedPlayerGroups: [...playerKeys.values()]
      .filter((group) => group.sourceKeys.length > 1)
      .map((group) => ({
        team: group.team,
        name: group.name,
        count: group.sourceKeys.length,
        sourceKeys: group.sourceKeys,
      })),
    teamLevelRecords: rows.filter((row) => row.kind === "team_level").length,
    amherstFileReferences: amherst?.attachmentRefs ?? [],
    decisions: rows.map((row) => ({
      rowIndex: row.rowIndex,
      opponent: row.opponentDisplayName || "(blank)",
      team: row.teamDisplayName,
      decision: row.decision,
    })),
  };
}

/** Stable team import key from display name. */
export function teamImportKey(displayName: string): string {
  return createHash("md5")
    .update(`scouting-team:${normalizePlayerKey(displayName)}`)
    .digest("hex");
}

export function playerImportKey(teamDisplayName: string, playerName: string): string {
  return createHash("md5")
    .update(
      `scouting-player:${normalizePlayerKey(teamDisplayName)}:${normalizePlayerKey(playerName)}`,
    )
    .digest("hex");
}
