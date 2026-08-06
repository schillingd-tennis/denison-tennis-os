import type { Communication } from "../types";

/**
 * Person-agnostic mock templates (BP-032A).
 * Bound to a personId at read time — no player-specific branching.
 */
const MOCK_TEMPLATES: Omit<
  Communication,
  "id" | "personId" | "createdAt" | "updatedAt"
>[] = [
  {
    type: "email",
    title: "Email sent",
    summary: "Season schedule shared",
    body: "Shared the fall dual-meet schedule and travel windows.",
    author: "David Schilling",
    followUpDate: undefined,
    metadata: { channel: "email", direction: "outbound" },
  },
  {
    type: "call",
    title: "Phone call",
    summary: "Discussed fall training",
    body: "Reviewed preseason conditioning plan and availability.",
    author: "David Schilling",
    metadata: { channel: "phone", direction: "outbound", durationMinutes: 12 },
  },
  {
    type: "meeting",
    title: "Check-in meeting",
    summary: "Weekly development review",
    body: "Walked through match goals and academic load for the next two weeks.",
    author: "David Schilling",
    followUpDate: "2026-08-12",
    metadata: { channel: "in_person" },
  },
  {
    type: "note",
    title: "Note added",
    summary: "Practice focus: serve +1",
    body: "Emphasize first-serve percentage and recovery between holds.",
    author: "David Schilling",
    metadata: { source: "coach_note" },
  },
  {
    type: "text",
    title: "Text sent",
    summary: "Confirmed practice time",
    body: "Practice moved to 3:30 PM — indoor courts 3–4.",
    author: "David Schilling",
    metadata: { channel: "sms", direction: "outbound" },
  },
];

/** Relative ages so timestamps feel current without hardcoding calendar days. */
const DAYS_AGO = [1, 2, 4, 6, 8];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setHours(10, 30, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/**
 * Returns typed mock communications for any person.
 * No persistence — framework proof only.
 */
export function getMockCommunications(personId: string): Communication[] {
  return MOCK_TEMPLATES.map((template, index) => {
    const createdAt = isoDaysAgo(DAYS_AGO[index] ?? index + 1);
    return {
      ...template,
      id: `comm-mock-${personId}-${index + 1}`,
      personId,
      createdAt,
      updatedAt: createdAt,
    };
  });
}
