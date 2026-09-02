import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

import { typeBadgeForEvent } from "./display";
import { buildScheduleFilterDefinitions, filterScheduleEvents } from "./filters";
import {
  applyInlinePatch,
  buildInlinePatch,
  inlinePatchIsNoOp,
  scheduleEventToInput,
} from "./scheduleInline";
import { SEED_2026_27 } from "./seedData";
import { SCHEDULE_STATUS_LABELS } from "./types";

const scheduleTableSource = readFileSync(
  path.join(process.cwd(), "src/features/teamSchedule/components/ScheduleTable.tsx"),
  "utf8",
);
const inlineCellsSource = readFileSync(
  path.join(process.cwd(), "src/features/teamSchedule/components/ScheduleInlineCells.tsx"),
  "utf8",
);
const opponentCellSource = readFileSync(
  path.join(process.cwd(), "src/features/teamSchedule/components/ScheduleOpponentCell.tsx"),
  "utf8",
);
const scheduleChromeSource = readFileSync(
  path.join(process.cwd(), "src/features/teamSchedule/components/scheduleTableChrome.tsx"),
  "utf8",
);

describe("schedule inline patch building", () => {
  const washU = SEED_2026_27.find((event) => event.opponentName === "Wash U");

  it("1. inline ITA rank edit builds a valid patch", () => {
    assert.ok(washU);
    const result = buildInlinePatch(washU!, "itaRank", "8");
    assert.ok("patch" in result);
    assert.equal(result.patch.itaRank, 8);
  });

  it("2. inline time edit builds a valid patch", () => {
    assert.ok(washU);
    const result = buildInlinePatch(washU!, "timeText", "2:00 PM");
    assert.ok("patch" in result);
    assert.equal(result.patch.timeText, "2:00 PM");
  });

  it("3. inline site edit builds a valid patch", () => {
    const result = buildInlinePatch(washU!, "siteDesignation", "neutral");
    assert.ok("patch" in result);
    assert.equal(result.patch.siteDesignation, "neutral");
  });

  it("4. inline status edit builds a valid patch", () => {
    const result = buildInlinePatch(washU!, "status", "confirmed");
    assert.ok("patch" in result);
    assert.equal(result.patch.status, "confirmed");
  });

  it("5. inline type edit builds a valid patch", () => {
    const result = buildInlinePatch(washU!, "eventType", "tournament");
    assert.ok("patch" in result);
    assert.equal(result.patch.eventType, "tournament");
  });

  it("6. inline doubleheader edit builds a valid patch", () => {
    const result = buildInlinePatch(washU!, "doubleheaderStatus", "confirmed");
    assert.ok("patch" in result);
    assert.equal(result.patch.doubleheaderStatus, "confirmed");
  });

  it("7. inline officials edit builds a valid patch", () => {
    const result = buildInlinePatch(washU!, "officialsNeeded", "3");
    assert.ok("patch" in result);
    assert.equal(result.patch.officialsNeeded, 3);
  });

  it("8. successful patch merges into schedule input for persistence", () => {
    const patch = buildInlinePatch(washU!, "timeText", "1:30 PM");
    assert.ok("patch" in patch);
    const merged = { ...scheduleEventToInput(washU!), ...patch.patch };
    assert.equal(merged.timeText, "1:30 PM");
    assert.equal(merged.opponentName, washU!.opponentName);
  });

  it("9. failed validation leaves the prior value unchanged", () => {
    const invalid = buildInlinePatch(washU!, "itaRank", "abc");
    assert.ok("error" in invalid);
    const optimistic = applyInlinePatch(washU!, {});
    assert.equal(optimistic.itaRank, washU!.itaRank);
  });

  it("competition date patch preserves shared date group", () => {
    const owu = SEED_2026_27.find((event) => event.opponentName === "OWU");
    assert.ok(owu);
    const result = buildInlinePatch(owu!, "competitionDateNumber", "12");
    assert.ok("patch" in result);
    assert.equal(result.patch.competitionDateNumber, 12);
    assert.equal(result.patch.competitionDateGroup, owu!.competitionDateGroup);
  });

  it("opponent inline edit updates opponent name for team matches", () => {
    const result = buildInlinePatch(washU!, "opponentOrEvent", "Washington University");
    assert.ok("patch" in result);
    assert.equal(result.patch.opponentName, "Washington University");
  });

  it("no-op detection skips unchanged values", () => {
    assert.equal(
      inlinePatchIsNoOp(washU!, { status: washU!.status, timeText: washU!.timeText }),
      true,
    );
  });
});

