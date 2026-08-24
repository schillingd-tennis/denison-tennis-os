import type { RecruitProfile } from "./types";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Calendar date only (`YYYY-MM-DD`). Strips a trailing time/offset without
 * timezone conversion so the day cannot shift.
 */
export function calendarDateOnly(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return match?.[1];
}

export function visitDateWireValue(
  raw: string,
): { error: string } | { value: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null };
  const date = calendarDateOnly(trimmed);
  if (!date) return { error: "Enter a valid date." };
  return { value: date };
}

export type VisitDateFieldKey = "visitStartDate" | "visitEndDate";

export type VisitDateActionPatch =
  | { visitStartDate: string | null }
  | { visitEndDate: string | null };

/** Exact `updateRecruitProfileAction` patch for one Visit date field. */
export function visitDateActionPatch(
  field: VisitDateFieldKey,
  raw: string,
): { error: string } | { next: string | null; patch: VisitDateActionPatch } {
  const parsed = visitDateWireValue(raw);
  if ("error" in parsed) return parsed;
  if (field === "visitStartDate") {
    return { next: parsed.value, patch: { visitStartDate: parsed.value } };
  }
  return { next: parsed.value, patch: { visitEndDate: parsed.value } };
}

export type PersistVisitDateResult =
  | { status: "skipped" }
  | { status: "invalid"; error: string }
  | { status: "saved"; patch: VisitDateActionPatch; profile: RecruitProfile }
  | { status: "failed"; patch: VisitDateActionPatch; error: string };

/**
 * Visit date save handler. One selection → one `update` call with
 * `{ visitStartDate | visitEndDate: "YYYY-MM-DD" | null }`.
 */
export async function persistVisitDateField(input: {
  personId: string;
  field: VisitDateFieldKey;
  raw: string;
  currentStored: string;
  visitStartDate: string | undefined;
  visitEndDate: string | undefined;
  update: (
    personId: string,
    patch: VisitDateActionPatch,
  ) => Promise<{ success: true; profile: RecruitProfile } | { success: false; error: string }>;
}): Promise<PersistVisitDateResult> {
  const prepared = visitDateActionPatch(input.field, input.raw);
  if ("error" in prepared) return { status: "invalid", error: prepared.error };

  const nextStart =
    input.field === "visitStartDate"
      ? prepared.next ?? undefined
      : calendarDateOnly(input.visitStartDate);
  const nextEnd =
    input.field === "visitEndDate"
      ? prepared.next ?? undefined
      : calendarDateOnly(input.visitEndDate);
  if (visitRangeInvalid(nextStart, nextEnd)) {
    return { status: "invalid", error: "End date cannot be before start date." };
  }

  if ((prepared.next ?? "") === input.currentStored) {
    return { status: "skipped" };
  }

  const result = await input.update(input.personId, prepared.patch);
  if (!result.success) {
    return { status: "failed", patch: prepared.patch, error: result.error };
  }
  return { status: "saved", patch: prepared.patch, profile: result.profile };
}

export function retainPendingVisitDates(
  incoming: RecruitProfile,
  current: RecruitProfile,
  pending: ReadonlySet<string>,
): RecruitProfile {
  return {
    ...incoming,
    visitStartDate: pending.has("visitStartDate")
      ? current.visitStartDate
      : calendarDateOnly(incoming.visitStartDate),
    visitEndDate: pending.has("visitEndDate")
      ? current.visitEndDate
      : calendarDateOnly(incoming.visitEndDate),
  };
}

export function applyVisitDateSaveResult(
  incoming: RecruitProfile,
  current: RecruitProfile,
  field: "visitStartDate" | "visitEndDate",
  written: string | null,
  pending: ReadonlySet<string>,
): RecruitProfile {
  const merged = retainPendingVisitDates(incoming, current, pending);
  const incomingDate = calendarDateOnly(incoming[field]);
  return {
    ...merged,
    [field]: incomingDate ?? (written || undefined),
  };
}

export function visitRangeInvalid(
  startDate: string | undefined,
  endDate: string | undefined,
): boolean {
  if (!startDate || !endDate) return false;
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end) return false;
  return end.getTime() < start.getTime();
}

/** Inclusive calendar days. Missing/invalid/inverted range → null. */
export function visitDayCount(
  startDate: string | undefined,
  endDate: string | undefined,
): number | null {
  if (!startDate || !endDate) return null;
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (diff < 0) return null;
  return diff + 1;
}
