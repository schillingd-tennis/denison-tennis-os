import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

import { scheduleEventsToCsv } from "./display";
import { buildScheduleFilterDefinitions, filterScheduleEvents } from "./filters";
import { normalizeScheduleInput } from "./mapping";
import { computeScheduleKpis } from "./metrics";
import { DEFAULT_SEASON_YEAR, SEED_2026_27 } from "./seedData";
import { sortScheduleEvents } from "./sorting";
import { sharedDateOrDhLabel } from "./display";

const scheduleTableSource = readFileSync(
  path.join(process.cwd(), "src/features/teamSchedule/components/ScheduleTable.tsx"),
  "utf8",
);
const scheduleDashboardSource = readFileSync(
  path.join(process.cwd(), "src/features/teamSchedule/components/TeamScheduleDashboard.tsx"),
  "utf8",
);
const scheduleFormSource = readFileSync(
  path.join(process.cwd(), "src/features/teamSchedule/components/ScheduleForm.tsx"),
  "utf8",
);

describe("team schedule migration", () => {
  it("0038 defines team_schedule_events with enums, RLS, and seed", () => {
    const sql = readFileSync(
      path.join(process.cwd(), "supabase/migrations/0038_team_schedule_events.sql"),
      "utf8",
    );
    assert.match(sql, /create table if not exists public\.team_schedule_events/);
    assert.match(sql, /event_type in \('team_match', 'tournament', 'non_team_event', 'team_match_placeholder'\)/);
    assert.match(sql, /competition_date_group text/);
    assert.match(sql, /counts_as_competition_date boolean/);
    assert.match(sql, /enable row level security/);
    assert.match(sql, /Hotel Planner Tournament/);
    assert.match(sql, /2, '2', 'tournament', null, 'ITA Regionals'/);
  });
});

describe("2026–27 schedule semantics", () => {
  const events = SEED_2026_27;
  const kpis = computeScheduleKpis(events);

  it("1. has 20 countable competition dates", () => {
    assert.equal(kpis.countableDates, 20);
  });

  it("2. Hotel Planner does not count as competition date", () => {
    const hotel = events.find((e) => e.eventName === "Hotel Planner Tournament");
    assert.ok(hotel);
    assert.equal(hotel.countsAsCompetitionDate, false);
    assert.equal(hotel.competitionDateNumber, null);
  });

  it("3. ITA Regionals + Big Red Invite share date #2", () => {
    const group = events.filter((e) => e.competitionDateGroup === "2");
    assert.equal(group.length, 2);
    assert.equal(group.every((e) => e.competitionDateNumber === 2), true);
    assert.deepEqual(
      group.map((e) => e.eventName).sort(),
      ["Big Red Invite", "ITA Regionals"],
    );
  });

  it("4. OWU + Kenyon share date #12", () => {
    const group = events.filter((e) => e.competitionDateGroup === "12");
    assert.equal(group.length, 2);
    assert.deepEqual(
      group.map((e) => e.opponentName).sort(),
      ["Kenyon", "OWU"],
    );
  });

  it("5. Tufts + John Carroll share date #15", () => {
    const group = events.filter((e) => e.competitionDateGroup === "15");
    assert.equal(group.length, 2);
    assert.deepEqual(
      group.map((e) => e.opponentName).sort(),
      ["John Carroll", "Tufts"],
    );
  });
});