describe("schedule inline display labels", () => {
  const events = SEED_2026_27;

  it("12. type labels are title case", () => {
    const tournament = events.find((event) => event.eventName === "ITA Regionals");
    const teamMatch = events.find((event) => event.opponentName === "Wash U");
    const springBreak = events.find((event) => event.eventName === "Spring Break #1");
    assert.ok(tournament && teamMatch && springBreak);
    assert.equal(typeBadgeForEvent(tournament).label, "Tournament");
    assert.equal(typeBadgeForEvent(teamMatch).label, "Non-Conf");
    assert.equal(typeBadgeForEvent(springBreak).label, "Spring Break");
  });

  it("13. status labels are title case", () => {
    assert.equal(SCHEDULE_STATUS_LABELS.confirmed, "Confirmed");
    assert.equal(SCHEDULE_STATUS_LABELS.tentative, "Tentative");
    assert.equal(SCHEDULE_STATUS_LABELS.cancelled, "Cancelled");
  });

  it("14. NCAC remains uppercase", () => {
    const ncacMatch = events.find((event) => event.opponentName === "Kenyon");
    assert.ok(ncacMatch?.ncac);
    assert.equal(typeBadgeForEvent(ncacMatch).label, "NCAC");
  });

  it("15. TBD remains uppercase", () => {
    assert.equal(SCHEDULE_STATUS_LABELS.tbd, "TBD");
  });
});

describe("schedule inline filter response", () => {
  it("16. active filters respond correctly after inline status edit", () => {
    const definitions = buildScheduleFilterDefinitions();
    const tentative = SEED_2026_27.filter((event) => event.status === "tentative");
    assert.ok(tentative.length > 0);

    const target = tentative[0]!;
    const filteredBefore = filterScheduleEvents(SEED_2026_27, {
      activeFilterIds: ["status:tentative"],
      query: "",
      definitions,
      view: "all",
    });
    assert.ok(filteredBefore.some((event) => event.id === target.id));

    const patch = buildInlinePatch(target, "status", "confirmed");
    assert.ok("patch" in patch);
    const updated = applyInlinePatch(target, patch.patch);
    const nextEvents = SEED_2026_27.map((event) => (event.id === updated.id ? updated : event));
    const filteredAfter = filterScheduleEvents(nextEvents, {
      activeFilterIds: ["status:tentative"],
      query: "",
      definitions,
      view: "all",
    });
    assert.ok(!filteredAfter.some((event) => event.id === target.id));
  });
});

describe("schedule inline table wiring", () => {
  it("10. editable cells use InlineEditCell with click activation", () => {
    assert.match(inlineCellsSource, /InlineEditCell/);
    assert.match(inlineCellsSource, /editOn="click"/);
    assert.match(scheduleTableSource, /useScheduleInlineEdit/);
    assert.match(scheduleTableSource, /ScheduleItaRankCell/);
    assert.match(scheduleTableSource, /ScheduleStatusCell/);
  });

  it("11. normal row click still opens full edit form", () => {
    assert.match(scheduleTableSource, /onClick=\{\(\) => onEdit\(event\)\}/);
    assert.match(scheduleTableSource, /handleRowKeyDown/);
    assert.match(scheduleTableSource, /role="button"/);
  });

  it("inline save indicator is wired to ViewChrome", () => {
    assert.match(scheduleTableSource, /saveStatus=\{inlineEdit\.saveStatus\}/);
    assert.match(scheduleTableSource, /saveError=\{inlineEdit\.saveError\}/);
  });

  it("type and status badges use normal weight at body size", () => {
    assert.match(scheduleChromeSource, /SCHEDULE_OP_FIELD/);
    assert.match(inlineCellsSource, /SCHEDULE_OP_FIELD\.badge/);
    assert.match(inlineCellsSource, /SCHEDULE_OP_FIELD\.text/);
    assert.match(inlineCellsSource, /SCHEDULE_OP_FIELD\.editor/);
    assert.doesNotMatch(inlineCellsSource, /text-\[10px\].*font-semibold/);
  });

  it("opponent primary name is semibold via renderDisplay", () => {
    assert.match(inlineCellsSource, /SCHEDULE_OPPONENT_PRIMARY/);
    assert.match(opponentCellSource, /SCHEDULE_OPPONENT_PRIMARY/);
    assert.match(inlineCellsSource, /renderDisplay=\{<span className=\{SCHEDULE_OPPONENT_PRIMARY\}/);
  });

  it("identity marks use transform shift so logo moves without moving text", () => {
    assert.match(scheduleChromeSource, /SCHEDULE_OPPONENT_CELL.*items-center/);
    assert.match(scheduleChromeSource, /SCHEDULE_LOGO_OFFSET.*-translate-x-\[9px\]/);
    assert.match(scheduleChromeSource, /SCHEDULE_OPPONENT_TD.*overflow-visible/);
    assert.match(scheduleTableSource, /SCHEDULE_OPPONENT_TD/);
    assert.match(opponentCellSource, /SCHEDULE_LOGO_OFFSET/);
  });
});
