import assert from "node:assert/strict";
import test from "node:test";

import { mapTournamentCsvRow, parseCsvDate } from "./csvImport";

test("maps the supplied Tournaments.csv headers", () => {
  const result = mapTournamentCsvRow(
    {
      Attended: "true",
      "Tournament Name": "Donovan Showcase",
      Level: "Showcase",
      "Open / Closed": "Open",
      Status: "Past",
      "Start Date": "6/24/2025",
      "End Date": "",
      "City, State": "Princeton, NJ",
      "Tournament Page": "",
      "Distance from Columbus (mi)": "442",
      Surface: "",
      "Notes / Start Times": "",
      "Additional Notes": "",
      "Recruits Attending": "",
    },
    0,
  );
  assert.equal("record" in result, true);
  if (!("record" in result)) return;
  assert.equal(result.record.name, "Donovan Showcase");
  assert.equal(result.record.start_date, "2025-06-24");
  assert.equal(result.record.location, "Princeton, NJ");
  assert.equal(result.record.level, "Showcase");
  assert.equal(result.record.lifecycle_status, "past");
  assert.equal(result.record.attended, true);
  assert.equal(result.record.recruiting_plan, "completed");
  assert.equal(result.record.status, "completed");
  assert.match(result.record.source_key, /^csv:[a-f0-9]{32}$/);
});

test("parses named end dates", () => {
  const parsed = parseCsvDate("Fri, May 29, 2026");
  assert.equal(parsed.invalid, false);
  assert.equal(parsed.iso, "2026-05-29");
});

test("requires a tournament name", () => {
  const result = mapTournamentCsvRow({ "City, State": "Columbus, OH" }, 2);
  assert.equal("reasons" in result, true);
  if (!("reasons" in result)) return;
  assert.match(result.reasons[0] ?? "", /Tournament Name/);
});
