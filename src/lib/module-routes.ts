/** Team module — player/coach directory and workspaces. */
export const PLAYERS_COACHES_ROUTE = "/players-coaches";

/** Legacy Team overview shell (no longer in primary nav). */
export const TEAM_ROUTE = "/team";

export function playersCoachesPersonPath(personId: string): string {
  return `${PLAYERS_COACHES_ROUTE}/${personId}`;
}
