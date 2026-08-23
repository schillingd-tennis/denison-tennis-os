import { createHash } from "node:crypto";

import { INTERACTION_TYPES, type InteractionType } from "./types";

export const INTERACTION_SOURCE_SYSTEM = "coda_interactions_contacts_csv";

export type InteractionCsvRow = {
  Player: string;
  Date: string;
  "Contact Type": string;
  "Tournament (if applicable)": string;
  "Interaction Notes": string;
  "Next Steps": string;
  "Logged By": string;
  "Image 8"?: string;
};

export type RecruitCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  label: string;
};

export type TournamentCandidate = {
  id: string;
  name: string;
};

/**
 * Explicit CSV label → OS tournament name.
 * Only confirmed alternate spellings of the same event. Never a guess.
 */
export const TOURNAMENT_ALIASES: Record<string, string> = {};

/**
 * Explicit Coda Player label → OS recruit name keys.
 * Only confirmed identity aliases. Never a fuzzy guess.
 *
 * Coda/xlsx stored "Enzo Badotti Cariani" as Person first_name Enzo,
 * last_name Cariani (`recruit-xlsx-row-106`). Enzo Carvalho is a different recruit.
 */
export const PERSON_ALIASES: Record<string, string> = {
  "enzo badotti cariani": "enzo cariani",
};

/**
 * Coda Interactions _ Contacts.csv row 143 source-data correction.
 * Contact Type is blank; the note is "Emailed to set up a call".
 * This is not a general blank-Contact-Type → email rule.
 */
const JARREN_GRIFFIN_EMAIL_OVERRIDE = {
  player: "Jarren Griffin",
  date: "7/12/2026",
  notes: "Emailed to set up a call",
  type: "email" as const,
};

/**
 * Coda row 177: one IMG conversation about multiple recruits
 * (Ricards, Rafa, Enzo, Grant). Intentionally excluded until the OS can
 * associate one interaction with multiple recruits.
 *
 * TODO: the OS may eventually support interactions associated with multiple
 * recruits. Do not import this row as a single-recruit record until then.
 */
const MULTI_RECRUIT_IMG_EXCLUSION = {
  date: "6/30/2026",
  notesIncludes: "Phone Call wit Jenn Porchier",
};

/**
 * Explicit Coda Contact Type values → OS interaction_type.
 * Unknown source values are not coerced to "other".
 */
export const CONTACT_TYPE_MAP: Record<string, InteractionType> = {
  call: "call",
  "phone call": "call",
  text: "text",
  email: "email",
  message: "message",
  visit: "visit",
  "campus visit": "visit",
  meeting: "meeting",
  note: "note",
};

export type RecruitMatch =
  | { status: "missing_player" }
  | { status: "unmatched"; player: string }
  | { status: "ambiguous"; player: string; candidates: RecruitCandidate[] }
  | { status: "matched"; recruit: RecruitCandidate };

export type TournamentMatch =
  | { status: "empty" }
  | { status: "matched"; csvName: string; tournament: TournamentCandidate }
  | { status: "unmatched"; csvName: string };

export type ContactTypeMatch =
  | { status: "mapped"; source: string; type: InteractionType }
  | { status: "unknown"; source: string }
  | { status: "empty" };

export type DateMatch =
  | { status: "ok"; iso: string }
  | { status: "empty"; source: string }
  | { status: "invalid"; source: string };

export type SkipReason =
  | "missing_player"
  | "unmatched_person"
  | "ambiguous_person"
  | "unmatched_tournament"
  | "unknown_type"
  | "invalid_date";

export type ReadyInteractionRecord = {
  recruit_person_id: string;
  tournament_id: string | null;
  occurred_at: string;
  interaction_type: InteractionType;
  channel: string | null;
  direction: "unknown";
  notes: string | null;
  next_steps: string | null;
  logged_by: string | null;
  source_system: typeof INTERACTION_SOURCE_SYSTEM;
  source_key: string;
};

