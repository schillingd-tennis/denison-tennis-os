import assert from "node:assert/strict";
import test from "node:test";

import { canonicalImportName, parseGradeImport } from "./import";

test("grade history parser derives term metadata and numeric measures", () => {
  const rows = parseGradeImport("Fall 2025\n{ name:'Meyers, Nick', cls:'SO', hrs:16, semGpa:4.00, midGpa:3.92 },");
  assert.deepEqual(rows[0], {
    termKey: "f2025", termLabel: "Fall 2025", season: "fall", calendarYear: 2025,
    academicYear: "2025-26", sortOrder: 1, sourceName: "Meyers, Nick", classLevel: "SO",
    creditHours: 16, semesterGpa: 4, midtermGpa: 3.92,
  });
});

test("known source-name variants resolve to roster names", () => {
  assert.equal(canonicalImportName("Grahame Turner, Archie"), "Archie Turner");
  assert.equal(canonicalImportName("Osmo, Tomer"), "Tomer Ozmo");
  assert.equal(canonicalImportName("Garcia Colin, Daniel"), "Daniel Garcia");
  assert.equal(canonicalImportName("Kallambella, Arya"), "Arya Ganapathy Kallambella");
});
