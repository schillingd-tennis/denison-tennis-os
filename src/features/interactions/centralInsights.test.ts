import assert from "node:assert/strict";
import { test } from "node:test";

import { APPLE_MESSAGES_SOURCE_SYSTEM } from "./appleMessages";
import {
  activityByType,
  countAppleMessages,
  countThisWeek,
  filterCentralInteractions,
  followUpRecruits,
  latestOccurredAt,
  uniqueFollowUpCount,
  followUpDaysLabel,
} from "./centralInsights";
import type { InteractionType, RecruitInteraction } from "./types";

const NOW = new Date("2026-08-27T16:00:00.000Z");

function row(partial: Partial<RecruitInteraction> & Pick<RecruitInteraction, "id" | "occurredAt">): RecruitInteraction {
  return {
    recruitPersonId: "r1",
    recruitName: "Alex One",
    tournamentId: null,
    tournamentName: null,
    interactionType: "text",
    channel: null,
    direction: "outbound",
    participants: null,
    notes: "hello",
    nextSteps: null,
    loggedBy: "Coach",
    sourceSystem: null,
    sourceKey: null,
    createdAt: partial.occurredAt,
    updatedAt: partial.occurredAt,
    ...partial,
  };
}

test("Past month + search + type compose without dropping name matches", () => {
  const rows = [
    row({ id: "in", occurredAt: "2026-08-20T12:00:00.000Z", notes: "camp invite", interactionType: "text" }),
    row({ id: "call", occurredAt: "2026-08-20T13:00:00.000Z", interactionType: "call", notes: "voicemail" }),
    row({ id: "old", occurredAt: "2026-06-01T12:00:00.000Z", notes: "camp invite" }),
  ];
  const filtered = filterCentralInteractions(rows, {
    period: "past_month",
    kind: "texts",
    query: "camp",
    now: NOW,
  });
  assert.deepEqual(
    filtered.map((item) => item.id),
    ["in"],
  );
});

test("summary last interaction uses occurredAt, not createdAt", () => {
  const latest = latestOccurredAt([
    row({ id: "created-new", occurredAt: "2026-08-10T12:00:00.000Z", createdAt: "2026-08-27T12:00:00.000Z" }),
    row({ id: "occurred-new", occurredAt: "2026-08-26T12:00:00.000Z", createdAt: "2026-08-01T12:00:00.000Z" }),
  ]);
  assert.equal(latest, "2026-08-26T12:00:00.000Z");
});

test("this-week count is the rolling seven calendar days including today", () => {
  const rows = [
    row({ id: "in", occurredAt: "2026-08-21T04:00:00.000Z" }),
    row({ id: "out", occurredAt: "2026-08-20T03:00:00.000Z" }),
  ];
  assert.equal(countThisWeek(rows, NOW), 1);
});

test("follow-up counts unique recruits after 10 full New York days", () => {
  const rows = [
    row({
      id: "alex-old",
      recruitPersonId: "alex",
      recruitName: "Alex One",
      occurredAt: "2026-08-16T12:00:00.000Z",
      interactionType: "text",
    }),
    row({
      id: "alex-older-call",
      recruitPersonId: "alex",
      recruitName: "Alex One",
      occurredAt: "2026-08-01T12:00:00.000Z",
      interactionType: "call",
    }),
    row({
      id: "blair-recent",
      recruitPersonId: "blair",
      recruitName: "Blair Two",
      occurredAt: "2026-08-20T12:00:00.000Z",
      interactionType: "call",
    }),
    row({
      id: "casey-email",
      recruitPersonId: "casey",
      recruitName: "Casey Three",
      occurredAt: "2026-07-01T12:00:00.000Z",
      interactionType: "email",
    }),
  ];
  assert.equal(uniqueFollowUpCount(rows, NOW), 1);
  const alerts = followUpRecruits(rows, NOW);
  assert.equal(alerts[0]?.recruitPersonId, "alex");
  assert.ok((alerts[0]?.daysSinceContact ?? 0) > 10);
});

test("10 full days is still current; 11 is follow-up", () => {
  const ten = row({ id: "ten", occurredAt: "2026-08-17T12:00:00.000Z", interactionType: "text" });
  const eleven = row({
    id: "eleven",
    recruitPersonId: "r2",
    recruitName: "Blair Two",
    occurredAt: "2026-08-16T12:00:00.000Z",
    interactionType: "call",
  });
  assert.equal(uniqueFollowUpCount([ten], NOW), 0);
  assert.equal(uniqueFollowUpCount([eleven], NOW), 1);
});