describe("schedule filters", () => {
  const events = SEED_2026_27;
  const definitions = buildScheduleFilterDefinitions();

  it("6. NCAC filter", () => {
    const filtered = filterScheduleEvents(events, {
      activeFilterIds: ["conference:ncac"],
      query: "",
      definitions,
      view: "all",
    });
    assert.ok(filtered.length > 0);
    assert.ok(filtered.every((e) => e.ncac));
  });

  it("7. Fall filter via view", () => {
    const filtered = filterScheduleEvents(events, {
      activeFilterIds: [],
      query: "",
      definitions,
      view: "fall",
    });
    assert.ok(filtered.every((e) => e.seasonSegment === "fall"));
    assert.equal(filtered.length, 5);
  });

  it("8. Spring filter via view", () => {
    const filtered = filterScheduleEvents(events, {
      activeFilterIds: [],
      query: "",
      definitions,
      view: "spring",
    });
    assert.ok(filtered.every((e) => e.seasonSegment === "spring"));
  });

  it("9. status filter", () => {
    const filtered = filterScheduleEvents(events, {
      activeFilterIds: ["status:tentative"],
      query: "",
      definitions,
      view: "all",
    });
    assert.ok(filtered.every((e) => e.status === "tentative"));
  });

  it("10. home/away/neutral filter", () => {
    const home = filterScheduleEvents(events, { activeFilterIds: ["site:home"], query: "", definitions, view: "all" });
    const away = filterScheduleEvents(events, { activeFilterIds: ["site:away"], query: "", definitions, view: "all" });
    const neutral = filterScheduleEvents(events, { activeFilterIds: ["site:neutral"], query: "", definitions, view: "all" });
    assert.ok(home.every((e) => e.siteDesignation === "home"));
    assert.ok(away.every((e) => e.siteDesignation === "away"));
    assert.ok(neutral.every((e) => e.siteDesignation === "neutral"));
  });

  it("search matches venue and event fields", () => {
    const filtered = filterScheduleEvents(events, {
      activeFilterIds: [],
      query: "Ohio Cup",
      definitions,
      view: "all",
    });
    assert.ok(filtered.some((e) => e.eventName === "The Ohio Cup"));
  });
});

describe("doubleheader and shared date display", () => {
  const events = SEED_2026_27;

  it("11. confirmed/potential DH and shared date labels", () => {
    const ita = events.find((e) => e.eventName === "ITA Regionals");
    const bigRed = events.find((e) => e.eventName === "Big Red Invite");
    assert.ok(ita && bigRed);
    assert.equal(sharedDateOrDhLabel(ita, events), "Shared Date #2");
    assert.equal(sharedDateOrDhLabel(bigRed, events), "Shared Date #2");

    const owu = events.find((e) => e.opponentName === "OWU");
    assert.equal(sharedDateOrDhLabel(owu!, events), "Confirmed DH");

    const washU = events.find((e) => e.opponentName === "Wash U");
    assert.equal(sharedDateOrDhLabel(washU!, events), "Potential DH");
  });
});

describe("sorting", () => {
  const events = SEED_2026_27;

  it("12. chronological sorting", () => {
    const sorted = sortScheduleEvents(events);
    for (let index = 1; index < sorted.length; index += 1) {
      assert.ok(sorted[index - 1].startDate <= sorted[index].startDate);
    }
  });

  it("13. shared-date rows stay adjacent", () => {
    const sorted = sortScheduleEvents(events);
    const indices = sorted
      .map((event, index) => ({ index, group: event.competitionDateGroup }))
      .filter((entry) => entry.group === "12")
      .map((entry) => entry.index);
    assert.equal(indices.length, 2);
    assert.equal(Math.abs(indices[0] - indices[1]), 1);
  });
});

