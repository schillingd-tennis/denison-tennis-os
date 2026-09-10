import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { primaryNavItems, getPageTitle } from "@/components/nav-items";
import {
  TEAM_OPERATIONS_INTRA_SQUAD_ROUTE,
  TEAM_OPERATIONS_PRACTICE_ROUTE,
  TEAM_OPERATIONS_SCHEDULE_ROUTE,
  TEAM_OPERATIONS_SCOUTING_ROUTE,
  TEAM_OPERATIONS_ROUTE,
  TOP_LEVEL_MODULE_PATHS,
  isTopLevelModulePage,
} from "@/lib/module-routes";

import {
  AI_SCOUTING_UNAVAILABLE,
  buildScoutingSummaryPrompt,
  parseScoutSummaryResponse,
  summarizeScoutingWithOpenAi,
} from "./aiSummarize";
import {
  buildImportAudit,
  classifyCsvRow,
  isCompoundOpponentName,
  normalizeHandedness,
  parseMatchDate,
  parseScoutingCsv,
  playerImportKey,
  teamImportKey,
} from "./csvImport";
import {
  filterMatchReports,
  filterPlayers,
  sortPlayers,
} from "./filtering";
import { parseDoubles, parseHandedness, readDirectReportFormData, readPublicScoutingFormData } from "./formData";
import {
  hashScoutingFormToken,
  isScoutingPublicFormPath,
  mintScoutingFormToken,
  scoutingFormPublicPath,
  SCOUTING_PUBLIC_FORM_ROUTE,
} from "./formTokens";
import {
  contributorIdentityKey,
  countDistinctContributors,
  countLinkedDirectReports,
  latestLinkedReportDate,
  latestLinkedReportDateLabel,
  linkedDirectReportsForPlayer,
  playerIdsToMarkAiStale,
  quickAiSourceSubtitle,
  selectPlayerAiEvidenceReports,
} from "./overviewMetrics";
import {
  activeOpponentPlayers,
  archivedOpponentPlayers,
  canGeneratePlayerAi,
  isOpponentActive,
  isOpponentArchived,
  playerMatchesLinkedReportQuery,
  selectNextActivePlayerId,
} from "./playerLifecycle";
import { SCOUTING_EXPECTED_TEAMS, SCOUTING_SEED, SCOUTING_SOURCE_LOGICAL_ROWS } from "./seedData";
import {
  resolveScoutingTeamIdentity,
  scoutingTeamCanonicalLabel,
} from "./teamIdentity";
import type { ScoutingDirectReport, ScoutingFormLink, ScoutingOpponentPlayer, ScoutingPlayerReport } from "./types";
import { EMPTY_VALUE, formatDate } from "@/lib/formatting";
import { mapPlayer, mapTeam } from "./mapScouting";

const csvPath = fileURLToPath(new URL("./data/scouting-reports.csv", import.meta.url));
const migrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/0056_team_operations_scouting.sql", import.meta.url),
);
const repairMigrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/0057_scouting_player_link_repair.sql", import.meta.url),
);
const quickSummaryMigrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/0058_scouting_quick_summary_bullets.sql", import.meta.url),
);

const archiveMigrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/0059_scouting_opponent_player_archive.sql", import.meta.url),
);

function samplePlayer(
  partial: Partial<ScoutingOpponentPlayer> & Pick<ScoutingOpponentPlayer, "id" | "displayName">,
): ScoutingOpponentPlayer {
  return {
    id: partial.id,
    teamId: partial.teamId ?? "team-1",
    teamDisplayName: partial.teamDisplayName ?? "Kenyon",
    displayName: partial.displayName,
    normalizedName: partial.normalizedName ?? partial.displayName.toLowerCase(),
    handedness: partial.handedness ?? "Right",
    directReportCount: partial.directReportCount ?? 1,
    hasAiReport: partial.hasAiReport ?? false,
    aiStale: partial.aiStale ?? false,
    archivedAt: partial.archivedAt !== undefined ? partial.archivedAt : null,
    archivedBy: partial.archivedBy !== undefined ? partial.archivedBy : null,
  };
}

function sampleDirect(partial: Partial<ScoutingDirectReport> & Pick<ScoutingDirectReport, "id">): ScoutingDirectReport {
  return {
    id: partial.id,
    sourceKey: partial.sourceKey ?? `key-${partial.id}`,
    source: partial.source ?? "csv_import",
    teamId: partial.teamId ?? "team-1",
    teamDisplayName: partial.teamDisplayName ?? "Kenyon",
    opponentPlayerId: partial.opponentPlayerId ?? "player-1",
    opponentDisplayName: partial.opponentDisplayName ?? "Alejandro Gonzalez",
    matchDate: partial.matchDate !== undefined ? partial.matchDate : "2026-04-18",
    matchDateRaw: partial.matchDateRaw ?? "4/18/2026",
    handedness: partial.handedness ?? "Right",
    handednessRaw: partial.handednessRaw ?? "Right Handed",
    strengthsWeaknesses: partial.strengthsWeaknesses ?? "serve",
    scoutingReport: partial.scoutingReport ?? "",
    reportBy: partial.reportBy ?? "Ethan",
    reportAuthorUserId: partial.reportAuthorUserId !== undefined ? partial.reportAuthorUserId : null,
    isDoubles: partial.isDoubles ?? false,
    importStatus: partial.importStatus ?? "imported",
    attachmentRefs: partial.attachmentRefs ?? [],
  };
}

test("Scouting route and Team Ops nested nav registration", () => {
  assert.equal(TEAM_OPERATIONS_SCOUTING_ROUTE, "/team-operations/scouting");
  assert.equal(isTopLevelModulePage(TEAM_OPERATIONS_SCOUTING_ROUTE), true);
  assert.ok((TOP_LEVEL_MODULE_PATHS as readonly string[]).includes(TEAM_OPERATIONS_SCOUTING_ROUTE));
  assert.equal(getPageTitle(TEAM_OPERATIONS_SCOUTING_ROUTE), "Scouting");

  const teamOps = primaryNavItems.find((item) => item.href === TEAM_OPERATIONS_ROUTE);
  assert.ok(teamOps?.children);
  assert.deepEqual(
    teamOps.children.map((child) => child.label),
    ["Schedule", "Practice", "Intra Squad", "Scouting"],
  );
  assert.deepEqual(
    teamOps.children.map((child) => child.href),
    [
      TEAM_OPERATIONS_SCHEDULE_ROUTE,
      TEAM_OPERATIONS_PRACTICE_ROUTE,
      TEAM_OPERATIONS_INTRA_SQUAD_ROUTE,
      TEAM_OPERATIONS_SCOUTING_ROUTE,
    ],
  );
});