export type MappedInteractionRow = {
  rowNumber: number;
  player: string;
  notesPreview: string;
  sourceDate: string;
  sourceType: string;
  csvTournament: string | null;
  matchedTournamentName: string | null;
  sourceKey: string;
  existing: boolean;
  record: ReadyInteractionRecord;
};

export type SkippedInteractionRow = {
  rowNumber: number;
  player: string;
  notesPreview: string;
  sourceDate: string;
  sourceType: string;
  csvTournament: string | null;
  reasons: SkipReason[];
  detail: string;
  candidates?: RecruitCandidate[];
};

export type ExcludedInteractionRow = {
  rowNumber: number;
  player: string;
  notesPreview: string;
  sourceDate: string;
  sourceType: string;
  csvTournament: string | null;
  loggedBy: string;
  reason: string;
};

export type ImportAnalysis = {
  totalRows: number;
  emptySourceRows: ExcludedInteractionRow[];
  intentionallyExcluded: ExcludedInteractionRow[];
  actualInteractionRows: number;
  ready: MappedInteractionRow[];
  skipped: SkippedInteractionRow[];
  blockingErrors: number;
  missingPlayer: SkippedInteractionRow[];
  unmatchedPeople: SkippedInteractionRow[];
  ambiguousPeople: SkippedInteractionRow[];
  unmatchedTournaments: SkippedInteractionRow[];
  unknownTypes: SkippedInteractionRow[];
  invalidDates: SkippedInteractionRow[];
  existingSourceKeys: MappedInteractionRow[];
  contactTypeMappings: { source: string; normalized: InteractionType | "UNRESOLVED" }[];
  tournamentMatches: { csvName: string; osName: string | "UNRESOLVED" }[];
};

const SKIP_PRIORITY: SkipReason[] = [
  "missing_player",
  "invalid_date",
  "unknown_type",
  "unmatched_person",
  "ambiguous_person",
  "unmatched_tournament",
];

export function normalizePersonName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stripParentheticals(value: string): string {
  return value.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function addNameKey(keys: Set<string>, value: string): void {
  const normalized = normalizePersonName(value);
  if (normalized) keys.add(normalized);
}

export function personNameKeys(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const keys = new Set<string>();
  addNameKey(keys, trimmed);
  addNameKey(keys, stripParentheticals(trimmed));
  const nicknames = [...trimmed.matchAll(/\(([^)]+)\)/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  const parts = stripParentheticals(trimmed).split(/\s+/).filter(Boolean);
  const last = parts.at(-1) ?? "";
  for (const nick of nicknames) {
    if (last) addNameKey(keys, `${nick} ${last}`);
    addNameKey(keys, nick);
  }
  return [...keys];
}

export function recruitNameKeys(recruit: RecruitCandidate): string[] {
  const keys = new Set<string>();
  for (const first of [recruit.firstName, recruit.preferredName]) {
    if (!first?.trim() || !recruit.lastName.trim()) continue;
    for (const key of personNameKeys(`${first} ${recruit.lastName}`)) keys.add(key);
  }
  return [...keys];
}

export function buildRecruitIndex(recruits: RecruitCandidate[]): Map<string, RecruitCandidate[]> {
  const index = new Map<string, RecruitCandidate[]>();
  for (const recruit of recruits) {
    for (const key of recruitNameKeys(recruit)) {
      const existing = index.get(key) ?? [];
      if (!existing.some((item) => item.id === recruit.id)) existing.push(recruit);
      index.set(key, existing);
    }
  }
  return index;
}

export function matchRecruit(player: string, index: Map<string, RecruitCandidate[]>): RecruitMatch {
  if (!player.trim()) return { status: "missing_player" };
  const found = new Map<string, RecruitCandidate>();
  const keys = personNameKeys(player);
  for (const key of keys) {
    const aliased = PERSON_ALIASES[key];
    if (aliased) keys.push(aliased);
  }
  for (const key of keys) {
    for (const candidate of index.get(key) ?? []) found.set(candidate.id, candidate);
  }
  const unique = [...found.values()];
  if (unique.length === 1) return { status: "matched", recruit: unique[0] };
  if (unique.length > 1) return { status: "ambiguous", player: player.trim(), candidates: unique };
  return { status: "unmatched", player: player.trim() };
}

export function matchTournament(
  csvName: string,
  tournaments: TournamentCandidate[],
): TournamentMatch {
  const trimmed = csvName.trim();
  if (!trimmed) return { status: "empty" };
  const aliased = TOURNAMENT_ALIASES[normalizePersonName(trimmed)] ?? trimmed;
  const wanted = normalizePersonName(aliased);
  const matches = tournaments.filter((tournament) => normalizePersonName(tournament.name) === wanted);
  if (matches.length === 1) {
    return { status: "matched", csvName: trimmed, tournament: matches[0] };
  }
  return { status: "unmatched", csvName: trimmed };
}

export function mapContactType(raw: string): ContactTypeMatch {
  const source = raw.trim();
  if (!source) return { status: "empty" };
  const type = CONTACT_TYPE_MAP[normalizePersonName(source)];
  if (type && (INTERACTION_TYPES as readonly string[]).includes(type)) {
    return { status: "mapped", source, type };
  }
  return { status: "unknown", source };
}

export function parseInteractionDate(raw: string): DateMatch {
  const source = raw.trim();
  if (!source) return { status: "empty", source };
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(source);
  if (slash) return utcDate(Number(slash[3]), Number(slash[1]), Number(slash[2]), source);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(source);
  if (iso) return utcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]), source);
  return { status: "invalid", source };
}