describe("validation and metrics", () => {
  it("14. Add Match validation requires opponent or event and comp date when counting", () => {
    const missing = normalizeScheduleInput({ seasonYear: 2027, startDate: "2027-01-01", endDate: "2027-01-01" });
    assert.ok("error" in missing);

    const missingComp = normalizeScheduleInput({
      seasonYear: 2027,
      eventType: "team_match",
      opponentName: "Test U",
      startDate: "2027-01-01",
      endDate: "2027-01-01",
      siteDesignation: "home",
      seasonSegment: "spring",
      countsAsCompetitionDate: true,
    });
    assert.ok("error" in missingComp);
  });

  it("15. valid input normalizes shared group from comp date", () => {
    const parsed = normalizeScheduleInput({
      seasonYear: 2027,
      eventType: "team_match",
      opponentName: "Test U",
      startDate: "2027-01-01",
      endDate: "2027-01-01",
      siteDesignation: "home",
      seasonSegment: "spring",
      countsAsCompetitionDate: true,
      competitionDateNumber: 21,
    });
    assert.ok("input" in parsed);
    assert.equal(parsed.input.competitionDateGroup, "21");
  });

  it("16. summary metrics calculate correctly", () => {
    const kpis = computeScheduleKpis(SEED_2026_27);
    assert.equal(kpis.countableDates, 20);
    assert.equal(kpis.teamMatches, 16);
    assert.equal(kpis.ncacMatches, 8);
    assert.equal(kpis.tournamentsAndEvents, 8);
    assert.ok(kpis.tentativeOrTbd >= 5);
  });

  it("CSV export includes header and rows", () => {
    const csv = scheduleEventsToCsv(SEED_2026_27.slice(0, 2));
    assert.match(csv, /Comp Date #/);
    assert.match(csv, /Hotel Planner Tournament/);
  });

  it("default season year is 2027", () => {
    assert.equal(DEFAULT_SEASON_YEAR, 2027);
  });
});

describe("schedule table interactions", () => {
  it("22. every normal schedule row is clickable", () => {
    assert.match(scheduleTableSource, /cursor-pointer/);
    assert.match(scheduleTableSource, /onClick=\{\(\) => onEdit\(event\)\}/);
    assert.match(scheduleTableSource, /role="button"/);
    assert.match(scheduleTableSource, /tabIndex=\{0\}/);
  });

  it("23. row click opens edit via onEdit and keyboard Enter/Space", () => {
    assert.match(scheduleTableSource, /handleRowKeyDown/);
    assert.match(scheduleTableSource, /event\.key === "Enter" \|\| event\.key === " "/);
    assert.match(scheduleTableSource, /onEdit\(scheduleEvent\)/);
  });

  it("24. edit drawer receives record via openForm and Save Changes label", () => {
    assert.match(scheduleDashboardSource, /scheduleDrawerTitle/);
    assert.match(scheduleDashboardSource, /onEdit=\{openForm\}/);
    assert.match(scheduleFormSource, /Save Changes/);
    assert.match(scheduleFormSource, /event \? "Save Changes"/);
  });

  it("25. three-dot menu and delete do not trigger row navigation", () => {
    assert.match(scheduleTableSource, /stopRowNavigation/);
    assert.match(scheduleTableSource, /onMouseDown=\{stopRowNavigation\}/);
    assert.match(scheduleTableSource, /onClick=\{stopRowNavigation\}/);
    assert.match(scheduleTableSource, /onDelete\(event\)/);
  });

  it("26. shared-date companion rows remain independently editable", () => {
    const events = SEED_2026_27;
    const owu = events.find((event) => event.opponentName === "OWU");
    const kenyon = events.find((event) => event.opponentName === "Kenyon");
    assert.ok(owu && kenyon);
    assert.equal(owu.competitionDateGroup, kenyon.competitionDateGroup);
    assert.notEqual(owu.id, kenyon.id);
    assert.match(scheduleTableSource, /onClick=\{\(\) => onEdit\(event\)\}/);
  });

  it("27. search/filter state remains intact after save (upsert only)", () => {
    assert.match(scheduleDashboardSource, /function upsert/);
    const onSavedBlock = scheduleDashboardSource.match(/onSaved=\{\(saved\) => \{([\s\S]*?)\}\s*\}/);
    assert.ok(onSavedBlock, "onSaved handler should exist");
    assert.match(onSavedBlock![1]!, /upsert\(saved\)/);
    assert.match(onSavedBlock![1]!, /closeDrawer\(\)/);
    assert.doesNotMatch(onSavedBlock![1]!, /writeStoredScheduleDirectoryQuery/);
    assert.doesNotMatch(onSavedBlock![1]!, /writeStoredActiveScheduleFilters/);
    assert.doesNotMatch(onSavedBlock![1]!, /writeStoredScheduleDirectoryView/);
  });

  it("28. opponent cell uses identity mark component", () => {
    assert.match(scheduleTableSource, /ScheduleOpponentCell/);
    assert.match(scheduleTableSource, /RECRUITING_TABLE\.rowHover/);
  });
});
