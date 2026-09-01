/** Live UTR frontend results API shape (observed 2026-09-01, Isaac Lewis / 3186547). */
export const UTR_RESULTS_API_QUERY = "type=s&year=last" as const;

export function buildUtrResultsApiUrl(playerId: string): string {
  return `https://api.utrsports.net/v4/player/${playerId}/results?${UTR_RESULTS_API_QUERY}`;
}

export function isUtrPlayerResultsRequestUrl(url: string, playerId: string): boolean {
  return (
    url.includes(`api.utrsports.net/v4/player/${playerId}/results`) &&
    url.includes("type=s") &&
    url.includes("year=last")
  );
}

export function isUtrPlayerResultsPath(url: string, playerId: string): boolean {
  return url.includes(`/v4/player/${playerId}/results`);
}
