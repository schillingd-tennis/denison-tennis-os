import assert from "node:assert/strict";
import { test } from "node:test";

import { EMPTY_VALUE } from "@/lib/formatting";

import {
  CONTACT_CURRENT_MAX_DAYS,
  buildInteractionSummary,
  calendarDaysSince,
} from "./contactSummary";
import type { InteractionDirection, InteractionType, RecruitInteraction } from "./types";

const NOW = new Date(2026, 7, 24, 18, 30, 0);

function isoDaysAgo(days: number, hour = 9): string {
  return new Date(2026, 7, 24 - days, hour, 0, 0).toISOString();
}

function row(partial: {
  id: string;
  occurredAt: string;
  interactionType?: InteractionType;
  direction?: InteractionDirection | null;
  createdAt?: string;
  sourceSystem?: string | null;
}): RecruitInteraction {
  return {
    id: partial.id,
    recruitPersonId: "recruit-1",
    recruitName: "Alex One",
    tournamentId: null,
    tournamentName: null,
    occurredAt: partial.occurredAt,
    interactionType: partial.interactionType ?? "text",
    channel: null,
    direction: partial.direction ?? "outbound",
    participants: null,
    notes: null,
    nextSteps: null,
    loggedBy: null,
    sourceSystem: partial.sourceSystem ?? null,
    sourceKey: null,
    createdAt: partial.createdAt ?? partial.occurredAt,
    updatedAt: partial.occurredAt,
  };
}

test("inbound and outbound texts both qualify for Last Text", () => {
  const inbound = row({
    id: "in",
    occurredAt: isoDaysAgo(1, 8),
    direction: "inbound",
    sourceSystem: "apple_messages",
  });
  const outbound = row({
    id: "out",
    occurredAt: isoDaysAgo(3, 8),
    direction: "outbound",
  });
  const newerInbound = buildInteractionSummary([outbound, inbound], NOW);
  assert.equal(newerInbound.lastTextEmpty, false);
  assert.equal(newerInbound.lastTextDirectionLabel, "Inbound");
  assert.equal(newerInbound.daysSinceLastText, 1);

  const newerOutbound = buildInteractionSummary(
    [inbound, row({ id: "out-new", occurredAt: isoDaysAgo(0, 10), direction: "outbound" })],
    NOW,
  );
  assert.equal(newerOutbound.lastTextDirectionLabel, "Outbound");
  assert.equal(newerOutbound.daysSinceLastText, 0);
});

test("Last Text uses the latest text date, not an older call", () => {
  const olderText = row({ id: "text-old", occurredAt: isoDaysAgo(4, 8), interactionType: "text" });
  const newerText = row({ id: "text-new", occurredAt: isoDaysAgo(1, 20), interactionType: "text" });
  const call = row({ id: "call", occurredAt: isoDaysAgo(0, 21), interactionType: "call" });
  const summary = buildInteractionSummary([olderText, call, newerText], NOW);
  assert.equal(summary.daysSinceLastText, 1);
  assert.match(summary.lastTextDateLabel, /Aug 23, 2026/);
});

test("days since last text use calendar days, not elapsed hours", () => {
  const sameCalendarDay = new Date(2026, 7, 24, 0, 15, 0).toISOString();
  assert.equal(calendarDaysSince(sameCalendarDay, NOW), 0);
  assert.equal(calendarDaysSince(isoDaysAgo(1, 23), NOW), 1);
  assert.equal(calendarDaysSince(isoDaysAgo(11, 7), NOW), 11);
  assert.equal(CONTACT_CURRENT_MAX_DAYS, 10);
});

test("calls affect Contact Alert but not Last Text", () => {
  const oldText = row({
    id: "text",
    occurredAt: isoDaysAgo(20),
    interactionType: "text",
    direction: "inbound",
  });
  const recentCall = row({ id: "call", occurredAt: isoDaysAgo(2), interactionType: "call" });
  const summary = buildInteractionSummary([oldText, recentCall], NOW);
  assert.equal(summary.daysSinceLastText, 20);
  assert.equal(summary.contactStatus, "current");
  assert.equal(summary.contactDays, 2);
  assert.equal(summary.contactLabel, "Contact Current");
});

test("exactly 10 days is Contact Current; 11 days is Follow Up Due", () => {
  const ten = buildInteractionSummary(
    [row({ id: "t10", occurredAt: isoDaysAgo(10), interactionType: "call" })],
    NOW,
  );
  assert.equal(ten.contactStatus, "current");
  assert.equal(ten.contactDays, 10);
  assert.equal(ten.contactLabel, "Contact Current");

  const eleven = buildInteractionSummary(
    [row({ id: "t11", occurredAt: isoDaysAgo(11), interactionType: "text" })],
    NOW,
  );
  assert.equal(eleven.contactStatus, "follow_up");
  assert.equal(eleven.contactDays, 11);
  assert.equal(eleven.contactLabel, "Follow Up Due");
});

test("empty states use an em dash and no-text / no-contact copy", () => {
  const empty = buildInteractionSummary([], NOW);
  assert.equal(empty.lastTextEmpty, true);
  assert.equal(empty.lastTextDateLabel, EMPTY_VALUE);
  assert.equal(empty.lastTextDirectionLabel, null);
  assert.equal(empty.daysSinceLastText, null);
  assert.equal(empty.contactStatus, "none");
  assert.equal(empty.contactLabel, "No Contact Recorded");
  assert.equal(empty.contactDays, null);

  const emailOnly = buildInteractionSummary(
    [row({ id: "email", occurredAt: isoDaysAgo(1), interactionType: "email" })],
    NOW,
  );
  assert.equal(emailOnly.lastTextEmpty, true);
  assert.equal(emailOnly.contactStatus, "none");
});
