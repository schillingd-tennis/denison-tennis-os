export const MATCH_EVENT_WORKSPACE_IDS = [
  "overview",
  "results",
  "import-history",
] as const;

export type MatchEventWorkspaceId = (typeof MATCH_EVENT_WORKSPACE_IDS)[number];

export function parseMatchEventWorkspaceId(value: string | undefined | null): MatchEventWorkspaceId {
  if (value && (MATCH_EVENT_WORKSPACE_IDS as readonly string[]).includes(value)) {
    return value as MatchEventWorkspaceId;
  }
  return "overview";
}