function utcDate(year: number, month: number, day: number, source: string): DateMatch {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { status: "invalid", source };
  }
  return { status: "ok", iso: date.toISOString() };
}

export function sourceKeyFor(row: InteractionCsvRow): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        row.Player,
        row.Date,
        row["Contact Type"],
        row["Tournament (if applicable)"],
        row["Interaction Notes"],
        row["Next Steps"],
        row["Logged By"],
      ]),
    )
    .digest("hex");
}

function previewNotes(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 137)}...`;
}

function nullable(value: string): string | null {
  return value.trim() || null;
}

const INTERACTION_FIELDS: (keyof InteractionCsvRow)[] = [
  "Player",
  "Date",
  "Contact Type",
  "Tournament (if applicable)",
  "Interaction Notes",
  "Next Steps",
  "Logged By",
];

export function isEmptySourceRow(row: InteractionCsvRow): boolean {
  return INTERACTION_FIELDS.every((field) => !String(row[field] ?? "").trim());
}

export function isMultiRecruitExclusion(row: InteractionCsvRow): boolean {
  const notes = row["Interaction Notes"] ?? "";
  return (
    !String(row.Player ?? "").trim() &&
    notes.includes(MULTI_RECRUIT_IMG_EXCLUSION.notesIncludes) &&
    notes.includes("IMG")
  );
}

export function contactTypeOverride(row: InteractionCsvRow): InteractionType | null {
  if (String(row["Contact Type"] ?? "").trim()) return null;
  if (normalizePersonName(row.Player ?? "") !== normalizePersonName(JARREN_GRIFFIN_EMAIL_OVERRIDE.player)) {
    return null;
  }
  if ((row.Date ?? "").trim() !== JARREN_GRIFFIN_EMAIL_OVERRIDE.date) return null;
  if ((row["Interaction Notes"] ?? "").trim() !== JARREN_GRIFFIN_EMAIL_OVERRIDE.notes) return null;
  return JARREN_GRIFFIN_EMAIL_OVERRIDE.type;
}

function excludedRow(
  rowNumber: number,
  row: InteractionCsvRow,
  reason: string,
): ExcludedInteractionRow {
  return {
    rowNumber,
    player: (row.Player ?? "").trim(),
    notesPreview: previewNotes(row["Interaction Notes"] ?? ""),
    sourceDate: row.Date ?? "",
    sourceType: row["Contact Type"] ?? "",
    csvTournament: nullable(row["Tournament (if applicable)"] ?? ""),
    loggedBy: (row["Logged By"] ?? "").trim(),
    reason,
  };
}

export function analyzeInteractionRows(
  rows: InteractionCsvRow[],
  recruits: RecruitCandidate[],
  tournaments: TournamentCandidate[],
  existingKeys: Iterable<string> = [],
): ImportAnalysis {
  const index = buildRecruitIndex(recruits);
  const existing = new Set(existingKeys);
  const ready: MappedInteractionRow[] = [];
  const skipped: SkippedInteractionRow[] = [];
  const emptySourceRows: ExcludedInteractionRow[] = [];
  const intentionallyExcluded: ExcludedInteractionRow[] = [];
  const missingPlayer: SkippedInteractionRow[] = [];
  const unmatchedPeople: SkippedInteractionRow[] = [];
  const ambiguousPeople: SkippedInteractionRow[] = [];
  const unmatchedTournaments: SkippedInteractionRow[] = [];
  const unknownTypes: SkippedInteractionRow[] = [];
  const invalidDates: SkippedInteractionRow[] = [];
  const typeSources = new Map<string, InteractionType | "UNRESOLVED">();
  const tournamentSeen = new Map<string, string | "UNRESOLVED">();

  rows.forEach((row, offset) => {
    const rowNumber = offset + 2;
    if (isEmptySourceRow(row)) {
      emptySourceRows.push(excludedRow(rowNumber, row, "IGNORED — EMPTY SOURCE ROW"));
      return;
    }
    if (isMultiRecruitExclusion(row)) {
      intentionallyExcluded.push(
        excludedRow(
          rowNumber,
          row,
          "INTENTIONALLY EXCLUDED — MULTI-RECRUIT INTERACTION (Ricards, Rafa, Enzo, Grant)",
        ),
      );
      return;
    }

    const player = row.Player ?? "";
    const sourceDate = row.Date ?? "";
    const sourceType = row["Contact Type"] ?? "";
    const csvTournament = nullable(row["Tournament (if applicable)"] ?? "");
    const notesPreview = previewNotes(row["Interaction Notes"] ?? "");
    const reasons: SkipReason[] = [];
    const details: string[] = [];
    let candidates: RecruitCandidate[] | undefined;

    const recruitMatch = matchRecruit(player, index);
    if (recruitMatch.status === "missing_player") {
      reasons.push("missing_player");
      details.push("Player is empty");
    } else if (recruitMatch.status === "unmatched") {
      reasons.push("unmatched_person");
      details.push(`Unmatched recruit "${recruitMatch.player}"`);
    } else if (recruitMatch.status === "ambiguous") {
      reasons.push("ambiguous_person");
      candidates = recruitMatch.candidates;
      details.push(
        `Ambiguous recruit "${recruitMatch.player}" (${recruitMatch.candidates.map((item) => item.label).join(", ")})`,
      );
    }

    const dateMatch = parseInteractionDate(sourceDate);
    if (dateMatch.status !== "ok") {
      reasons.push("invalid_date");
      details.push(dateMatch.status === "empty" ? "Date is empty" : `Invalid date "${dateMatch.source}"`);
    }

    const overrideType = contactTypeOverride(row);
    const typeMatch: ContactTypeMatch = overrideType
      ? {
          status: "mapped",
          source: `${sourceType || "(empty)"} [source-data correction → ${overrideType}]`,
          type: overrideType,
        }
      : mapContactType(sourceType);
    if (typeMatch.status === "mapped") {
      typeSources.set(typeMatch.source, typeMatch.type);
    } else {
      reasons.push("unknown_type");
      typeSources.set(typeMatch.status === "empty" ? "(empty)" : typeMatch.source, "UNRESOLVED");
      details.push(
        typeMatch.status === "empty" ? "Contact Type is empty" : `Unknown Contact Type "${typeMatch.source}"`,
      );
    }

    const tournamentMatch = matchTournament(row["Tournament (if applicable)"] ?? "", tournaments);
    if (tournamentMatch.status === "matched") {
      tournamentSeen.set(tournamentMatch.csvName, tournamentMatch.tournament.name);
    } else if (tournamentMatch.status === "unmatched") {
      reasons.push("unmatched_tournament");
      tournamentSeen.set(tournamentMatch.csvName, "UNRESOLVED");
      details.push(`Unmatched tournament "${tournamentMatch.csvName}"`);
    }

    if (reasons.length > 0) {
      const skippedRow: SkippedInteractionRow = {
        rowNumber,
        player: player.trim(),
        notesPreview,
        sourceDate,
        sourceType,
        csvTournament,
        reasons,
        detail: details.join("; "),
        candidates,
      };
      skipped.push(skippedRow);
      if (reasons.includes("missing_player")) missingPlayer.push(skippedRow);
      if (reasons.includes("unmatched_person")) unmatchedPeople.push(skippedRow);
      if (reasons.includes("ambiguous_person")) ambiguousPeople.push(skippedRow);
      if (reasons.includes("unmatched_tournament")) unmatchedTournaments.push(skippedRow);
      if (reasons.includes("unknown_type")) unknownTypes.push(skippedRow);
      if (reasons.includes("invalid_date")) invalidDates.push(skippedRow);
      return;
    }

    if (recruitMatch.status !== "matched" || dateMatch.status !== "ok" || typeMatch.status !== "mapped") {
      return;
    }

    const sourceKey = sourceKeyFor(row);
    ready.push({
      rowNumber,
      player: recruitMatch.recruit.label,
      notesPreview,
      sourceDate,
      sourceType,
      csvTournament,
      matchedTournamentName: tournamentMatch.status === "matched" ? tournamentMatch.tournament.name : null,
      sourceKey,
      existing: existing.has(sourceKey),
      record: {
        recruit_person_id: recruitMatch.recruit.id,
        tournament_id: tournamentMatch.status === "matched" ? tournamentMatch.tournament.id : null,
        occurred_at: dateMatch.iso,
        interaction_type: typeMatch.type,
        channel: nullable(sourceType),
        direction: "unknown",
        notes: nullable(row["Interaction Notes"] ?? ""),
        next_steps: nullable(row["Next Steps"] ?? ""),
        logged_by: nullable(row["Logged By"] ?? ""),
        source_system: INTERACTION_SOURCE_SYSTEM,
        source_key: sourceKey,
      },
    });
  });

  return {
    totalRows: rows.length,
    emptySourceRows,
    intentionallyExcluded,
    actualInteractionRows: rows.length - emptySourceRows.length - intentionallyExcluded.length,
    ready,
    skipped,
    blockingErrors: skipped.length,
    missingPlayer,
    unmatchedPeople,
    ambiguousPeople,
    unmatchedTournaments,
    unknownTypes,
    invalidDates,
    existingSourceKeys: ready.filter((row) => row.existing),
    contactTypeMappings: [...typeSources.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([source, normalized]) => ({ source, normalized })),
    tournamentMatches: [...tournamentSeen.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([csvName, osName]) => ({ csvName, osName })),
  };
}

export function exclusiveSkipCount(analysis: ImportAnalysis, reason: SkipReason): number {
  return analysis.skipped.filter((row) => primarySkipReason(row) === reason).length;
}

export function primarySkipReason(row: SkippedInteractionRow): SkipReason {
  for (const reason of SKIP_PRIORITY) {
    if (row.reasons.includes(reason)) return reason;
  }
  return row.reasons[0] ?? "unmatched_person";
}

export function canApply(analysis: ImportAnalysis): boolean {
  return analysis.blockingErrors === 0;
}

export function applyBlockedReasons(analysis: ImportAnalysis): SkipReason[] {
  const blocked: SkipReason[] = [];
  if (analysis.unmatchedPeople.length) blocked.push("unmatched_person");
  if (analysis.ambiguousPeople.length) blocked.push("ambiguous_person");
  if (analysis.missingPlayer.length) blocked.push("missing_player");
  if (analysis.unmatchedTournaments.length) blocked.push("unmatched_tournament");
  if (analysis.unknownTypes.length) blocked.push("unknown_type");
  if (analysis.invalidDates.length) blocked.push("invalid_date");
  return blocked;
}
