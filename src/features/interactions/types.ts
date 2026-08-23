export const INTERACTION_TYPES = [
  "call", "text", "email", "message", "visit", "meeting", "note", "other",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];
export type InteractionDirection = "inbound" | "outbound" | "two_way" | "unknown";

export type RecruitInteraction = {
  id: string;
  recruitPersonId: string;
  recruitName: string;
  tournamentId: string | null;
  tournamentName: string | null;
  occurredAt: string;
  interactionType: InteractionType;
  channel: string | null;
  direction: InteractionDirection | null;
  participants: string | null;
  notes: string | null;
  nextSteps: string | null;
  loggedBy: string | null;
  sourceSystem: string | null;
  sourceKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecruitInteractionInput = Omit<
  RecruitInteraction,
  "id" | "recruitName" | "tournamentName" | "sourceSystem" | "sourceKey" | "createdAt" | "updatedAt"
>;