test("CSV source has 43 logical rows with expected team counts", () => {
  const csv = readFileSync(csvPath, "utf8");
  const rows = parseScoutingCsv(csv);
  const audit = buildImportAudit(rows);
  assert.equal(rows.length, SCOUTING_SOURCE_LOGICAL_ROWS);
  assert.equal(audit.sourceLogicalRows, 43);
  assert.equal(audit.rowsImported, 43);
  assert.deepEqual(audit.teams, { ...SCOUTING_EXPECTED_TEAMS });
  assert.equal(audit.teamLevelRecords, 1);
  assert.deepEqual(audit.amherstFileReferences, [
    "Amherst_Summary_Scouting_2026.pdf",
    "Amherst_Stat_Breakdown_2026.pdf",
  ]);
  assert.equal(audit.opponentPlayersCreated, 26);
  assert.equal(audit.compoundOpponentRecords, 12);
  assert.equal(audit.rowsUnresolved, 13);
  const repeatedNames = audit.repeatedPlayerGroups.map((group) => `${group.name}/${group.team}`).sort();
  assert.deepEqual(repeatedNames, [
    "Alejandro Gonzalez/Kenyon",
    "Jeremy Sieben/Wash U",
    "Rex Harrison/Amherst",
  ]);
});

test("conservative matching: exact repeats link; compounds stay unresolved; no fuzzy merge", () => {
  assert.equal(isCompoundOpponentName("Alejandro Gonzalez and Eliezer Gonzalez"), true);
  assert.equal(isCompoundOpponentName("Sillaste / Frangenberg"), true);
  assert.equal(isCompoundOpponentName("Ethan Wu Case Fagan"), true);
  assert.equal(isCompoundOpponentName("Alejandro Gonzalez"), false);
  assert.equal(isCompoundOpponentName("Jon Totorica"), false);

  const gonzalez = playerImportKey("Kenyon", "Alejandro Gonzalez");
  assert.equal(playerImportKey("Kenyon", "alejandro  gonzalez"), gonzalez);
  assert.notEqual(playerImportKey("Kenyon", "Gonzalez Gonzalez"), gonzalez);
  assert.notEqual(playerImportKey("Amherst", "Alejandro Gonzalez"), gonzalez);
});

test("Chicago incomplete row is unresolved import-review without inventing a player", () => {
  const row = classifyCsvRow({
    rowIndex: 41,
    dateRaw: "",
    opponentRaw: "",
    teamRaw: "Chicago",
    handednessRaw: "Right",
    strengthsWeaknesses: "* His backhand is attackable",
    scoutingReport: "",
    reportBy: "Aidan",
    doublesRaw: "false",
  });
  assert.equal(row.kind, "unresolved_incomplete");
  assert.equal(row.playerLinkName, null);
  assert.equal(row.handedness, "Right");
  assert.equal(row.reportBy, "Aidan");
  assert.equal(row.isDoubles, false);
});

test("Amherst TEAM row is team-level with PDF filename refs only", () => {
  const row = classifyCsvRow({
    rowIndex: 42,
    dateRaw: "",
    opponentRaw: "TEAM - AMHERST",
    teamRaw: "Amherst",
    handednessRaw: "",
    strengthsWeaknesses: "",
    scoutingReport: "Amherst_Summary_Scouting_2026.pdf,Amherst_Stat_Breakdown_2026.pdf",
    reportBy: "Schills",
    doublesRaw: "false",
  });
  assert.equal(row.kind, "team_level");
  assert.deepEqual(row.attachmentRefs, [
    "Amherst_Summary_Scouting_2026.pdf",
    "Amherst_Stat_Breakdown_2026.pdf",
  ]);
  assert.equal(row.playerLinkName, null);
});

test("safe normalize: dates, handedness, caps; preserve doubles exactly", () => {
  assert.equal(parseMatchDate("6/27/2026"), "2026-06-27");
  assert.equal(parseMatchDate(""), null);
  assert.equal(normalizeHandedness("Right Handed"), "Right");
  assert.equal(normalizeHandedness("Left"), "Left");
  assert.equal(normalizeHandedness(""), "");
  const row = classifyCsvRow({
    rowIndex: 0,
    dateRaw: "2/7/2026",
    opponentRaw: "coleman merce",
    teamRaw: "Wash U",
    handednessRaw: "Right Handed",
    strengthsWeaknesses: "note",
    scoutingReport: "",
    reportBy: "Nick",
    doublesRaw: "false",
  });
  assert.equal(row.opponentDisplayName, "Coleman Merce");
  assert.equal(row.isDoubles, false);
  assert.equal(row.isDoublesRaw, "false");
});

