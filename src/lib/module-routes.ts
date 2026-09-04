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
export const RECRUITING_LOG_ROUTE = "/recruiting/log";
export const RECRUITING_TODAY_BETA_ROUTE = "/recruiting/today-beta";

/** Team Operations module root. */
export const TEAM_OPERATIONS_ROUTE = "/team-operations";

/** Team Operations competition schedule. */
export const TEAM_OPERATIONS_SCHEDULE_ROUTE = "/team-operations/schedule";

/** Team Operations intra-squad singles results. */
export const TEAM_OPERATIONS_INTRA_SQUAD_ROUTE = "/team-operations/intra-squad";

/** Team Operations practice planning and drill library. */
export const TEAM_OPERATIONS_PRACTICE_ROUTE = "/team-operations/practice";

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
  RECRUITING_LOG_ROUTE,
  RECRUITING_TODAY_BETA_ROUTE,
  TEAM_OPERATIONS_ROUTE,
  TEAM_OPERATIONS_SCHEDULE_ROUTE,
  TEAM_OPERATIONS_INTRA_SQUAD_ROUTE,
  TEAM_OPERATIONS_PRACTICE_ROUTE,
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

export function recruitingPersonVisitPath(personId: string): string {
  return `${recruitingPersonPath(personId)}?workspace=visit`;
}

export function recruitingPersonLogPath(personId: string): string {
  return `${recruitingPersonPath(personId)}?workspace=log`;
}

export function recruitingPersonCommunicationsPath(personId: string): string {
  return `${recruitingPersonPath(personId)}?workspace=communications`;
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