test("activity-by-type ignores the selected kind filter input rows already date-filtered", () => {
  const rows = [
    row({ id: "t", occurredAt: "2026-08-20T12:00:00.000Z", interactionType: "text" }),
    row({ id: "m", occurredAt: "2026-08-20T12:00:00.000Z", interactionType: "message" }),
    row({ id: "c", occurredAt: "2026-08-20T12:00:00.000Z", interactionType: "call" }),
    row({ id: "e", occurredAt: "2026-08-20T12:00:00.000Z", interactionType: "email" }),
    row({ id: "v", occurredAt: "2026-08-20T12:00:00.000Z", interactionType: "visit" }),
  ];
  assert.deepEqual(activityByType(rows), { texts: 2, calls: 1, emails: 1, visits: 1 });
});

test("Apple Messages count uses source_system apple_messages", () => {
  const rows = [
    row({ id: "sync", occurredAt: "2026-08-20T12:00:00.000Z", sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM }),
    row({ id: "manual", occurredAt: "2026-08-20T12:00:00.000Z", sourceSystem: null }),
  ];
  assert.equal(countAppleMessages(rows), 1);
});

test("never-contacted recruits are not counted as needing follow-up", () => {
  assert.equal(uniqueFollowUpCount([], NOW), 0);
  const emailOnly = [
    row({
      id: "email-only",
      recruitPersonId: "casey",
      recruitName: "Casey Three",
      occurredAt: "2026-07-01T12:00:00.000Z",
      interactionType: "email",
    }),
  ];
  assert.equal(uniqueFollowUpCount(emailOnly, NOW), 0);
});

test("empty date + type + search result is an empty list", () => {
  const rows = [
    row({ id: "text", occurredAt: "2026-08-20T12:00:00.000Z", interactionType: "text", notes: "camp" }),
  ];
  const filtered = filterCentralInteractions(rows, {
    period: "today",
    kind: "visits",
    query: "zzz-no-match",
    now: NOW,
  });
  assert.deepEqual(filtered, []);
});

test("alert copy uses full day words", () => {
  assert.equal(followUpDaysLabel(1), "1 day");
  assert.equal(followUpDaysLabel(402), "402 days");
});

test("communication alerts require Class of 2027 Rank Board membership", () => {
  const board = new Set(["alex"]);
  const rows = [
    row({
      id: "alex-old",
      recruitPersonId: "alex",
      recruitName: "Alex One",
      occurredAt: "2026-08-16T12:00:00.000Z",
      interactionType: "text",
    }),
    row({
      id: "blair-old",
      recruitPersonId: "blair",
      recruitName: "Blair Two",
      occurredAt: "2026-08-01T12:00:00.000Z",
      interactionType: "call",
    }),
  ];
  assert.deepEqual(
    followUpRecruits(rows, NOW, 5, board).map((item) => item.recruitPersonId),
    ["alex"],
  );
  assert.equal(uniqueFollowUpCount(rows, NOW, board), 1);
  assert.equal(uniqueFollowUpCount(rows, NOW, new Set()), 0);
});

test("email, visit, and note do not reset the text/call clock", () => {
  const rows = [
    row({
      id: "text-old",
      recruitPersonId: "alex",
      recruitName: "Alex One",
      occurredAt: "2026-08-16T12:00:00.000Z",
      interactionType: "text",
    }),
    row({
      id: "email-new",
      recruitPersonId: "alex",
      recruitName: "Alex One",
      occurredAt: "2026-08-26T12:00:00.000Z",
      interactionType: "email",
    }),
    row({
      id: "visit-new",
      recruitPersonId: "alex",
      recruitName: "Alex One",
      occurredAt: "2026-08-26T13:00:00.000Z",
      interactionType: "visit",
    }),
  ];
  assert.equal(uniqueFollowUpCount(rows, NOW, new Set(["alex"])), 1);
});

test("alerts sort most overdue first and cap at five unique recruits", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];
  const rows = ids.map((id, index) =>
    row({
      id,
      recruitPersonId: id,
      recruitName: `Recruit ${id}`,
      occurredAt: `2026-07-${String(10 + index).padStart(2, "0")}T12:00:00.000Z`,
      interactionType: "call",
    }),
  );
  const alerts = followUpRecruits(rows, NOW, 5, new Set(ids));
  assert.equal(alerts.length, 5);
  assert.deepEqual(
    alerts.map((item) => item.recruitPersonId),
    ["a", "b", "c", "d", "e"],
  );
});
