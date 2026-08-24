import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { getWritableRecruitProfileFieldMap } from "./fieldCatalog";
import {
  recruitProfilePatchToRow,
  rowToRecruitProfile,
  type RecruitProfileRow,
} from "./supabaseMapping";
import type { RecruitProfile } from "./types";
import {
  applyVisitDateSaveResult,
  calendarDateOnly,
  persistVisitDateField,
  retainPendingVisitDates,
  visitDateWireValue,
  visitDayCount,
} from "./visitDays";

function profile(overrides: Partial<RecruitProfile> = {}): RecruitProfile {
  return {
    id: "rp-1",
    personId: "p-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function row(overrides: Partial<RecruitProfileRow> = {}): RecruitProfileRow {
  return {
    id: "rp-1",
    person_id: "p-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    recruit_type_id: null,
    pipeline_stage_id: null,
    interest_id: null,
    outcome_id: null,
    coda_pipeline_stage: null,
    coda_interest: null,
    priority_id: null,
    getability_id: null,
    focus: null,
    recruit_class_year: null,
    coach_rank: null,
    gpa: null,
    sat: null,
    act: null,
    academic_interests: null,
    preread_status_id: null,
    preread_scholarship_amount: null,
    schools_of_interest: null,
    school_chosen: null,
    notes: null,
    game_notes: null,
    key_pitch_angle: null,
    visit_start_date: null,
    visit_end_date: null,
    travel_type: null,
    flight_info: null,
    coda_row_id: null,
    coda_export: null,
    ...overrides,
  };
}

test("Start Date retains its entered YYYY-MM-DD value", () => {
  const parsed = visitDateWireValue("2026-08-20");
  assert.deepEqual(parsed, { value: "2026-08-20" });
  const saved = applyVisitDateSaveResult(
    profile(),
    profile({ visitStartDate: "2026-08-20" }),
    "visitStartDate",
    "2026-08-20",
    new Set(),
  );
  assert.equal(saved.visitStartDate, "2026-08-20");
});

test("End Date retains its entered YYYY-MM-DD value", () => {
  const parsed = visitDateWireValue("2026-08-22");
  assert.deepEqual(parsed, { value: "2026-08-22" });
  const saved = applyVisitDateSaveResult(
    profile(),
    profile({ visitEndDate: "2026-08-22" }),
    "visitEndDate",
    "2026-08-22",
    new Set(),
  );
  assert.equal(saved.visitEndDate, "2026-08-22");
});

test("correct database field names are submitted", () => {
  const map = getWritableRecruitProfileFieldMap();
  assert.equal(map.visitStartDate, "visit_start_date");
  assert.equal(map.visitEndDate, "visit_end_date");
  assert.deepEqual(recruitProfilePatchToRow({ visitStartDate: "2026-08-20" }), {
    visit_start_date: "2026-08-20",
  });
  assert.deepEqual(recruitProfilePatchToRow({ visitEndDate: "2026-08-22" }), {
    visit_end_date: "2026-08-22",
  });
});

test("dates use YYYY-MM-DD and ignore timezone timestamps", () => {
  assert.equal(calendarDateOnly("2026-08-20"), "2026-08-20");
  assert.equal(calendarDateOnly("2026-08-20T00:00:00.000Z"), "2026-08-20");
  assert.equal(calendarDateOnly("2026-08-20T04:00:00+00:00"), "2026-08-20");
  const parsed = visitDateWireValue("2026-08-20T00:00:00.000Z");
  assert.deepEqual(parsed, { value: "2026-08-20" });
});

test("clearing a date submits null", () => {
  assert.deepEqual(visitDateWireValue(""), { value: null });
  assert.deepEqual(visitDateWireValue("   "), { value: null });
  assert.deepEqual(recruitProfilePatchToRow({ visitStartDate: null }), {
    visit_start_date: null,
  });
  assert.deepEqual(recruitProfilePatchToRow({ visitEndDate: null }), {
    visit_end_date: null,
  });
});

test("a pending edit is not overwritten by stale incoming data", () => {
  const current = profile({ visitStartDate: "2026-08-20", visitEndDate: "2026-08-22" });
  const incoming = profile({ notes: "stale snapshot" });
  const kept = retainPendingVisitDates(incoming, current, new Set(["visitStartDate"]));
  assert.equal(kept.visitStartDate, "2026-08-20");
  assert.equal(kept.notes, "stale snapshot");
});

test("dates remain after data reload", () => {
  const reloaded = rowToRecruitProfile(
    row({
      visit_start_date: "2026-08-20",
      visit_end_date: "2026-08-22T00:00:00.000Z",
    }),
  );
  assert.equal(reloaded.visitStartDate, "2026-08-20");
  assert.equal(reloaded.visitEndDate, "2026-08-22");
});

test("inclusive Number of Days still calculates correctly", () => {
  assert.equal(visitDayCount("2026-08-20", "2026-08-20"), 1);
  assert.equal(visitDayCount("2026-08-20", "2026-08-21"), 2);
  assert.equal(visitDayCount("2026-08-20", "2026-08-22"), 3);
});

test("save handler sends visitStartDate YYYY-MM-DD to updateRecruitProfileAction", async () => {
  const calls: { personId: string; patch: unknown }[] = [];
  const result = await persistVisitDateField({
    personId: "p-1",
    field: "visitStartDate",
    raw: "2026-08-24",
    currentStored: "",
    visitStartDate: undefined,
    visitEndDate: undefined,
    update: async (personId, patch) => {
      calls.push({ personId, patch });
      return { success: true, profile: profile({ visitStartDate: "2026-08-24" }) };
    },
  });
  assert.deepEqual(calls, [{ personId: "p-1", patch: { visitStartDate: "2026-08-24" } }]);
  assert.equal(result.status, "saved");
  if (result.status === "saved") {
    assert.deepEqual(result.patch, { visitStartDate: "2026-08-24" });
  }
});

test("save handler sends visitEndDate null when the date is cleared", async () => {
  const calls: unknown[] = [];
  const result = await persistVisitDateField({
    personId: "p-1",
    field: "visitEndDate",
    raw: "",
    currentStored: "2026-08-24",
    visitStartDate: "2026-08-24",
    visitEndDate: "2026-08-24",
    update: async (_personId, patch) => {
      calls.push(patch);
      return { success: true, profile: profile({ visitStartDate: "2026-08-24" }) };
    },
  });
  assert.deepEqual(calls, [{ visitEndDate: null }]);
  assert.equal(result.status, "saved");
});

test("one selection produces one update call", async () => {
  let updates = 0;
  await persistVisitDateField({
    personId: "p-1",
    field: "visitStartDate",
    raw: "2026-08-24",
    currentStored: "2026-08-24",
    visitStartDate: "2026-08-24",
    visitEndDate: undefined,
    update: async () => {
      updates += 1;
      return { success: true, profile: profile({ visitStartDate: "2026-08-24" }) };
    },
  });
  assert.equal(updates, 0);
});

test("Visit dates use an always-mounted native date input, not InlineEditCell", () => {
  const fields = readFileSync(
    path.join(process.cwd(), "src/features/recruiting/components/RecruitProfileFields.tsx"),
    "utf8",
  );
  const visitInput = readFileSync(
    path.join(process.cwd(), "src/features/recruiting/components/VisitDateField.tsx"),
    "utf8",
  );
  assert.match(fields, /field === "visitStartDate" \|\| field === "visitEndDate"/);
  assert.match(fields, /<VisitDateField/);
  assert.match(visitInput, /type="date"/);
  assert.match(visitInput, /saveVisitDate/);
  assert.doesNotMatch(visitInput, /InlineEditCell/);
});

test("Visit date input commits currentTarget YYYY-MM-DD without InlineEditCell", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/features/recruiting/components/VisitDateField.tsx"),
    "utf8",
  );
  assert.match(source, /event\.currentTarget\.value/);
  assert.match(source, /type="date"/);
  assert.doesNotMatch(source, /onRequestEdit/);
});
