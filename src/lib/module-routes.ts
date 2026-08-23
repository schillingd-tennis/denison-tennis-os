import { ROLE_KEYS } from "@/features/lookups/seed";

/** Team module — player/coach directory and workspaces. */
export const PLAYERS_COACHES_ROUTE = "/players-coaches";

/** Recruiting module — recruit directory and workspaces. */
export const RECRUITING_ROUTE = "/recruiting";

/** Recruiting directory / recruit list. */
export const RECRUITING_LIST_ROUTE = "/recruiting/list";

/** Recruiting tournaments. */
export const RECRUITING_TOURNAMENTS_ROUTE = "/recruiting/tournaments";
export const RECRUITING_INTERACTIONS_ROUTE = "/recruiting/interactions";

/** Legacy Team overview shell (no longer in primary nav). */
export const TEAM_ROUTE = "/team";

/** Exact paths that use the shared top-level module page shell. */
export const TOP_LEVEL_MODULE_PATHS = [
  "/",
  PLAYERS_COACHES_ROUTE,
  TEAM_ROUTE,
  RECRUITING_ROUTE,
  RECRUITING_LIST_ROUTE,
  RECRUITING_TOURNAMENTS_ROUTE,
  RECRUITING_INTERACTIONS_ROUTE,
  "/operations",
  "/fundraising",
  "/research",
  "/knowledge",
  "/people",
] as const;

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isTopLevelModulePage(pathname: string): boolean {
  return (TOP_LEVEL_MODULE_PATHS as readonly string[]).includes(
    normalizePathname(pathname),
  );
}

export function playersCoachesPersonPath(personId: string): string {
  return `${PLAYERS_COACHES_ROUTE}/${personId}`;
}

export function recruitingPersonPath(personId: string): string {
  return `${RECRUITING_ROUTE}/${personId}`;
}

export function recruitingTournamentPath(tournamentId: string): string {
  return `${RECRUITING_TOURNAMENTS_ROUTE}/${tournamentId}`;
}

/**
 * Shared Command-K / search destination for a Person.
 * Recruits open Recruiting workspace; Team players, coaches, staff, and
 * other person types keep the Team person workspace.
 */
export function resolvePersonWorkspacePath(
  personId: string,
  hint?: { roleKey?: string; objectType?: string },
): string {
  if (hint?.objectType === "recruits" || hint?.roleKey === ROLE_KEYS.recruit) {
    return recruitingPersonPath(personId);
  }
  return playersCoachesPersonPath(personId);
}
