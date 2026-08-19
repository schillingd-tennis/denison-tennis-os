import assert from "node:assert/strict";
import { test } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";

import { matrixToCsv } from "./csv";
import { generateExportFile } from "./generate";
import { buildExportMatrix, initialFieldIdsForPreset, resolveExportFields } from "./matrix";
import { PLAYER_NAME_FIELD_ID } from "./personFields";
import { availableWhoOptions, resolveExportRows } from "./resolveRows";
import { TEAM_EXPORT_MODULE, TEAM_EXPORT_PRESETS } from "./teamPresets";

function person(partial: Partial<Person> & Pick<Person, "id" | "firstName" | "lastName">): Person {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    relationships: [],
    roleId: "role-player",
    statusId: "status-current",
    role: { id: "role-player", key: ROLE_KEYS.player, label: "Player" },
    status: { id: "status-current", key: STATUS_KEYS.current, label: "Current" },
    ...partial,
  };
}

const peter = person({
  id: "player-peter",
  firstName: "Peter",
  lastName: "Berns",
  major: "Economics",
  minor: "French",
  gpa: 3.52,
  gpaLastSemester: 3.4,
  gpaLastYear: 3.5,
  tShirtSize: "Medium",
  driFitSize: "Medium",
  racket: "Wilson Blade",
  string: "Luxilon ALU Power",
  shoeSize: 10.5,
});

const emptyGear = person({
  id: "player-empty",
  firstName: "Ada",
  lastName: "Player",
  major: "",
});

const roster = [peter, emptyGear];

function preset(id: string) {
  const found = TEAM_EXPORT_PRESETS.find((entry) => entry.id === id);
  assert.ok(found, `missing preset ${id}`);
  return found;
}

test("Team presets include Academics, Equipment, Personal Info, Directory, Travel, Custom", () => {
  assert.deepEqual(
    TEAM_EXPORT_PRESETS.map((entry) => entry.id),
    ["playerDirectory", "personalInfo", "academics", "equipment", "travel", "custom"],
  );
});

test("Academics preset fields match Team Academics architecture", () => {
  assert.deepEqual(preset("academics").fieldIds, [
    "playerName",
    "major",
    "minor",
    "gpa",
    "gpaLastSemester",
    "gpaLastYear",
  ]);
});

test("Equipment preset includes Player Name and all 12 Person equipment fields", () => {
  assert.deepEqual(preset("equipment").fieldIds, [
    "playerName",
    "tShirtSize",
    "driFitSize",
    "collaredShirtSize",
    "longSleeveSize",
    "jacketSize",
    "hoodieSize",
    "shortsSize",
    "pantsSize",
    "shoeSize",
    "racket",
    "gripSize",
    "string",
  ]);
});

test("Travel preset uses existing exportable travel fields only", () => {
  const ids = preset("travel").fieldIds;
  assert.equal(ids[0], "playerName");
  assert.ok(ids.includes("dateOfBirth"));
  assert.ok(ids.includes("seatPreference"));
  assert.ok(!ids.includes("passportNumber"));
  assert.ok(!ids.includes("socialSecurityNumber"));
});

test("found-set who uses the supplied found-set rows, not all rows", () => {
  const found = resolveExportRows("found_set", { all: roster, foundSet: [peter] });
  assert.equal(found.length, 1);
  assert.equal(found[0], peter);
  assert.equal(resolveExportRows("all", { all: roster, foundSet: [peter] }).length, 2);
});

test("current who exports exactly one row", () => {
  const rows = resolveExportRows("current", { all: roster, current: peter });
  assert.equal(rows.length, 1);
  assert.equal(rows[0], peter);
});

test("who options omit found-set and selection unless supplied", () => {
  assert.deepEqual(availableWhoOptions({ all: roster, current: peter }), ["current", "all"]);
  assert.deepEqual(availableWhoOptions({ all: roster, foundSet: [peter] }), ["all", "found_set"]);
  assert.deepEqual(
    availableWhoOptions({
      all: roster,
      foundSet: [peter],
      selection: [peter],
      current: peter,
    }),
    ["current", "all", "found_set", "selection"],
  );
});

