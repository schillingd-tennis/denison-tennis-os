export const DIRECTION_PLACEHOLDERS = new Set(["inbound", "outbound"]);

export const APPLE_MESSAGES_SOURCE_SYSTEM = "apple_messages";

export function isDirectionPlaceholderNotes(notes: string | null | undefined): boolean {
  const value = notes?.trim().toLowerCase() ?? "";
  return value.length === 0 ? false : DIRECTION_PLACEHOLDERS.has(value);
}

export function isPlaceholderNotes(notes: string | null | undefined): boolean {
  const value = notes?.trim() ?? "";
  return value === "" || DIRECTION_PLACEHOLDERS.has(value.toLowerCase());
}

export function interactionNotesPresentation(input: {
  notes: string | null;
  sourceSystem?: string | null;
}): { kind: "notes" | "unavailable" | "none"; text: string | null } {
  if (isDirectionPlaceholderNotes(input.notes)) return { kind: "unavailable", text: null };
  if (input.sourceSystem === APPLE_MESSAGES_SOURCE_SYSTEM && isPlaceholderNotes(input.notes)) {
    return { kind: "unavailable", text: null };
  }
  if (input.notes?.trim()) return { kind: "notes", text: input.notes };
  return { kind: "none", text: null };
}
