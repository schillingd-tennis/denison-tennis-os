/**
 * Counts-only duplicate / identity audit for Scouting teams.
 * Read-only: never merges or deletes.
 */
import { normalizeSchoolAlias } from "./promotion";

export type AuditTeam = {
  id: string;
  displayName: string;
  identitySlug: string | null;
};

export type AuditPlayer = {
  id: string;
  teamId: string;
  displayName: string;
  normalizedName: string;
};

export type AuditDirectReport = {
  id: string;
  teamId: string;
  opponentPlayerId: string | null;
};

export type AuditFormLink = {
  id: string;
  teamId: string | null;
  opponentPlayerId: string | null;
};

export type AuditAlias = {
  teamId: string;
  normalizedAlias: string;
  displayAlias: string;
};

export type ScoutingDuplicateAuditCounts = {
  teamsSharingIdentitySlug: number;
  identitySlugGroups: number;
  exactNormalizedNameDuplicateTeams: number;
  knownAliasStoredAsSeparateTeams: number;
  opponentPlayersSplitAcrossDuplicateTeams: number;
  directReportsOnDuplicateTeams: number;
  formLinksOnDuplicateTeams: number;
  unknownTeamLabelsInSubmissions: number;
};

function duplicateTeamIds(teams: AuditTeam[], aliases: AuditAlias[]): Set<string> {
  const bySlug = new Map<string, string[]>();
  for (const team of teams) {
    if (!team.identitySlug) continue;
    const list = bySlug.get(team.identitySlug) ?? [];
    list.push(team.id);
    bySlug.set(team.identitySlug, list);
  }

  const byNormName = new Map<string, string[]>();
  for (const team of teams) {
    const key = normalizeSchoolAlias(team.displayName);
    const list = byNormName.get(key) ?? [];
    list.push(team.id);
    byNormName.set(key, list);
  }

  const dup = new Set<string>();
  for (const ids of bySlug.values()) {
    if (ids.length > 1) ids.forEach((id) => dup.add(id));
  }
  for (const ids of byNormName.values()) {
    if (ids.length > 1) ids.forEach((id) => dup.add(id));
  }

  // Alias points at team A, but another team B has display_name equal to that alias.
  for (const alias of aliases) {
    for (const team of teams) {
      if (team.id === alias.teamId) continue;
      if (normalizeSchoolAlias(team.displayName) === alias.normalizedAlias) {
        dup.add(team.id);
        dup.add(alias.teamId);
      }
    }
  }

  return dup;
}

export function buildScoutingDuplicateAuditCounts(input: {
  teams: AuditTeam[];
  players: AuditPlayer[];
  directReports: AuditDirectReport[];
  formLinks: AuditFormLink[];
  aliases: AuditAlias[];
  submissionTeamLabels: string[];
}): ScoutingDuplicateAuditCounts {
  const { teams, players, directReports, formLinks, aliases, submissionTeamLabels } = input;
  const dupIds = duplicateTeamIds(teams, aliases);

  const bySlug = new Map<string, number>();
  for (const team of teams) {
    if (!team.identitySlug) continue;
    bySlug.set(team.identitySlug, (bySlug.get(team.identitySlug) ?? 0) + 1);
  }
  const identitySlugGroups = [...bySlug.values()].filter((n) => n > 1).length;
  const teamsSharingIdentitySlug = [...bySlug.values()]
    .filter((n) => n > 1)
    .reduce((sum, n) => sum + n, 0);

  const byNormName = new Map<string, number>();
  for (const team of teams) {
    const key = normalizeSchoolAlias(team.displayName);
    byNormName.set(key, (byNormName.get(key) ?? 0) + 1);
  }
  const exactNormalizedNameDuplicateTeams = [...byNormName.values()]
    .filter((n) => n > 1)
    .reduce((sum, n) => sum + n, 0);

  let knownAliasStoredAsSeparateTeams = 0;
  for (const alias of aliases) {
    for (const team of teams) {
      if (team.id === alias.teamId) continue;
      if (normalizeSchoolAlias(team.displayName) === alias.normalizedAlias) {
        knownAliasStoredAsSeparateTeams += 1;
      }
    }
  }

  const nameToTeamIds = new Map<string, Set<string>>();
  for (const player of players) {
    if (!dupIds.has(player.teamId)) continue;
    const set = nameToTeamIds.get(player.normalizedName) ?? new Set();
    set.add(player.teamId);
    nameToTeamIds.set(player.normalizedName, set);
  }
  const opponentPlayersSplitAcrossDuplicateTeams = [...nameToTeamIds.values()].filter(
    (set) => set.size > 1,
  ).length;

  const directReportsOnDuplicateTeams = directReports.filter((row) => dupIds.has(row.teamId)).length;
  const formLinksOnDuplicateTeams = formLinks.filter(
    (row) => row.teamId != null && dupIds.has(row.teamId),
  ).length;

  const knownLabels = new Set<string>();
  for (const team of teams) knownLabels.add(normalizeSchoolAlias(team.displayName));
  for (const alias of aliases) knownLabels.add(alias.normalizedAlias);

  let unknownTeamLabelsInSubmissions = 0;
  for (const label of submissionTeamLabels) {
    const norm = normalizeSchoolAlias(label);
    if (!norm) continue;
    if (!knownLabels.has(norm)) unknownTeamLabelsInSubmissions += 1;
  }

  return {
    teamsSharingIdentitySlug,
    identitySlugGroups,
    exactNormalizedNameDuplicateTeams,
    knownAliasStoredAsSeparateTeams,
    opponentPlayersSplitAcrossDuplicateTeams,
    directReportsOnDuplicateTeams,
    formLinksOnDuplicateTeams,
    unknownTeamLabelsInSubmissions,
  };
}
