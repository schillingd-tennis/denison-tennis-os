/** Team module — player/coach directory and workspaces. */
export const PLAYERS_COACHES_ROUTE = "/players-coaches";

/** Legacy Team overview shell (no longer in primary nav). */
export const TEAM_ROUTE = "/team";

/** Exact paths that use the shared top-level module page shell. */
export const TOP_LEVEL_MODULE_PATHS = [
  "/",
  PLAYERS_COACHES_ROUTE,
  TEAM_ROUTE,
  "/recruiting",
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