test("Academics Excel/CSV matrix: headers, numbers, blanks, row counts", () => {
  const fields = resolveExportFields(TEAM_EXPORT_MODULE.fields, preset("academics").fieldIds);
  const matrix = buildExportMatrix(roster, fields);

  assert.deepEqual(matrix.headers, [
    "Player Name",
    "Major",
    "Minor",
    "Overall GPA",
    "GPA Last Semester",
    "GPA Last Year",
  ]);
  assert.equal(matrix.rows.length, 2);
  assert.deepEqual(matrix.rows[0], ["Peter Berns", "Economics", "French", 3.52, 3.4, 3.5]);
  assert.deepEqual(matrix.rows[1], ["Ada Player", null, null, null, null, null]);

  const csv = matrixToCsv(matrix.headers, matrix.rows);
  assert.ok(csv.startsWith("Player Name,Major,Minor,Overall GPA,GPA Last Semester,GPA Last Year\r\n"));
  assert.ok(csv.includes("Peter Berns,Economics,French,3.52,3.4,3.5"));
  assert.ok(csv.includes("Ada Player,,,,,"));
  assert.ok(!csv.includes("—"));
  assert.ok(!csv.includes("No data"));

  const xlsx = generateExportFile({
    module: TEAM_EXPORT_MODULE,
    rows: roster,
    fieldIds: preset("academics").fieldIds,
    format: "xlsx",
    presetId: "academics",
    who: "all",
  });
  assert.equal(xlsx.rowCount, 2);
  assert.match(xlsx.filename, /^Team-Academics-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const bytes = xlsx.body as Uint8Array;
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);

  const csvFile = generateExportFile({
    module: TEAM_EXPORT_MODULE,
    rows: [peter],
    fieldIds: preset("academics").fieldIds,
    format: "csv",
    presetId: "academics",
    who: "found_set",
  });
  assert.equal(csvFile.rowCount, 1);
  assert.match(csvFile.filename, /\.csv$/);
});

test("Equipment exports saved values and blank cells for empty attributes", () => {
  const fields = resolveExportFields(TEAM_EXPORT_MODULE.fields, preset("equipment").fieldIds);
  const matrix = buildExportMatrix(roster, fields);
  const tShirt = matrix.headers.indexOf("T-shirt Size");
  const racket = matrix.headers.indexOf("Racket");
  const string = matrix.headers.indexOf("String");
  const shoe = matrix.headers.indexOf("Shoe Size");
  const collared = matrix.headers.indexOf("Collared Shirt Size");

  assert.ok(tShirt >= 0 && racket >= 0 && string >= 0 && shoe >= 0);
  assert.equal(matrix.rows[0][tShirt], "Medium");
  assert.equal(matrix.rows[0][racket], "Wilson Blade");
  assert.equal(matrix.rows[0][string], "Luxilon ALU Power");
  assert.equal(matrix.rows[0][shoe], 10.5);
  assert.equal(matrix.rows[0][collared], null);
  assert.equal(matrix.rows[1][tShirt], null);
  assert.equal(matrix.rows[1][racket], null);
});

test("Custom selection preserves order and headers", () => {
  const fieldIds = [PLAYER_NAME_FIELD_ID, "major", "racket"];
  const fields = resolveExportFields(TEAM_EXPORT_MODULE.fields, fieldIds);
  const matrix = buildExportMatrix([peter], fields);
  assert.deepEqual(matrix.headers, ["Player Name", "Major", "Racket"]);
  assert.deepEqual(matrix.rows[0], ["Peter Berns", "Economics", "Wilson Blade"]);
});

test("Custom preset starts from default Player Name only", () => {
  assert.deepEqual(initialFieldIdsForPreset(preset("custom"), TEAM_EXPORT_MODULE.defaultFieldIds), [
    PLAYER_NAME_FIELD_ID,
  ]);
});
