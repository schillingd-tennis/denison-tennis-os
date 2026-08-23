import { createHash } from "node:crypto";

import type { RecruitingPlan, TournamentStatus } from "./types";

export const TOURNAMENT_CSV_HEADERS = [
  "Attended",
  "Tournament Name",
  "Level",
  "Open / Closed",
  "Status",
  "Start Date",
  "End Date",
  "City, State",
  "Tournament Page",
  "Distance from Columbus (mi)",
  "Surface",
  "Notes / Start Times",
  "Additional Notes",
  "Recruits Attending",
] as const;

export type TournamentCsvRow = Record<string, string>;

export type TournamentImportRecord = {
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  venue: string | null;
  surface: string | null;
  status: TournamentStatus;
  recruiting_plan: RecruitingPlan;
  website_url: string | null;
  notes: string | null;
  source_key: string;
  attended: boolean | null;
  level: string | null;
  entry_type: string | null;
  lifecycle_status: "past" | "upcoming" | null;
  distance_from_columbus: string | null;
  additional_notes: string | null;
  recruits_attending_text: string | null;
};

export type MappedImportRow = {
  sourceIndex: number;
  record: TournamentImportRecord;
  warnings: string[];
};

export type InvalidImportRow = {
  sourceIndex: number;
  name: string;
  reasons: string[];
};

export function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim();
}

export function cell(row: TournamentCsvRow, header: string): string {
  const key = Object.keys(row).find((candidate) => normalizeHeader(candidate) === header);
  return key ? String(row[key] ?? "").trim() : "";
}

export function parseCsvDate(raw: string): { iso: string | null; invalid: boolean } {
  const value = raw.trim();
  if (!value) return { iso: null, invalid: false };
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return { iso: `${iso[1]}-${iso[2]}-${iso[3]}`, invalid: false };
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    const year = Number(slash[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return { iso: null, invalid: true };
    }
    return { iso: date.toISOString().slice(0, 10), invalid: false };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return { iso: null, invalid: true };
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return { iso: `${year}-${month}-${day}`, invalid: false };
}

export function parseAttended(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value === "true" || value === "yes" || value === "1") return true;
  if (value === "false" || value === "no" || value === "0") return false;
  return null;
}

export function parseLifecycle(raw: string): "past" | "upcoming" | null {
  const value = raw.trim().toLowerCase();
  if (value === "past") return "past";
  if (value === "upcoming") return "upcoming";
  return null;
}

export function recruitingPlanFromCsv(attended: boolean | null, lifecycle: "past" | "upcoming" | null): RecruitingPlan {
  if (attended === true) return lifecycle === "past" ? "completed" : "traveling";
  if (attended === false) return "watching";
  return "considering";
}

export function operationalStatusFromCsv(lifecycle: "past" | "upcoming" | null, attended: boolean | null): TournamentStatus {
  if (lifecycle === "past") return "completed";
  if (attended === true) return "confirmed";
  return "planned";
}

export function sourceKeyFor(name: string, startDate: string | null, location: string | null): string {
  const source = `${name}|${startDate ?? ""}|${location ?? ""}`;
  return `csv:${createHash("sha256").update(source).digest("hex").slice(0, 32)}`;
}

export function mapTournamentCsvRow(row: TournamentCsvRow, index: number): MappedImportRow | InvalidImportRow {
  const sourceIndex = index + 2;
  const name = cell(row, "Tournament Name");
  const reasons: string[] = [];
  if (!name) reasons.push("Tournament Name is required.");

  const start = parseCsvDate(cell(row, "Start Date"));
  const end = parseCsvDate(cell(row, "End Date"));
  if (start.invalid) reasons.push(`Start Date is not a usable date: ${cell(row, "Start Date")}`);
  if (end.invalid) reasons.push(`End Date is not a usable date: ${cell(row, "End Date")}`);
  if (start.iso && end.iso && end.iso < start.iso) {
    reasons.push("End Date is before Start Date.");
  }

  const attendedRaw = cell(row, "Attended");
  const attended = parseAttended(attendedRaw);
  if (attendedRaw && attended === null) reasons.push(`Attended is not true/false: ${attendedRaw}`);

  const lifecycleRaw = cell(row, "Status");
  const lifecycle = parseLifecycle(lifecycleRaw);
  if (lifecycleRaw && !lifecycle) reasons.push(`Status is not Past/Upcoming: ${lifecycleRaw}`);

  if (reasons.length > 0) {
    return { sourceIndex, name: name || "(unnamed)", reasons };
  }

  const location = cell(row, "City, State") || null;
  const warnings: string[] = [];
  if (!start.iso) warnings.push("Start Date is blank.");
  if (!lifecycle) warnings.push("CSV Status is blank.");

  return {
    sourceIndex,
    warnings,
    record: {
      name,
      start_date: start.iso,
      end_date: end.iso,
      location,
      venue: null,
      surface: cell(row, "Surface") || null,
      status: operationalStatusFromCsv(lifecycle, attended),
      recruiting_plan: recruitingPlanFromCsv(attended, lifecycle),
      website_url: cell(row, "Tournament Page") || null,
      notes: cell(row, "Notes / Start Times") || null,
      source_key: sourceKeyFor(name, start.iso, location),
      attended,
      level: cell(row, "Level") || null,
      entry_type: cell(row, "Open / Closed") || null,
      lifecycle_status: lifecycle,
      distance_from_columbus: cell(row, "Distance from Columbus (mi)") || null,
      additional_notes: cell(row, "Additional Notes") || null,
      recruits_attending_text: cell(row, "Recruits Attending") || null,
    },
  };
}

export function unmappedHeaders(headers: readonly string[]): string[] {
  const known = new Set(TOURNAMENT_CSV_HEADERS);
  return headers
    .map(normalizeHeader)
    .filter((header) => header.length > 0 && !known.has(header as (typeof TOURNAMENT_CSV_HEADERS)[number]));
}
