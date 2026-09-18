/** WhatsApp conversation import — source identity and note presentation. */

import type { InteractionType } from "./types";

export const WHATSAPP_SOURCE_SYSTEM = "whatsapp";

export const UNSUPPORTED_MEDIA_PREFIX = "[Unsupported media:";

export type WhatsAppMediaKind =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "location"
  | "contact"
  | "reaction"
  | "poll"
  | "other";

export function unsupportedMediaNotes(kind: WhatsAppMediaKind): string {
  return `${UNSUPPORTED_MEDIA_PREFIX} ${kind}]`;
}

export function isUnsupportedMediaNotes(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return notes.trim().startsWith(UNSUPPORTED_MEDIA_PREFIX);
}

export function sourceBadgeLabel(sourceSystem: string | null | undefined): "Messages" | "WhatsApp" | null {
  if (sourceSystem === "apple_messages") return "Messages";
  if (sourceSystem === WHATSAPP_SOURCE_SYSTEM) return "WhatsApp";
  return null;
}

/** Human label for interaction type (and WhatsApp source rows that still say "text"). */
export function interactionTypeLabel(
  interactionType: string | null | undefined,
  sourceSystem?: string | null,
): string {
  if (sourceSystem === WHATSAPP_SOURCE_SYSTEM || interactionType === "whatsapp") {
    return "WhatsApp";
  }
  if (!interactionType) return "Interaction";
  return `${interactionType[0]!.toUpperCase()}${interactionType.slice(1)}`;
}

export function interactionTypeOptionLabel(type: InteractionType): string {
  if (type === "whatsapp") return "WhatsApp";
  return `${type[0]!.toUpperCase()}${type.slice(1)}`;
}
