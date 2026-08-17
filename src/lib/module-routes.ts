/** Player/coach directory module (formerly the Team directory). */
export const PLAYERS_COACHES_ROUTE = "/players-coaches";

/** Team program shell — schedule, results, academics, etc. */
export const TEAM_ROUTE = "/team";

export function playersCoachesPersonPath(personId: string): string {
  return `${PLAYERS_COACHES_ROUTE}/${personId}`;
}
