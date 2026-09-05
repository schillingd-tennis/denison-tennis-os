import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { sortItems } from "@/components/data-table/sorting";

import {
  DRILL_LIBRARY_COLUMNS,
  SEEDED_DRILL_COUNT,
  buildDrillFilterDefinitions,
  buildDrillLibraryRows,
  filterDrillLibraryRows,
  formatDrillLastUsed,
  matchesDrillSearch,
  matchesDrillView,
  type DrillLibraryRow,
} from "./drillLibraryModel";
import type { DailyPracticePlan, PracticeDrill } from "./types";

function drill(partial: Partial<PracticeDrill> & Pick<PracticeDrill, "id" | "name">): PracticeDrill {
  return {
    description: "",
    tags: [],
    sourceTags: "",
    category: "Drills",
    notes: "",
    frequency: "",
    ...partial,
  };
}

test("seeded Drills.csv migration still contains exactly 26 drills", () => {
  const sql = readFileSync(
    path.join(process.cwd(), "supabase/migrations/0045_practice_drills.sql"),
    "utf8",
  );
  const valueRows = [...sql.matchAll(/^\s*\('/gm)];
  assert.equal(valueRows.length, SEEDED_DRILL_COUNT);
  assert.equal(SEEDED_DRILL_COUNT, 26);
});

test("usage metrics derive from practice plans without duplicate counters", () => {
  const drills = [
    drill({ id: "a", name: "Serve + 1", tags: ["Serve"] }),
    drill({ id: "b", name: "Cash Drill", category: "Games", tags: ["Doubles"] }),
  ];
  const plans: DailyPracticePlan[] = [
    {
      id: "p1",
      planDate: "2026-08-01",
      title: "Practice",
      startTime: "",
      endTime: "",
      location: "",
      announcements: "",
      focus: "",
      countable: true,
      status: "completed",
      drills: [drills[0], drills[0], drills[1]],
    },
    {
      id: "p2",
      planDate: "2026-09-01",
      title: "Practice",
      startTime: "",
      endTime: "",
      location: "",
      announcements: "",
      focus: "",
      countable: true,
      status: "completed",
      drills: [drills[0]],
    },
  ];

  const rows = buildDrillLibraryRows(drills, plans);
  assert.equal(rows.find((row) => row.id === "a")?.timesUsed, 2);
  assert.equal(rows.find((row) => row.id === "a")?.lastUsed, "2026-09-01");
  assert.equal(rows.find((row) => row.id === "b")?.timesUsed, 1);
  assert.equal(rows.find((row) => row.id === "b")?.competitive, true);
  assert.equal(formatDrillLastUsed(null), "—");
});

test("search matches name, description, category, focus, and objective notes", () => {
  const row = buildDrillLibraryRows(
    [
      drill({
        id: "1",
        name: "Return + 1",
        description: "Aggressive first ball",
        category: "Drills",
        tags: ["Returns", "Serve"],
        notes: "pressure return patterns",
      }),
    ],
    [],
  )[0];

  assert.equal(matchesDrillSearch(row, "return"), true);
  assert.equal(matchesDrillSearch(row, "aggressive"), true);
  assert.equal(matchesDrillSearch(row, "Drills"), true);
  assert.equal(matchesDrillSearch(row, "Serve"), true);
  assert.equal(matchesDrillSearch(row, "pressure"), true);
  assert.equal(matchesDrillSearch(row, "volley"), false);
});

test("views and filters narrow the found set", () => {
  const drills = [
    drill({ id: "1", name: "Serve + 1", tags: ["Serve"], category: "Drills" }),
    drill({ id: "2", name: "Cash Drill", tags: ["Doubles"], category: "Games" }),
    drill({ id: "3", name: "Middle Forehands", tags: ["Forehand"], category: "Drills" }),
  ];
  const plans: DailyPracticePlan[] = [
    {
      id: "p1",
      planDate: "2026-09-01",
      title: "Practice",
      startTime: "",
      endTime: "",
      location: "",
      announcements: "",
      focus: "",
      countable: true,
      status: "completed",
      drills: [drills[0]],
    },
  ];
  const rows = buildDrillLibraryRows(drills, plans);
  const definitions = buildDrillFilterDefinitions(rows);

  assert.equal(matchesDrillView(rows[1], "competitive"), true);
  assert.equal(matchesDrillView(rows[0], "serve-return"), true);
  assert.equal(matchesDrillView(rows[1], "doubles"), true);
  assert.equal(matchesDrillView(rows[2], "never-used"), true);
  assert.equal(matchesDrillView(rows[0], "recently-used", new Date("2026-09-05T12:00:00Z")), true);

  const competitive = filterDrillLibraryRows(rows, {
    query: "",
    view: "competitive",
    activeFilterIds: [],
    definitions,
  });
  assert.deepEqual(competitive.map((row) => row.id), ["2"]);

  const filtered = filterDrillLibraryRows(rows, {
    query: "",
    view: "all",
    activeFilterIds: ["focus:Serve"],
    definitions,
  });
  assert.deepEqual(filtered.map((row) => row.id), ["1"]);
});

test("default name sort is ascending and category sort works", () => {
  const rows: DrillLibraryRow[] = buildDrillLibraryRows(
    [
      drill({ id: "b", name: "Zebra Drill", category: "Games" }),
      drill({ id: "a", name: "Alpha Drill", category: "Drills" }),
      drill({ id: "c", name: "Mid Drill", category: "Drills" }),
    ],
    [],
  );

  const byName = sortItems(rows, { key: "name", direction: "asc" }, DRILL_LIBRARY_COLUMNS);
  assert.deepEqual(
    byName.map((row) => row.name),
    ["Alpha Drill", "Mid Drill", "Zebra Drill"],
  );

  const byCategory = sortItems(rows, { key: "category", direction: "asc" }, DRILL_LIBRARY_COLUMNS);
  assert.equal(byCategory[0].category, "Drills");
  assert.equal(byCategory[byCategory.length - 1].category, "Games");
});
