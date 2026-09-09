import { playerMatchesLinkedReportQuery } from "./playerLifecycle";
import type {
  MatchReportSortKey,
  PlayerSortKey,
  ScoutingDirectReport,
  ScoutingFilters,
  ScoutingFormSubmission,
  ScoutingOpponentPlayer,
  ScoutingSortDirection,
  ScoutingTeam,
  SubmissionSortKey,
  TeamSortKey,
} from "./types";

function cmp(a: string | number | null | undefined, b: string | number | null | undefined, direction: ScoutingSortDirection) {
  const av = a ?? "";
  const bv = b ?? "";
  if (av < bv) return direction === "asc" ? -1 : 1;
  if (av > bv) return direction === "asc" ? 1 : -1;
  return 0;
}

export function filterPlayers(
  players: ScoutingOpponentPlayer[],
  filters: Pick<ScoutingFilters, "query" | "teamId" | "handedness" | "aiStatus">,
  options?: { linkedReports?: ScoutingDirectReport[] },
): ScoutingOpponentPlayer[] {
  const q = filters.query.trim().toLowerCase();
  return players.filter((player) => {
    if (filters.teamId && player.teamId !== filters.teamId) return false;
    if (filters.handedness === "none" && player.handedness) return false;
    if (filters.handedness && filters.handedness !== "none" && player.handedness !== filters.handedness) {
      return false;
    }
    if (filters.aiStatus === "ready" && !(player.hasAiReport && !player.aiStale)) return false;
    if (filters.aiStatus === "stale" && !(player.hasAiReport && player.aiStale)) return false;
    if (filters.aiStatus === "none" && player.hasAiReport) return false;
    if (!q) return true;
    const haystack = `${player.displayName} ${player.teamDisplayName} ${player.handedness ?? ""}`.toLowerCase();
    if (haystack.includes(q)) return true;
    if (options?.linkedReports?.length) {
      return playerMatchesLinkedReportQuery(player.id, filters.query, options.linkedReports);
    }
    return false;
  });
}

export function sortPlayers(
  players: ScoutingOpponentPlayer[],
  key: PlayerSortKey,
  direction: ScoutingSortDirection,
): ScoutingOpponentPlayer[] {
  return [...players].sort((a, b) => cmp(a[key] as never, b[key] as never, direction));
}

export function filterTeams(teams: ScoutingTeam[], query: string): ScoutingTeam[] {
  const q = query.trim().toLowerCase();
  if (!q) return teams;
  return teams.filter((team) => team.displayName.toLowerCase().includes(q));
}

export function sortTeams(
  teams: ScoutingTeam[],
  key: TeamSortKey,
  direction: ScoutingSortDirection,
): ScoutingTeam[] {
  return [...teams].sort((a, b) => cmp(a[key] as never, b[key] as never, direction));
}

export function filterMatchReports(
  reports: ScoutingDirectReport[],
  filters: Pick<ScoutingFilters, "query" | "teamId" | "importStatus">,
): ScoutingDirectReport[] {
  const q = filters.query.trim().toLowerCase();
  return reports.filter((report) => {
    if (filters.teamId && report.teamId !== filters.teamId) return false;
    if (filters.importStatus && report.importStatus !== filters.importStatus) return false;
    if (!q) return true;
    const haystack = [
      report.opponentDisplayName,
      report.teamDisplayName,
      report.reportBy,
      report.strengthsWeaknesses,
      report.scoutingReport,
      report.importStatus,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function sortMatchReports(
  reports: ScoutingDirectReport[],
  key: MatchReportSortKey,
  direction: ScoutingSortDirection,
): ScoutingDirectReport[] {
  return [...reports].sort((a, b) => {
    if (key === "matchDate") {
      return cmp(a.matchDate ?? a.matchDateRaw, b.matchDate ?? b.matchDateRaw, direction);
    }
    return cmp(a[key] as never, b[key] as never, direction);
  });
}

export function filterSubmissions(
  rows: ScoutingFormSubmission[],
  filters: Pick<ScoutingFilters, "query" | "submissionStatus">,
): ScoutingFormSubmission[] {
  const q = filters.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.submissionStatus && row.status !== filters.submissionStatus) return false;
    if (!q) return true;
    const haystack = `${row.opponentDisplayName} ${row.teamDisplayName} ${row.reportBy} ${row.status}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function sortSubmissions(
  rows: ScoutingFormSubmission[],
  key: SubmissionSortKey,
  direction: ScoutingSortDirection,
): ScoutingFormSubmission[] {
  return [...rows].sort((a, b) => cmp(a[key] as never, b[key] as never, direction));
}
