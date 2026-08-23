import { INTERACTION_TYPES, type InteractionDirection, type InteractionType } from "./types";
import type { RecruitInteractionInput } from "./types";

export function dateFromOccurredAt(iso: string): string {
  return iso.slice(0, 10);
}

export function occurredAtFromDateInput(date: string): string {
  return new Date(`${date}T12:00:00`).toISOString();
}

export function readInteractionFormData(formData: FormData): {
  id: string | null;
  input: RecruitInteractionInput;
} {
  const recruitPersonId = String(formData.get("recruitPersonId") ?? "").trim();
  const interactionType = String(formData.get("interactionType") ?? "other") as InteractionType;
  const date = String(formData.get("occurredAt") ?? "").trim();
  if (!recruitPersonId || !date || !INTERACTION_TYPES.includes(interactionType)) {
    throw new Error("Recruit, date, and type are required.");
  }
  const nullable = (key: string) => String(formData.get(key) ?? "").trim() || null;
  const id = String(formData.get("interactionId") ?? "").trim() || null;
  return {
    id,
    input: {
      recruitPersonId,
      interactionType,
      occurredAt: occurredAtFromDateInput(date),
      tournamentId: nullable("tournamentId"),
      channel: nullable("channel"),
      direction: nullable("direction") as InteractionDirection | null,
      participants: nullable("participants"),
      notes: nullable("notes"),
      nextSteps: nullable("nextSteps"),
      loggedBy: nullable("loggedBy"),
    },
  };
}