test("seed payload and migration are idempotent insert-only", () => {
  assert.equal(SCOUTING_SEED.reports.length, 43);
  assert.equal(SCOUTING_SEED.teams.length, 8);
  assert.equal(SCOUTING_SEED.players.length, 26);
  const keys = SCOUTING_SEED.reports.map((row: { source_key: string }) => row.source_key);
  assert.equal(new Set(keys).size, 43);

  const migration = readFileSync(migrationPath, "utf8");
  assert.match(migration, /create table if not exists public\.scouting_teams/);
  assert.match(migration, /create table if not exists public\.scouting_opponent_players/);
  assert.match(migration, /create table if not exists public\.scouting_direct_reports/);
  assert.match(migration, /create table if not exists public\.scouting_player_reports/);
  assert.match(migration, /create table if not exists public\.scouting_team_reports/);
  assert.match(migration, /create table if not exists public\.scouting_form_links/);
  assert.match(migration, /create table if not exists public\.scouting_form_submissions/);
  assert.match(migration, /on conflict \(source_key\) do nothing/);
  assert.match(migration, /on conflict \(import_key\) do nothing/);
  assert.doesNotMatch(migration, /on conflict \(source_key\) do update/i);
  assert.match(migration, /scouting_resolve_form_link/);
  assert.match(migration, /scouting_submit_form_response/);
  assert.match(migration, /case-western/);
  assert.match(migration, /Amherst_Summary_Scouting_2026\.pdf/);
  for (const team of Object.keys(SCOUTING_EXPECTED_TEAMS)) {
    assert.match(migration, new RegExp(team.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const repair = readFileSync(repairMigrationPath, "utf8");
  assert.match(repair, /opponent_player_id = p\.id/);
  assert.match(repair, /import_status = 'imported'/);
  assert.match(repair, /on conflict \(import_key\) do nothing/);
  assert.match(repair, /normalized_name/);
  assert.doesNotMatch(repair, /delete from public\.scouting_/i);
  assert.doesNotMatch(repair, /fuzzy|similarity|pg_trgm/i);
});

test("CWRU identity links to existing schoolIdentity slug", () => {
  const identity = resolveScoutingTeamIdentity("CWRU");
  assert.equal(identity?.slug, "case-western");
  assert.equal(identity?.label, "Case Western");
  assert.ok(identity?.logoSrc);
  assert.equal(resolveScoutingTeamIdentity("Gustavus")?.slug, "gustavus-adolphus");
  assert.equal(teamImportKey("CWRU"), teamImportKey("cwru"));
});

test("CSV scouting teams resolve logos and canonical OS labels", () => {
  const expected: Record<string, { slug: string; label: string; hasLogo: boolean }> = {
    Amherst: { slug: "amherst", label: "Amherst", hasLogo: true },
    "Wash U": { slug: "wash-u", label: "Wash U St Louis", hasLogo: true },
    Kenyon: { slug: "kenyon", label: "Kenyon", hasLogo: true },
    Swarthmore: { slug: "swarthmore", label: "Swarthmore", hasLogo: true },
    Chicago: { slug: "chicago", label: "University of Chicago", hasLogo: true },
    CWRU: { slug: "case-western", label: "Case Western", hasLogo: true },
    Emory: { slug: "emory", label: "Emory", hasLogo: true },
    Gustavus: { slug: "gustavus-adolphus", label: "Gustavus Adolphus", hasLogo: true },
  };
  for (const [sourceName, want] of Object.entries(expected)) {
    const identity = resolveScoutingTeamIdentity(sourceName);
    assert.equal(identity?.slug, want.slug, sourceName);
    assert.equal(identity?.label, want.label, sourceName);
    assert.equal(Boolean(identity?.logoSrc), want.hasLogo, sourceName);
    assert.equal(scoutingTeamCanonicalLabel(sourceName), want.label, sourceName);
    assert.match(identity?.logoSrc ?? "", /^\/school-logos\//);
  }
});

test("Opponent Players master-detail structure, compact filters, Direct/AI split", () => {
  const workspace = readFileSync(
    fileURLToPath(new URL("./components/ScoutingWorkspace.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(workspace, /data-scouting-master-detail/);
  assert.match(workspace, /data-scouting-desktop-columns/);
  assert.match(workspace, /data-scouting-tablet-layout/);
  assert.match(workspace, /data-scouting-mobile-progressive/);
  assert.match(workspace, /data-scouting-team-column/);
  assert.match(workspace, /data-scouting-player-column/);
  assert.match(workspace, /data-scouting-report-column/);
  assert.match(workspace, /data-scouting-team-nav/);
  assert.match(workspace, /data-scouting-player-list/);
  assert.match(workspace, /data-scouting-player-workspace/);
  assert.match(workspace, /data-scouting-filter-bar/);
  assert.match(workspace, /ModuleSectionTabs/);
  assert.match(workspace, /SCOUTING_VIEW_TABS/);
  assert.doesNotMatch(workspace, /rounded-full/);
  // Desktop visibility: default grid + max-md:hidden (never hidden-then-md-grid)
  assert.match(workspace, /max-md:hidden/);
  assert.match(workspace, /data-scouting-desktop-columns=""[\s\S]{0,200}className="grid /);
  assert.doesNotMatch(
    workspace,
    /data-scouting-desktop-columns=""[\s\S]{0,200}className="hidden /,
  );
  assert.match(
    workspace,
    /grid-cols-\[minmax\(14\.5rem,16\.5rem\)_minmax\(17\.5rem,21rem\)_minmax\(0,1fr\)\]/,
  );
  // Named column order: team → player → report inside desktop grid
  assert.match(
    workspace,
    /data-scouting-desktop-columns=""[\s\S]*?data-scouting-team-column=""[\s\S]*?data-scouting-player-column=""[\s\S]*?data-scouting-report-column=""/,
  );
  // Shell mounts even when loadError is set (data must not remove columns)
  assert.match(workspace, /view === "opponentPlayers" \? \(/);
  assert.doesNotMatch(workspace, /!loadError && view === "opponentPlayers"/);
  assert.match(workspace, /filtered player/);
  assert.match(workspace, /navTeams/);
  assert.match(workspace, /selectionHydrated/);
  assert.match(workspace, /function selectPlayer/);
  assert.match(workspace, /Middle-column \/ roster select/);
  assert.match(workspace, /openPlayerCardFromDirectory/);
  assert.doesNotMatch(
    workspace,
    /function selectPlayer\([\s\S]{0,120}openScoutingPlayer/,
  );
  assert.match(workspace, /openScoutingPlayer/);
  assert.match(workspace, /data-scouting-team-player-card/);
  assert.match(workspace, /ScoutingDirectReportPreviewCard/);
  assert.match(workspace, /ScoutingPlayerCard/);
  assert.match(workspace, /key=\{`\$\{activePlayer\.id\}:\$\{surface\.workspace\}/);
  assert.match(workspace, /data-scouting-back/);
  assert.match(workspace, /Back to \{/);
  assert.doesNotMatch(workspace, /favicon|https?:\/\/[^"'`\s]+\/logo/i);
  assert.match(workspace, /DrawerField/);
  assert.doesNotMatch(workspace, /DrawerField[\s\S]{0,80}font-semibold/);

  const moduleTabs = readFileSync(
    fileURLToPath(new URL("../../components/ModuleSectionTabs.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(moduleTabs, /rounded-card border border-border bg-surface p-1/);
  assert.match(moduleTabs, /rounded-control/);
  assert.doesNotMatch(moduleTabs, /rounded-full/);
  const practiceDash = readFileSync(
    fileURLToPath(new URL("../practice/components/PracticeDashboard.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(practiceDash, /ModuleSectionTabs/);
  assert.match(practiceDash, /aria-label="Practice sections"/);

  const playerCard = readFileSync(
    fileURLToPath(new URL("./components/ScoutingPlayerCard.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(playerCard, /data-scouting-player-card/);
  assert.match(playerCard, /data-scouting-direct-ai-split/);
  assert.match(playerCard, /Direct Report/);
  assert.match(playerCard, /AI Report/);
  assert.match(playerCard, /Match Reports/);
  assert.match(playerCard, /PersonWorkspaceShell/);
  assert.match(playerCard, /MobileWorkspaceSelector/);
  assert.match(playerCard, /AdaptiveWorkspace/);
  assert.match(playerCard, /ScoutingTeamMark/);
  assert.doesNotMatch(playerCard, /favicon|https?:\/\/[^"'`\s]+\/logo/i);

  const reportCards = readFileSync(
    fileURLToPath(new URL("./components/ScoutingReportCards.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(reportCards, /data-scouting-report-card/);
  assert.match(reportCards, /data-scouting-report-complete/);
  assert.match(reportCards, /Original Imported Report/);
  assert.match(reportCards, /AI Consolidated Report/);
  assert.match(reportCards, /CSV Import/);
  assert.match(reportCards, /Coach Entry/);
  assert.match(reportCards, /Player Form/);
  assert.match(reportCards, /Team Report Card/);
  assert.match(reportCards, /Referenced players/);
  assert.match(reportCards, /ScheduleIdentityMark/);
  assert.match(reportCards, /DrawerField/);
  assert.doesNotMatch(reportCards, /DrawerField[\s\S]{0,80}font-semibold/);
  assert.doesNotMatch(reportCards, /favicon|https?:\/\/[^"'`\s]+\/logo/i);

  const publicForm = readFileSync(
    fileURLToPath(new URL("./components/PublicScoutingForm.tsx", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(publicForm, /TeamMark|ScheduleIdentityMark|school-logos/);
});

test("locked Opponent Players three-column layout contract", () => {
  const workspace = readFileSync(
    fileURLToPath(new URL("./components/ScoutingWorkspace.tsx", import.meta.url)),
    "utf8",
  );

  // Named regions exist
  for (const attr of [
    "data-scouting-team-column",
    "data-scouting-player-column",
    "data-scouting-report-column",
    "data-scouting-desktop-columns",
    "data-scouting-team-nav",
    "data-scouting-player-list",
    "data-scouting-player-workspace",
  ]) {
    assert.match(workspace, new RegExp(attr));
  }

  // Column order + desktop grid + widths (Teams ~230–270, Players ~280–340, Reports flex)
  assert.match(
    workspace,
    /data-scouting-desktop-columns=""[\s\S]*?data-scouting-team-column=""[\s\S]*?data-scouting-player-column=""[\s\S]*?data-scouting-report-column=""/,
  );
  assert.match(
    workspace,
    /grid-cols-\[minmax\(14\.5rem,16\.5rem\)_minmax\(17\.5rem,21rem\)_minmax\(0,1fr\)\]/,
  );
  assert.match(workspace, /data-scouting-desktop-columns=""[\s\S]{0,200}className="grid /);
  assert.match(workspace, /max-md:hidden/);
  assert.doesNotMatch(
    workspace,
    /data-scouting-desktop-columns=""[\s\S]{0,200}className="hidden /,
  );

  // Loading / empty / no-reports stay inside shell — empty states + load error do not unmount columns
  assert.match(workspace, /No linked reports/);
  assert.match(workspace, /Select an opponent player/);
  assert.match(workspace, /data-scouting-load-error/);
  assert.doesNotMatch(workspace, /!loadError && view === "opponentPlayers"/);
  assert.match(workspace, /Shell always mounts for Opponent Players/);

  // Count invariant: toolbar can show filtered player count while desktop columns remain grid (not display:none)
  assert.match(workspace, /filtered player/);
  assert.match(workspace, /Do NOT use the hidden-then-md-grid anti-pattern/);

  // No flat-table replacement of Opponent Players master-detail
  assert.match(workspace, /function OpponentPlayersMasterDetail/);
  assert.match(workspace, /function TeamsView/);
  const teamsViewIdx = workspace.indexOf("function TeamsView");
  const masterIdx = workspace.indexOf("function OpponentPlayersMasterDetail");
  assert.ok(masterIdx > 0);
  assert.ok(teamsViewIdx > masterIdx);
  // Teams tab owns the table; Opponent Players must not render a directory <table>
  const masterSlice = workspace.slice(masterIdx, teamsViewIdx);
  assert.doesNotMatch(masterSlice, /<table[\s>]/);
  assert.match(masterSlice, /data-scouting-desktop-columns/);

  // Interactions: middle select stays on directory; green Open player card opens card; report opens report
  assert.match(workspace, /Middle-column \/ roster select/);
  assert.match(workspace, /setSurface\(\{ kind: "directory" \}\)/);
  assert.match(workspace, /Open player card/);
  assert.match(workspace, /openPlayerCardFromDirectory/);
  assert.match(workspace, /ScoutingDirectReportPreviewCard/);
  assert.match(workspace, /onOpenReport/);

  // Peer tabs stay Practice-style ModuleSectionTabs (not pill tabs)
  assert.match(workspace, /ModuleSectionTabs/);
  assert.doesNotMatch(workspace, /rounded-full/);
});

test("relationship inventory: 43 source / 26 safe players / 29 linked / 14 unresolved", () => {
  const csv = readFileSync(csvPath, "utf8");
  const rows = parseScoutingCsv(csv);
  const audit = buildImportAudit(rows);
  assert.equal(rows.length, 43);
  assert.equal(audit.opponentPlayersCreated, 26);
  assert.equal(rows.filter((row) => row.kind === "player_report").length, 29);
  assert.equal(
    rows.filter((row) => row.kind !== "player_report").length,
    14,
  );
  const linkedRepeats = audit.repeatedPlayerGroups.map((group) => `${group.name}/${group.team}`).sort();
  assert.deepEqual(linkedRepeats, [
    "Alejandro Gonzalez/Kenyon",
    "Jeremy Sieben/Wash U",
    "Rex Harrison/Amherst",
  ]);
  assert.equal(
    rows.filter(
      (row) =>
        row.kind === "player_report" &&
        row.playerLinkName === "Jon Totorica" &&
        row.teamDisplayName === "CWRU",
    ).length,
    1,
  );
});

test("Team player-card primitives are reused without modifying Team shell sources", () => {
  const personShell = readFileSync(
    fileURLToPath(new URL("../../components/person-workspace-shell/PersonWorkspaceShell.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(personShell, /LOCKED OS UI CONTRACT/);
  const playerCard = readFileSync(
    fileURLToPath(new URL("./components/ScoutingPlayerCard.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(playerCard, /from "@\/components\/person-workspace-shell"/);
  assert.match(playerCard, /from "@\/components\/adaptive-workspace"/);
  assert.match(playerCard, /from "@\/components\/mobile-workspace"/);
});

test("directory filtering and sorting", () => {
  const players: ScoutingOpponentPlayer[] = [
    {
      id: "1",
      teamId: "t1",
      teamDisplayName: "Kenyon",
      displayName: "Alejandro Gonzalez",
      normalizedName: "alejandro gonzalez",
      handedness: "Right",
      directReportCount: 2,
      hasAiReport: false,
      aiStale: false,
      archivedAt: null,
      archivedBy: null,
    },
    {
      id: "2",
      teamId: "t2",
      teamDisplayName: "Amherst",
      displayName: "Rex Harrison",
      normalizedName: "rex harrison",
      handedness: "Right",
      directReportCount: 2,
      hasAiReport: true,
      aiStale: true,
      archivedAt: null,
      archivedBy: null,
    },
  ];
  assert.equal(filterPlayers(players, { query: "rex", teamId: "", handedness: "", aiStatus: "" }).length, 1);
  assert.equal(sortPlayers(players, "displayName", "asc")[0]?.displayName, "Alejandro Gonzalez");
  assert.equal(
    filterPlayers(players, { query: "", teamId: "", handedness: "", aiStatus: "stale" }).length,
    1,
  );
  assert.equal(
    filterMatchReports(
      [sampleDirect({ id: "r1", opponentPlayerId: "1", strengthsWeaknesses: "serve" })],
      { query: "serve", teamId: "", importStatus: "" },
    ).length,
    1,
  );
});

test("form validation and drawer field label weight contract", () => {
  const form = new FormData();
  form.set("teamId", "team-1");
  form.set("opponentDisplayName", "Test Player");
  form.set("handedness", "Right");
  form.set("strengthsWeaknesses", "Big serve");
  const parsed = readDirectReportFormData(form);
  assert.equal(parsed.ok, true);

  const bad = new FormData();
  assert.equal(readDirectReportFormData(bad).ok, false);
  assert.equal(parseHandedness("Both"), undefined);
  assert.equal(parseDoubles("true"), true);

  const publicForm = new FormData();
  publicForm.set("strengthsWeaknesses", "notes");
  assert.equal(readPublicScoutingFormData(publicForm).ok, true);

  const workspace = readFileSync(
    fileURLToPath(new URL("./components/ScoutingWorkspace.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(workspace, /DrawerField/);
  assert.doesNotMatch(workspace, /DrawerField[\s\S]{0,80}font-semibold/);
  const drawerField = readFileSync(
    fileURLToPath(new URL("../../components/workspace-drawer/DrawerField.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(drawerField, /drawerFieldLabel/);
  assert.doesNotMatch(drawerField, /font-semibold|font-bold/);
});

test("public form token architecture hashes secrets and allows unauth path", () => {
  const { rawToken, tokenHash } = mintScoutingFormToken();
  assert.equal(tokenHash, hashScoutingFormToken(rawToken));
  assert.notEqual(rawToken, tokenHash);
  assert.equal(tokenHash.length, 64);
  assert.equal(scoutingFormPublicPath(rawToken).startsWith(SCOUTING_PUBLIC_FORM_ROUTE), true);
  assert.equal(isScoutingPublicFormPath("/scouting-form/abc"), true);
  assert.equal(isScoutingPublicFormPath("/team-operations/scouting"), false);

  const proxy = readFileSync(fileURLToPath(new URL("../../proxy.ts", import.meta.url)), "utf8");
  assert.match(proxy, /isScoutingPublicFormPath/);
  assert.match(proxy, /allowsUnauthenticated/);
  assert.doesNotMatch(proxy, /user && isScoutingPublicFormPath/);

  const migration = readFileSync(migrationPath, "utf8");
  assert.match(migration, /grant execute on function public\.scouting_submit_form_response/);
  assert.match(migration, /to anon, authenticated/);
  assert.doesNotMatch(migration, /grant select, insert, update, delete on table public\.scouting_direct_reports to anon/);
  assert.match(migration, /v_hits > 8/);
});

test("AI provider disabled without key; never overwrites sources; citations required", async () => {
  const evidence = [
    {
      id: "rep-1",
      matchDate: "2026-04-18",
      reportBy: "Ethan",
      isDoubles: false,
      opponentDisplayName: "Alejandro Gonzalez",
      strengthsWeaknesses: "Big serve",
      scoutingReport: "",
    },
  ];
  const prompt = buildScoutingSummaryPrompt({
    subjectLabel: "Alejandro Gonzalez",
    kind: "player",
    evidence,
  });
  assert.match(prompt.system, /ONLY the provided evidence/i);
  assert.match(prompt.user, /rep-1/);

  const missing = await summarizeScoutingWithOpenAi({
    subjectLabel: "Alejandro Gonzalez",
    kind: "player",
    evidence,
    apiKey: "",
  });
  assert.deepEqual(missing, { error: AI_SCOUTING_UNAVAILABLE });

  const stubbed = await summarizeScoutingWithOpenAi({
    subjectLabel: "Alejandro Gonzalez",
    kind: "player",
    evidence,
    apiKey: "test-key",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  body: "Strengths: Big serve [rep-1]",
                  quick_summary_bullets: ["Attack second serves", "Pressure the backhand"],
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
  });
  assert.ok(!("error" in stubbed));
  if (!("error" in stubbed)) {
    assert.match(stubbed.body, /Big serve/);
    assert.deepEqual(stubbed.citedDirectReportIds, ["rep-1"]);
    assert.equal(stubbed.quickSummaryBullets.length, 2);
  }

  const emptyEvidence = await summarizeScoutingWithOpenAi({
    subjectLabel: "Nobody",
    kind: "player",
    evidence: [],
    apiKey: "test-key",
  });
  assert.deepEqual(emptyEvidence, { error: "No supported evidence to summarize." });
});

test("Overview summary cards: reports, latest, contributors", () => {
  const playerId = "p-alejandro";
  const otherPlayer = "p-other";
  const reports: ScoutingDirectReport[] = [
    sampleDirect({
      id: "r1",
      sourceKey: "sk-1",
      opponentPlayerId: playerId,
      matchDate: "2026-04-10",
      reportBy: "Ethan",
    }),
    sampleDirect({
      id: "r2",
      sourceKey: "sk-2",
      opponentPlayerId: playerId,
      matchDate: "2026-04-18",
      reportBy: " Schills ",
    }),
    sampleDirect({
      id: "r1-dup",
      sourceKey: "sk-1",
      opponentPlayerId: playerId,
      matchDate: "2026-04-18",
      reportBy: "Ethan",
    }),
    sampleDirect({
      id: "r-other",
      sourceKey: "sk-other",
      opponentPlayerId: otherPlayer,
      opponentDisplayName: "Other Player",
      matchDate: "2026-05-01",
      reportBy: "Nick",
    }),
    sampleDirect({
      id: "r-compound",
      sourceKey: "sk-compound",
      opponentPlayerId: null,
      opponentDisplayName: "Alejandro Gonzalez and Eliezer Gonzalez",
      importStatus: "compound_unresolved",
      reportBy: "Jake",
    }),
    sampleDirect({
      id: "r-team",
      sourceKey: "sk-team",
      opponentPlayerId: null,
      opponentDisplayName: "TEAM - AMHERST",
      importStatus: "team_level",
      reportBy: "Schills",
    }),
  ];

  // 1–4 reports count
  assert.equal(countLinkedDirectReports(reports, playerId), 2);
  assert.equal(
    linkedDirectReportsForPlayer(reports, playerId).every((row) => row.opponentPlayerId === playerId),
    true,
  );
  assert.equal(
    linkedDirectReportsForPlayer(reports, playerId).some((row) => row.importStatus === "team_level"),
    false,
  );
  assert.equal(
    linkedDirectReportsForPlayer(reports, playerId).some((row) => row.opponentPlayerId === otherPlayer),
    false,
  );

  // 5–7 latest date
  assert.equal(latestLinkedReportDate(reports, playerId), "2026-04-18");
  assert.equal(
    latestLinkedReportDate(
      [
        sampleDirect({ id: "d1", opponentPlayerId: playerId, matchDate: "2026-03-01" }),
        sampleDirect({ id: "d2", opponentPlayerId: playerId, matchDate: null, matchDateRaw: "" }),
      ],
      playerId,
    ),
    "2026-03-01",
  );
  assert.equal(
    latestLinkedReportDateLabel(
      [
        sampleDirect({ id: "u1", opponentPlayerId: playerId, matchDate: null, matchDateRaw: "" }),
        sampleDirect({ id: "u2", opponentPlayerId: playerId, matchDate: null, matchDateRaw: "unknown" }),
      ],
      playerId,
    ),
    EMPTY_VALUE,
  );
  assert.equal(formatDate("2026-04-18"), latestLinkedReportDateLabel(reports, playerId));

  // 8–12 contributors
  assert.equal(
    countDistinctContributors(
      [
        sampleDirect({
          id: "c1",
          opponentPlayerId: playerId,
          reportBy: "Nick",
          reportAuthorUserId: "user-1",
        }),
        sampleDirect({
          id: "c2",
          opponentPlayerId: playerId,
          reportBy: "Different Name",
          reportAuthorUserId: "user-1",
        }),
        sampleDirect({
          id: "c3",
          opponentPlayerId: playerId,
          reportBy: "Kael",
          reportAuthorUserId: "user-2",
        }),
      ],
      playerId,
    ),
    2,
  );
  assert.equal(countDistinctContributors(reports, playerId), 2);
  assert.equal(contributorIdentityKey({ reportBy: "Schills" }), contributorIdentityKey({ reportBy: " schills " }));
  assert.equal(contributorIdentityKey({ reportBy: "Nick" }), contributorIdentityKey({ reportBy: "NICK" }));
  assert.equal(
    countDistinctContributors(
      [
        sampleDirect({ id: "b1", opponentPlayerId: playerId, reportBy: "  " }),
        sampleDirect({ id: "b2", opponentPlayerId: playerId, reportBy: "" }),
        sampleDirect({ id: "b3", opponentPlayerId: playerId, reportBy: "Ethan" }),
      ],
      playerId,
    ),
    1,
  );
  assert.notEqual(
    contributorIdentityKey({ reportBy: "Chapi" }),
    contributorIdentityKey({ reportBy: "Chapides" }),
  );
});

test("Overview Quick AI evidence selection and labels", () => {
  const playerId = "p1";
  const priorAi: ScoutingPlayerReport = {
    id: "ai-1",
    opponentPlayerId: playerId,
    kind: "ai_generated",
    body: "Prior AI body that must not be evidence",
    quickSummaryBullets: ["old bullet"],
    status: "draft",
    citedDirectReportIds: ["r1"],
    stale: false,
    generatedAt: "2026-04-01T00:00:00.000Z",
    reviewedAt: null,
  };
  const directs = [
    sampleDirect({ id: "r1", sourceKey: "a", opponentPlayerId: playerId, reportBy: "Ethan" }),
    sampleDirect({ id: "r2", sourceKey: "b", opponentPlayerId: playerId, reportBy: "Schills" }),
    sampleDirect({ id: "r1-again", sourceKey: "a", opponentPlayerId: playerId, reportBy: "Ethan" }),
    sampleDirect({
      id: "r-other",
      sourceKey: "c",
      opponentPlayerId: "p2",
      opponentDisplayName: "Rex Harrison",
      reportBy: "Nick",
    }),
    sampleDirect({
      id: "r-compound",
      sourceKey: "d",
      opponentPlayerId: playerId,
      opponentDisplayName: "Alejandro Gonzalez and Eliezer Gonzalez",
      importStatus: "compound_unresolved",
      reportBy: "Jake",
    }),
    sampleDirect({
      id: "r-teamish",
      sourceKey: "e",
      opponentPlayerId: playerId,
      importStatus: "team_level",
      reportBy: "Schills",
    }),
  ];

  const evidence = selectPlayerAiEvidenceReports({
    playerId,
    directReports: directs,
    priorAiReport: priorAi,
    teamReports: [
      {
        id: "team-ai",
        teamId: "t1",
        kind: "ai_generated",
        body: "team",
        status: "draft",
        citedDirectReportIds: [],
        citedPlayerReportIds: [],
        attachmentRefs: [],
        stale: false,
        generatedAt: null,
        reviewedAt: null,
      },
    ],
  });

  // 13–18
  assert.deepEqual(
    evidence.map((row) => row.id).sort(),
    ["r1", "r2"],
  );
  assert.equal(evidence.some((row) => row.id === "r-other"), false);
  assert.equal(evidence.some((row) => row.importStatus === "team_level"), false);
  assert.equal(evidence.some((row) => row.importStatus === "compound_unresolved"), false);
  assert.equal(JSON.stringify(evidence).includes(priorAi.body), false);

  // 19–20
  assert.equal(quickAiSourceSubtitle(0, 0), "No scouting reports are linked to this opponent yet.");
  assert.equal(quickAiSourceSubtitle(1, 1), "Based on 1 report");
  assert.match(quickAiSourceSubtitle(2, 2), /Generated from 2 reports by 2 contributors/);
});

test("Overview Quick AI structured bullets storage + stale helpers", () => {
  // 21 structured bullets
  const parsed = parseScoutSummaryResponse(
    JSON.stringify({
      body: "Strengths: pace\nWeaknesses: backhand",
      quick_summary_bullets: [
        "Looks to attack second serves",
        "Multiple reports identify the backhand as attackable",
        "Bring him forward before attempting to pass",
      ],
    }),
    ["rep-1", "rep-2"],
    "gpt-test",
  );
  assert.ok(!("error" in parsed));
  if (!("error" in parsed)) {
    assert.equal(parsed.quickSummaryBullets.length, 3);
    assert.match(parsed.body, /Strengths/);
    assert.deepEqual(parsed.citedDirectReportIds, ["rep-1", "rep-2"]);
  }

  // 22 stored rather than regenerated — schema + repository write field
  const migration = readFileSync(quickSummaryMigrationPath, "utf8");
  assert.match(migration, /quick_summary_bullets/);
  const repository = readFileSync(
    fileURLToPath(new URL("./repository.ts", import.meta.url)),
    "utf8",
  );
  assert.match(repository, /quick_summary_bullets: summary\.quickSummaryBullets/);
  assert.match(repository, /Failed generation preserves any previous successful AI report/);
  assert.doesNotMatch(repository, /summarizeScoutingWithOpenAi\(\{[\s\S]*loadPlayerWorkspaceAction/);

  // 23–25 stale on add/edit/delete/relink
  assert.deepEqual(playerIdsToMarkAiStale(null, "p1"), ["p1"]);
  assert.deepEqual(playerIdsToMarkAiStale("p1", "p1").sort(), ["p1"]);
  assert.deepEqual(playerIdsToMarkAiStale("p1", "p2").sort(), ["p1", "p2"]);
  assert.deepEqual(playerIdsToMarkAiStale("p1", null), ["p1"]);
  assert.match(repository, /deleteDirectReport/);
  assert.match(repository, /playerIdsToMarkAiStale/);
  assert.match(repository, /markPlayersAiStale/);

  // 26 failed generation preserves previous (no write on error path)
  assert.match(repository, /if \("error" in summary\) return summary;/);

  const playerCard = readFileSync(
    fileURLToPath(new URL("./components/ScoutingPlayerCard.tsx", import.meta.url)),
    "utf8",
  );
  // 27 duplicate generation prevented via pending gate
  assert.match(playerCard, /if \(pending \|\| reportCount === 0 \|\| !allowAiGenerate\) return/);
  assert.match(playerCard, /disabled=\{pending\}/);

  // 28–30 View Sources / Open Full AI / canonical AI workspace
  assert.match(playerCard, /View Sources/);
  assert.match(playerCard, /data-scouting-quick-ai-sources/);
  assert.match(playerCard, /Open Full AI Report/);
  assert.match(playerCard, /setWorkspaceId\("ai"\)/);
  assert.match(playerCard, /data-scouting-ai-workspace/);
  assert.match(playerCard, /ScoutingAiReportCard/);
  assert.match(playerCard, /quickSummaryBullets/);
});

test("Overview UI structure and guardrails", () => {
  const playerCard = readFileSync(
    fileURLToPath(new URL("./components/ScoutingPlayerCard.tsx", import.meta.url)),
    "utf8",
  );
  const workspace = readFileSync(
    fileURLToPath(new URL("./components/ScoutingWorkspace.tsx", import.meta.url)),
    "utf8",
  );
  const personShell = readFileSync(
    fileURLToPath(new URL("../../components/person-workspace-shell/PersonWorkspaceShell.tsx", import.meta.url)),
    "utf8",
  );

  // 31–33
  assert.match(playerCard, /data-scouting-overview-summary-cards/);
  assert.match(playerCard, /label="Reports"/);
  assert.match(playerCard, /label="Latest Report"/);
  assert.match(playerCard, /label="Contributors"/);
  assert.match(playerCard, /data-scouting-quick-ai/);
  assert.match(playerCard, /Quick AI Scouting Report/);
  assert.match(playerCard, /sm:grid-cols-3/);
  assert.match(playerCard, /min-h-11/);
  assert.match(playerCard, /role="status"/);
  assert.match(playerCard, /list-disc/);

  // 34 existing player workspaces remain
  assert.match(playerCard, /id: "direct"/);
  assert.match(playerCard, /id: "ai"/);
  assert.match(playerCard, /id: "matchReports"/);
  assert.match(playerCard, /id: "notes"/);
  assert.match(playerCard, /data-scouting-direct-ai-split/);

  // 35 Team AW selection unchanged
  assert.match(workspace, /openScoutingPlayer/);
  assert.match(workspace, /data-scouting-team-player-card/);
  assert.match(workspace, /onOpenPlayer/);

  // 36 Team module PersonWorkspaceShell contract untouched
  assert.match(personShell, /LOCKED OS UI CONTRACT/);
  assert.match(playerCard, /from "@\/components\/person-workspace-shell"/);
});

test("Team Ops landing lists Scouting after Intra Squad", () => {
  const landing = readFileSync(
    fileURLToPath(new URL("../../app/team-operations/page.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(landing, /TEAM_OPERATIONS_SCOUTING_ROUTE/);
  assert.match(landing, /Scouting/);
  assert.doesNotMatch(landing, /redirect\(/);
});

test("opponent player archive lifecycle (41 focused checks)", () => {
  const archiveSql = readFileSync(archiveMigrationPath, "utf8");
  const repository = readFileSync(
    fileURLToPath(new URL("./repository.ts", import.meta.url)),
    "utf8",
  );
  const actions = readFileSync(fileURLToPath(new URL("./actions.ts", import.meta.url)), "utf8");
  const auth = readFileSync(fileURLToPath(new URL("./scoutingAuth.ts", import.meta.url)), "utf8");
  const workspace = readFileSync(
    fileURLToPath(new URL("./components/ScoutingWorkspace.tsx", import.meta.url)),
    "utf8",
  );
  const playerCard = readFileSync(
    fileURLToPath(new URL("./components/ScoutingPlayerCard.tsx", import.meta.url)),
    "utf8",
  );
  const reportCards = readFileSync(
    fileURLToPath(new URL("./components/ScoutingReportCards.tsx", import.meta.url)),
    "utf8",
  );
  const migration56 = readFileSync(migrationPath, "utf8");
  const practicePage = readFileSync(
    fileURLToPath(new URL("../../app/team-operations/practice/page.tsx", import.meta.url)),
    "utf8",
  );
  const intraPage = readFileSync(
    fileURLToPath(new URL("../../app/team-operations/intra-squad/page.tsx", import.meta.url)),
    "utf8",
  );

  const a = samplePlayer({ id: "a", displayName: "Alpha", teamId: "t1" });
  const b = samplePlayer({ id: "b", displayName: "Bravo", teamId: "t1" });
  const c = samplePlayer({
    id: "c",
    displayName: "Charlie",
    teamId: "t1",
    archivedAt: "2026-09-01T12:00:00.000Z",
    archivedBy: "user-1",
    handedness: "Left",
  });
  const d = samplePlayer({ id: "d", displayName: "Delta", teamId: "t2", hasAiReport: true });
  const roster = [a, b, c, d];
  const reports = [
    sampleDirect({
      id: "r-a",
      opponentPlayerId: "a",
      strengthsWeaknesses: "heavy forehand",
      teamId: "t1",
    }),
    sampleDirect({
      id: "r-c",
      opponentPlayerId: "c",
      strengthsWeaknesses: "slice backhand archive-token",
      teamId: "t1",
    }),
  ];
  const aiBefore = {
    id: "ai-c",
    opponentPlayerId: "c",
    kind: "ai_generated" as const,
    body: "Preserved AI body",
    quickSummaryBullets: ["bullet"],
    status: "draft" as const,
    citedDirectReportIds: ["r-c"],
    stale: false,
    generatedAt: "2026-08-01T00:00:00.000Z",
    reviewedAt: null,
  };

  // ARCHIVING 1–10
  // 1 New/imported opponents default to active.
  assert.equal(isOpponentActive(a), true);
  assert.equal(
    mapPlayer({
      id: "new",
      team_id: "t1",
      display_name: "New",
      normalized_name: "new",
      handedness: null,
    }).archivedAt,
    null,
  );
  assert.match(archiveSql, /archived_at/);
  assert.match(archiveSql, /archived_by/);
  assert.doesNotMatch(migration56, /archived_at/);

  // 2–3 Authorized / unauthorized (server-side auth gate).
  assert.match(actions, /archiveOpponentPlayerAction/);
  assert.match(actions, /requireScoutingWriteUser/);
  assert.match(auth, /app_is_admin/);
  assert.match(auth, /getUser/);
  assert.match(actions, /if \(!auth\.ok\) return \{ success: false/);

  // 4–5 Timestamp + user
  assert.match(repository, /archived_at: now/);
  assert.match(repository, /archived_by: actorUserId/);

  // 6–9 Preserve opponent / reports / AI / team (no deletes)
  assert.match(repository, /Archive opponent player \(lifecycle only — no deletes/);
  assert.doesNotMatch(repository, /archiveOpponentPlayer[\s\S]{0,800}\.delete\(/);
  assert.equal(c.teamId, "t1");
  assert.equal(reports.find((row) => row.opponentPlayerId === "c")?.id, "r-c");
  assert.equal(aiBefore.body, "Preserved AI body");

  // 10 Idempotent archive path
  assert.match(repository, /alreadyArchived/);
  assert.match(repository, /if \(!alreadyArchived\)/);

  // ACTIVE VIEW 11–17
  const active = activeOpponentPlayers(roster);
  assert.equal(active.every(isOpponentActive), true);
  assert.equal(active.some((player) => player.id === "c"), false);
  assert.match(repository, /scope === "active"/);
  assert.match(repository, /query\.is\("archived_at", null\)/);
  assert.equal(
    filterPlayers(active, { query: "charlie", teamId: "", handedness: "", aiStatus: "" }).length,
    0,
  );
  assert.equal(active.filter((player) => player.teamId === "t1").length, 2);
  assert.equal(
    mapTeam(
      { id: "t1", display_name: "Kenyon", identity_slug: null },
      { playerCount: 2, archivedPlayerCount: 1, reportCount: 3 },
    ).playerCount,
    2,
  );
  assert.equal(selectNextActivePlayerId([a, b, c], "a"), "b");
  assert.equal(selectNextActivePlayerId([a, b], "b"), "a");
  assert.equal(selectNextActivePlayerId([a], "a"), "");
  assert.match(workspace, /selectNextActivePlayerId/);
  assert.match(workspace, /handlePlayerArchived/);
  assert.match(workspace, /No active opponents/);

  // ARCHIVED VIEW 18–25
  const archived = archivedOpponentPlayers(roster);
  assert.equal(archived.length, 1);
  assert.equal(archived[0]?.id, "c");
  assert.match(workspace, /Archived \(\$\{archivedCount\}\)/);
  assert.match(workspace, /data-scouting-lifecycle-toggle/);
  assert.match(workspace, /Opponent lifecycle/);
  assert.match(workspace, /firstTeamWithActivePlayers/);
  assert.match(workspace, /SCOUTING_SELECTION_KEY/);
  assert.match(workspace, /data-scouting-load-error/);
  assert.match(repository, /Failed to load opponent player counts/);
  assert.match(repository, /archived_at != null/);
  assert.equal(
    filterPlayers(archived, { query: "char", teamId: "", handedness: "", aiStatus: "" }).length,
    1,
  );
  assert.equal(
    filterPlayers(
      archived,
      { query: "archive-token", teamId: "", handedness: "", aiStatus: "" },
      { linkedReports: reports },
    ).length,
    1,
  );
  assert.equal(
    filterPlayers(archived, { query: "", teamId: "t1", handedness: "Left", aiStatus: "" }).length,
    1,
  );
  assert.equal(sortPlayers(archived, "displayName", "asc")[0]?.displayName, "Charlie");
  assert.match(workspace, /ScoutingPlayerCard/);
  assert.match(playerCard, /data-scouting-archived-status/);
  assert.equal(linkedDirectReportsForPlayer(reports, "c").length, 1);
  assert.match(workspace, /openScoutingPlayer/);
  assert.match(reportCards, /Archived Opponent/);

  // RESTORE 26–32
  assert.match(actions, /restoreOpponentPlayerAction/);
  assert.match(actions, /requireScoutingWriteUser/);
  assert.match(repository, /archived_at: null/);
  assert.match(repository, /archived_by: null/);
  assert.match(repository, /alreadyActive/);
  const restored = { ...c, archivedAt: null, archivedBy: null };
  assert.equal(isOpponentActive(restored), true);
  assert.equal(isOpponentArchived(restored), false);
  assert.equal(activeOpponentPlayers([a, b, restored, d]).some((player) => player.id === "c"), true);
  assert.equal(archivedOpponentPlayers([a, b, restored, d]).some((player) => player.id === "c"), false);
  assert.equal(aiBefore.opponentPlayerId, "c");
  assert.doesNotMatch(repository, /restoreOpponentPlayer[\s\S]{0,1200}\.insert\(/);

  // FORM LINKS 33–36
  assert.match(repository, /opponent_player_id", opponentPlayerId/);
  assert.match(repository, /deactivatedFormLinkCount/);
  assert.match(repository, /\.is\("revoked_at", null\)/);
  assert.doesNotMatch(repository, /scouting_form_submissions"\)\.delete/);
  assert.match(repository, /Archived opponents cannot be selected for new form links/);
  assert.match(workspace, /players=\{activePlayers\}/);
  assert.match(repository, /Does not reactivate form links/);

  // AI preservation + restore-before-generate
  assert.equal(canGeneratePlayerAi(c), false);
  assert.equal(canGeneratePlayerAi(a), true);
  assert.match(repository, /Restore this opponent before generating a new AI summary/);
  assert.match(playerCard, /Restore this opponent to generate/);

  // REGRESSION 37–41
  assert.match(workspace, /Open player card/);
  assert.equal((workspace.match(/Open player card/g) ?? []).length >= 1, true);
  assert.match(workspace, /data-scouting-desktop-columns/);
  assert.match(workspace, /onOpenLinkedPlayer/);
  assert.match(migration56, /ON CONFLICT DO NOTHING/);
  assert.doesNotMatch(practicePage, /archiveOpponentPlayer/);
  assert.doesNotMatch(intraPage, /archiveOpponentPlayer/);
  assert.match(playerCard, /data-scouting-archive-confirm/);
  assert.match(playerCard, /Archive Opponent/);
  assert.match(playerCard, /Restore Opponent/);
  assert.doesNotMatch(playerCard, /window\.alert|confirm\(/);

  // Linked-report search helper
  assert.equal(playerMatchesLinkedReportQuery("c", "slice", reports), true);
  assert.equal(playerMatchesLinkedReportQuery("a", "missing-term", reports), false);

  // Form link type still carries revokedAt for history
  const link: ScoutingFormLink = {
    id: "l1",
    label: "Post-match",
    teamId: "t1",
    opponentPlayerId: "c",
    expiresAt: null,
    revokedAt: "2026-09-01T12:00:00.000Z",
    createdAt: "2026-08-01T00:00:00.000Z",
  };
  assert.ok(link.revokedAt);
});
