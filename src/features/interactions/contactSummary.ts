/**
 * Derived Interaction workspace KPIs. Calendar-day math only — never persisted.
 */
import { EMPTY_VALUE, formatDate } from "@/lib/formatting";

import type { InteractionDirection, InteractionType, RecruitInteraction } from "./types";

export const CONTACT_CURRENT_MAX_DAYS = 10;

export type ContactAlertStatus = "current" | "follow_up" | "none";

export type InteractionSummarySnapshot = {
  lastTextDateLabel: string;
  lastTextDirectionLabel: string | null;
  lastTextEmpty: boolean;
  daysSinceLastText: number | null;
  contactStatus: ContactAlertStatus;
  contactDays: number | null;
  contactLabel: string;
};

type InteractionLike = Pick<
  RecruitInteraction,
  "occurredAt" | "interactionType" | "direction" | "createdAt"
>;

function localDayUtc(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((localDayUtc(to) - localDayUtc(from)) / 86_400_000);
}

export function calendarDaysSince(occurredAt: string, now: Date = new Date()): number | null {
  const occurred = new Date(occurredAt);
  if (Number.isNaN(occurred.getTime())) return null;
  return calendarDaysBetween(occurred, now);
}

function recency(a: InteractionLike, b: InteractionLike): number {
  const occurred = Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
  if (occurred !== 0) return occurred;
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

function latestOfType(interactions: readonly InteractionLike[], types: readonly InteractionType[]): InteractionLike | null {
  const matches = interactions.filter((row) => types.includes(row.interactionType));
  if (matches.length === 0) return null;
  return [...matches].sort(recency)[0] ?? null;
}

function directionLabel(direction: InteractionDirection | null): string | null {
  if (direction === "inbound") return "Inbound";
  if (direction === "outbound") return "Outbound";
  return null;
}

export function buildInteractionSummary(
  interactions: readonly InteractionLike[],
  now: Date = new Date(),
): InteractionSummarySnapshot {
  const lastText = latestOfType(interactions, ["text"]);
  const lastContact = latestOfType(interactions, ["text", "call"]);
  const daysSinceLastText = lastText ? calendarDaysSince(lastText.occurredAt, now) : null;
  const contactDays = lastContact ? calendarDaysSince(lastContact.occurredAt, now) : null;

  let contactStatus: ContactAlertStatus = "none";
  let contactLabel = "No Contact Recorded";
  if (contactDays != null) {
    if (contactDays > CONTACT_CURRENT_MAX_DAYS) {
      contactStatus = "follow_up";
      contactLabel = "Follow Up Due";
    } else {
      contactStatus = "current";
      contactLabel = "Contact Current";
    }
  }

  return {
    lastTextDateLabel: lastText ? formatDate(lastText.occurredAt) : EMPTY_VALUE,
    lastTextDirectionLabel: lastText ? directionLabel(lastText.direction) : null,
    lastTextEmpty: !lastText,
    daysSinceLastText,
    contactStatus,
    contactDays,
    contactLabel,
  };
}
