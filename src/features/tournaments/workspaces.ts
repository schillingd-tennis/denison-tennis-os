/**
 * Tournament Adaptive Workspace IDs — shared by server pages and client UI.
 * Keep this module free of "use client" so query-param parsing can run on the server.
 */

export const TOURNAMENT_WORKSPACE_IDS = ["overview", "players", "travel", "links"] as const;

export type TournamentWorkspaceId = (typeof TOURNAMENT_WORKSPACE_IDS)[number];

export const DEFAULT_TOURNAMENT_WORKSPACE: TournamentWorkspaceId = "overview";

export function isTournamentWorkspaceId(
  value: string | null | undefined,
): value is TournamentWorkspaceId {
  return TOURNAMENT_WORKSPACE_IDS.includes(value as TournamentWorkspaceId);
}

export function parseTournamentWorkspaceId(
  value: string | null | undefined,
): TournamentWorkspaceId {
  return isTournamentWorkspaceId(value) ? value : DEFAULT_TOURNAMENT_WORKSPACE;
}
