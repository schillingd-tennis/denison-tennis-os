import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_INTERACTION_PERIOD,
  INTERACTIONS_TIME_ZONE,
  addCivilDays,
  calendarDaysBetweenCivil,
  civilDateInZone,
  interactionsPageHref,
  matchesPeriod,
  parseInteractionKind,
  parseInteractionPeriod,
  rangeForPeriod,
  zonedCivilTimeToUtc,
} from "./centralPeriod";

test("invalid period and kind fall back to Past month / All types", () => {
  assert.equal(parseInteractionPeriod(undefined), DEFAULT_INTERACTION_PERIOD);
  assert.equal(parseInteractionPeriod("nope"), "past_month");
  assert.equal(parseInteractionPeriod("today"), "today");
  assert.equal(parseInteractionKind(undefined), "all");
  assert.equal(parseInteractionKind("texts"), "texts");
  assert.equal(parseInteractionKind("sms"), "all");
});

test("URL omits default period and all-types", () => {
  assert.equal(interactionsPageHref({ period: "past_month", kind: "all", query: "" }), "/recruiting/interactions");
  assert.equal(
    interactionsPageHref({ period: "today", kind: "calls", query: "Alex" }),
    "/recruiting/interactions?period=today&kind=calls&q=Alex",
  );
});

test("Today uses America/New_York midnight through now, including spring-forward", () => {
  const now = new Date("2026-03-08T18:00:00.000Z");
  const today = civilDateInZone(now, INTERACTIONS_TIME_ZONE);
  assert.deepEqual(today, { year: 2026, month: 3, day: 8 });
  const start = zonedCivilTimeToUtc(today, 0, 0, 0);
  assert.equal(start.toISOString(), "2026-03-08T05:00:00.000Z");
  const range = rangeForPeriod("today", now);
  assert.equal(range.startMs, start.getTime());
  assert.equal(range.endMs, now.getTime());
  assert.equal(matchesPeriod("2026-03-08T05:00:00.000Z", "today", now), true);
  assert.equal(matchesPeriod("2026-03-08T04:59:59.000Z", "today", now), false);
});

test("Yesterday is local midnight yesterday through local midnight today", () => {
  const now = new Date("2026-03-08T18:00:00.000Z");
  const range = rangeForPeriod("yesterday", now);
  assert.equal(new Date(range.startMs!).toISOString(), "2026-03-07T05:00:00.000Z");
  assert.equal(new Date(range.endMs!).toISOString(), "2026-03-08T05:00:00.000Z");
  assert.equal(matchesPeriod("2026-03-07T05:00:00.000Z", "yesterday", now), true);
  assert.equal(matchesPeriod("2026-03-08T05:00:00.000Z", "yesterday", now), false);
});

test("Past week is seven calendar days including today", () => {
  const now = new Date("2026-08-27T15:00:00.000Z");
  const today = civilDateInZone(now);
  const startCivil = addCivilDays(today, -6);
  const range = rangeForPeriod("past_week", now);
  assert.equal(calendarDaysBetweenCivil(startCivil, today), 6);
  assert.equal(new Date(range.startMs!).toISOString(), zonedCivilTimeToUtc(startCivil).toISOString());
  assert.equal(matchesPeriod(zonedCivilTimeToUtc(startCivil).toISOString(), "past_week", now), true);
  assert.equal(
    matchesPeriod(zonedCivilTimeToUtc(addCivilDays(startCivil, -1), 23, 59, 59).toISOString(), "past_week", now),
    false,
  );
});

test("Past month is thirty calendar days including today", () => {
  const now = new Date("2026-08-27T15:00:00.000Z");
  const today = civilDateInZone(now);
  const startCivil = addCivilDays(today, -29);
  assert.equal(calendarDaysBetweenCivil(startCivil, today), 29);
  const range = rangeForPeriod("past_month", now);
  assert.equal(new Date(range.startMs!).toISOString(), zonedCivilTimeToUtc(startCivil).toISOString());
});

test("fall-back DST midnight in America/New_York stays UTC-4", () => {
  const start = zonedCivilTimeToUtc({ year: 2026, month: 11, day: 1 }, 0, 0, 0);
  assert.equal(start.toISOString(), "2026-11-01T04:00:00.000Z");
});
