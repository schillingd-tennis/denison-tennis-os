/**
 * Last text/call contact date label for cadence opportunities.
 */
import { formatDate } from "@/lib/formatting";

type InteractionLike = {
  occurredAt: string;
  interactionType: string;
  createdAt: string;
};

function recency(a: InteractionLike, b: InteractionLike): number {
  const occurred = Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
  if (occurred !== 0) return occurred;
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

export function lastTextOrCallDateLabel(
  interactions: readonly InteractionLike[],
): string | null {
  const matches = interactions.filter(
    (row) => row.interactionType === "text" || row.interactionType === "call",
  );
  if (matches.length === 0) return null;

  const latest = [...matches].sort(recency)[0];
  if (!latest) return null;
  return formatDate(latest.occurredAt) ?? latest.occurredAt;
}
