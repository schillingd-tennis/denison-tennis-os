import assert from "node:assert/strict";
import test from "node:test";

import { TOURNAMENT_CSV_HEADERS } from "./csvImport";
import { TOURNAMENT_FIELD_INVENTORY } from "./fieldInventory";

test("every Tournaments.csv header is in the field inventory", () => {
  const csvNames = new Set(
    TOURNAMENT_FIELD_INVENTORY.map((field) => field.csv).filter((value) => value !== null),
  );
  for (const header of TOURNAMENT_CSV_HEADERS) {
    assert.ok(csvNames.has(header), `missing inventory row for ${header}`);
  }
});

test("user-managed tournament fields are marked editable", () => {
  const userFields = TOURNAMENT_FIELD_INVENTORY.filter((field) => field.kind === "user");
  assert.ok(userFields.length >= 14);
  for (const field of userFields) {
    assert.equal(field.editable, true, `${field.db} should be editable`);
    assert.equal(field.displayed, true, `${field.db} should be displayed`);
  }
});
