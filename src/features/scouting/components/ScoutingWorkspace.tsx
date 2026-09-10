"use client";

import { ArrowLeft, Link2, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";

import EmptyState from "@/components/EmptyState";
import ModulePageShell from "@/components/ModulePageShell";
import ModuleSectionTabs from "@/components/ModuleSectionTabs";
import SearchInput from "@/components/SearchInput";
import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import { DrawerField, useDrawerManager } from "@/components/workspace-drawer";
import { formatDate } from "@/lib/formatting";
import { TEAM_OPERATIONS_ROUTE, TEAM_OPERATIONS_SCOUTING_ROUTE } from "@/lib/module-routes";

import {
  createFormLinkAction,
  loadTeamWorkspaceAction,
  regenerateTeamAiAction,
  revokeFormLinkAction,
  saveDirectReportAction,
  saveManualTeamReportAction,
  updateSubmissionStatusAction,
} from "../actions";
import {
  filterMatchReports,
  filterPlayers,
  filterSubmissions,
  filterTeams,
  sortMatchReports,
  sortPlayers,
  sortSubmissions,
  sortTeams,
} from "../filtering";
import {
  activeOpponentPlayers,
  archivedOpponentPlayers,
  isOpponentArchived,
  selectNextActivePlayerId,
} from "../playerLifecycle";
import {
  resolveScoutingTeamIdentity,
  scoutingTeamCanonicalLabel,
} from "../teamIdentity";
import type {
  MatchReportSortKey,
  OpponentPlayerLifecycleView,
  ScoutingDirectReport,
  ScoutingFilters,
  ScoutingFormLink,
  ScoutingFormSubmission,
  ScoutingOpponentPlayer,
  ScoutingSortDirection,
  ScoutingTeam,
  ScoutingTeamReport,
  ScoutingView,
  SubmissionSortKey,
  TeamSortKey,
} from "../types";
import ScoutingPlayerCard, {
  type ScoutingPlayerWorkspaceId,
} from "./ScoutingPlayerCard";
import {
  ScoutingDirectReportCard,
  ScoutingDirectReportPreviewCard,
  ScoutingSubmissionCard,
  ScoutingSubmissionPreviewCard,
  ScoutingTeamMark,
  ScoutingTeamReportCard,
} from "./ScoutingReportCards";

const EMPTY_FILTERS: ScoutingFilters = {
  query: "",
  teamId: "",
  handedness: "",
  aiStatus: "",
  importStatus: "",
  submissionStatus: "",
};

const SCOUTING_VIEW_TABS: { id: ScoutingView; label: string }[] = [
  { id: "opponentPlayers", label: "Opponent Players" },
  { id: "teams", label: "Teams" },
  { id: "matchReports", label: "Match Reports" },
  { id: "formSubmissions", label: "Form Submissions" },
];

const SCOUTING_SELECTION_KEY = "scouting-directory-selection-v1";

type MobilePane = "teams" | "players" | "report";

type SavedDirectorySelection = {
  teamId: string;
  playerId: string;
  playerLifecycle: OpponentPlayerLifecycleView;
};

type DirectoryOrigin = {
  view: ScoutingView;
  filters: ScoutingFilters;
  selectedTeamId: string;
  selectedPlayerId: string;
  mobilePane: MobilePane;
  playerLifecycle: OpponentPlayerLifecycleView;
};

type CardSurface =
  | { kind: "directory" }
  | {
      kind: "player";
      playerId: string;
      workspace: ScoutingPlayerWorkspaceId;
      origin: DirectoryOrigin;
      returnReportId?: string;
      returnTeamReport?: { teamId: string; teamReportId: string };
    }
  | {
      kind: "report";
      reportId: string;
      origin: DirectoryOrigin;
      returnPlayerId?: string;
      returnWorkspace?: ScoutingPlayerWorkspaceId;
    }
  | { kind: "submission"; submissionId: string; origin: DirectoryOrigin }
  | { kind: "teamReport"; teamReportId: string; teamId: string; origin: DirectoryOrigin };

type Props = {
  teams: ScoutingTeam[];
  players: ScoutingOpponentPlayer[];
  reports: ScoutingDirectReport[];
  submissions: ScoutingFormSubmission[];
  formLinks: ScoutingFormLink[];
  loadError: string | null;
};

export default function ScoutingWorkspace({
  teams,
  players,
  reports,
  submissions,
  formLinks,
  loadError,
}: Props) {
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [view, setView] = useState<ScoutingView>("opponentPlayers");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [mobilePane, setMobilePane] = useState<MobilePane>("teams");
  const [playerLifecycle, setPlayerLifecycle] = useState<OpponentPlayerLifecycleView>("active");
  const [surface, setSurface] = useState<CardSurface>({ kind: "directory" });
  const [teamSort, setTeamSort] = useState<{ key: TeamSortKey; direction: ScoutingSortDirection }>({
    key: "displayName",
    direction: "asc",
  });
  const [reportSort, setReportSort] = useState<{ key: MatchReportSortKey; direction: ScoutingSortDirection }>({
    key: "matchDate",
    direction: "desc",
  });
  const [submissionSort, setSubmissionSort] = useState<{
    key: SubmissionSortKey;
    direction: ScoutingSortDirection;
  }>({ key: "createdAt", direction: "desc" });
  const [selectionHydrated, setSelectionHydrated] = useState(false);
  const [savedSelection] = useState<SavedDirectorySelection | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(SCOUTING_SELECTION_KEY);
      return raw ? (JSON.parse(raw) as SavedDirectorySelection) : null;
    } catch {
      return null;
    }
  });

  const teamsAlpha = useMemo(() => sortTeams(teams, "displayName", "asc"), [teams]);
  const activePlayers = useMemo(() => activeOpponentPlayers(players), [players]);
  const archivedPlayers = useMemo(() => archivedOpponentPlayers(players), [players]);
  const archivedCount = archivedPlayers.length;
  const lifecyclePool = playerLifecycle === "active" ? activePlayers : archivedPlayers;

  const firstTeamWithActivePlayers = useMemo(() => {
    for (const team of teamsAlpha) {
      if (activePlayers.some((player) => player.teamId === team.id)) return team.id;
    }
    return teamsAlpha[0]?.id ?? "";
  }, [activePlayers, teamsAlpha]);

  const playerRows = useMemo(
    () =>
      sortPlayers(
        filterPlayers(lifecyclePool, filters, {
          linkedReports: playerLifecycle === "archived" ? reports : undefined,
        }),
        "displayName",
        "asc",
      ),
    [filters, lifecyclePool, playerLifecycle, reports],
  );
  const teamRows = useMemo(
    () => sortTeams(filterTeams(teams, filters.query), teamSort.key, teamSort.direction),
    [filters.query, teamSort, teams],
  );
  const reportRows = useMemo(
    () => sortMatchReports(filterMatchReports(reports, filters), reportSort.key, reportSort.direction),
    [filters, reportSort, reports],
  );
  const submissionRows = useMemo(
    () =>
      sortSubmissions(filterSubmissions(submissions, filters), submissionSort.key, submissionSort.direction),
    [filters, submissionSort, submissions],
  );

  /** Left nav: teams that have players in the current Active/Archived pool. */
  const navTeams = useMemo(() => {
    return teamsAlpha.filter((team) => lifecyclePool.some((player) => player.teamId === team.id));
  }, [lifecyclePool, teamsAlpha]);

  /** One-shot directory selection hydrate (adjust state during render — not an effect). */
  if (!selectionHydrated && !loadError && (teams.length > 0 || players.length > 0)) {
    const lifecycle: OpponentPlayerLifecycleView =
      savedSelection?.playerLifecycle === "archived" ? "archived" : "active";
    const pool = lifecycle === "active" ? activePlayers : archivedPlayers;
    const savedTeamOk =
      Boolean(savedSelection?.teamId) && teams.some((team) => team.id === savedSelection?.teamId);
    const savedPlayerOk =
      Boolean(savedSelection?.playerId) &&
      pool.some(
        (player) =>
          player.id === savedSelection?.playerId && player.teamId === savedSelection?.teamId,
      );

    setSelectionHydrated(true);
    if (savedTeamOk && savedSelection) {
      setPlayerLifecycle(lifecycle);
      setSelectedTeamId(savedSelection.teamId);
      setFilters((current) => ({ ...current, teamId: savedSelection.teamId }));
      if (savedPlayerOk && savedSelection.playerId) {
        setSelectedPlayerId(savedSelection.playerId);
      } else {
        const first = pool
          .filter((player) => player.teamId === savedSelection.teamId)
          .sort((a, b) => a.displayName.localeCompare(b.displayName))[0];
        setSelectedPlayerId(first?.id ?? "");
      }
    } else if (firstTeamWithActivePlayers) {
      const firstPlayer = activePlayers
        .filter((player) => player.teamId === firstTeamWithActivePlayers)
        .sort((a, b) => a.displayName.localeCompare(b.displayName))[0];
      setPlayerLifecycle("active");
      setSelectedTeamId(firstTeamWithActivePlayers);
      setFilters((current) => ({ ...current, teamId: firstTeamWithActivePlayers }));
      setSelectedPlayerId(firstPlayer?.id ?? "");
    }
  } else if (!selectionHydrated && (loadError || (teams.length === 0 && players.length === 0))) {
    setSelectionHydrated(true);
  }

  const focusTeamId = useMemo(() => {
    if (filters.teamId && navTeams.some((team) => team.id === filters.teamId)) return filters.teamId;
    if (selectedTeamId && navTeams.some((team) => team.id === selectedTeamId)) return selectedTeamId;
    if (filters.teamId && teams.some((team) => team.id === filters.teamId)) return filters.teamId;
    if (selectedTeamId && teams.some((team) => team.id === selectedTeamId)) return selectedTeamId;
    return (
      navTeams.find((team) => playerRows.some((player) => player.teamId === team.id))?.id ||
      navTeams[0]?.id ||
      firstTeamWithActivePlayers ||
      ""
    );
  }, [
    filters.teamId,
    firstTeamWithActivePlayers,
    navTeams,
    playerRows,
    selectedTeamId,
    teams,
  ]);

  const rosterPlayers = useMemo(() => {
    return focusTeamId ? playerRows.filter((player) => player.teamId === focusTeamId) : playerRows;
  }, [focusTeamId, playerRows]);

  const effectivePlayerId = rosterPlayers.some((player) => player.id === selectedPlayerId)
    ? selectedPlayerId
    : (rosterPlayers[0]?.id ?? "");
  const selectedPlayer = rosterPlayers.find((player) => player.id === effectivePlayerId) ?? null;
  const selectedTeam = teams.find((team) => team.id === focusTeamId) ?? null;

  useEffect(() => {
    if (!selectionHydrated || !focusTeamId) return;
    try {
      sessionStorage.setItem(
        SCOUTING_SELECTION_KEY,
        JSON.stringify({
          teamId: focusTeamId,
          playerId: effectivePlayerId,
          playerLifecycle,
        } satisfies SavedDirectorySelection),
      );
    } catch {
      /* ignore quota / private mode */
    }
  }, [effectivePlayerId, focusTeamId, playerLifecycle, selectionHydrated]);

  const archivedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const player of archivedPlayers) ids.add(player.id);
    return ids;
  }, [archivedPlayers]);

  function captureOrigin(): DirectoryOrigin {
    return {
      view,
      filters,
      selectedTeamId,
      selectedPlayerId,
      mobilePane,
      playerLifecycle,
    };
  }

  function restoreOrigin(origin: DirectoryOrigin) {
    setView(origin.view);
    setFilters(origin.filters);
    setSelectedTeamId(origin.selectedTeamId);
    setSelectedPlayerId(origin.selectedPlayerId);
    setMobilePane(origin.mobilePane);
    setPlayerLifecycle(origin.playerLifecycle ?? "active");
    setSurface({ kind: "directory" });
  }

  /** Canonical open — Teams and Opponent Players share this path. */
  function openScoutingPlayer(
    playerId: string,
    options?: {
      workspace?: ScoutingPlayerWorkspaceId;
      origin?: DirectoryOrigin;
      returnReportId?: string;
      returnTeamReport?: { teamId: string; teamReportId: string };
    },
  ) {
    const player = players.find((row) => row.id === playerId);
    if (!player) return;
    const origin = options?.origin ?? captureOrigin();
    setSelectedPlayerId(playerId);
    setSelectedTeamId(player.teamId);
    setFilters((current) => ({ ...current, teamId: player.teamId }));
    setView("opponentPlayers");
    setMobilePane("report");
    setSurface({
      kind: "player",
      playerId,
      workspace: options?.workspace ?? "overview",
      origin,
      returnReportId: options?.returnReportId,
      returnTeamReport: options?.returnTeamReport,
    });
  }

  function openScoutingReport(
    reportId: string,
    options?: {
      origin?: DirectoryOrigin;
      returnPlayerId?: string;
      returnWorkspace?: ScoutingPlayerWorkspaceId;
    },
  ) {
    setSurface({
      kind: "report",
      reportId,
      origin: options?.origin ?? captureOrigin(),
      returnPlayerId: options?.returnPlayerId,
      returnWorkspace: options?.returnWorkspace,
    });
  }

  function openSubmissionCard(submissionId: string) {
    setSurface({
      kind: "submission",
      submissionId,
      origin: captureOrigin(),
    });
  }

  function openTeamReportCard(teamId: string, teamReportId: string) {
    setSurface({
      kind: "teamReport",
      teamId,
      teamReportId,
      origin: captureOrigin(),
    });
  }

  function goBackFromCard() {
    if (surface.kind === "report" && surface.returnPlayerId) {
      openScoutingPlayer(surface.returnPlayerId, {
        workspace: surface.returnWorkspace ?? "matchReports",
        origin: surface.origin,
      });
      return;
    }
    if (surface.kind === "player" && surface.returnReportId) {
      openScoutingReport(surface.returnReportId, { origin: surface.origin });
      return;
    }
    if (surface.kind === "player" && surface.returnTeamReport) {
      setSurface({
        kind: "teamReport",
        teamId: surface.returnTeamReport.teamId,
        teamReportId: surface.returnTeamReport.teamReportId,
        origin: surface.origin,
      });
      return;
    }
    if (surface.kind !== "directory") {
      restoreOrigin(surface.origin);
    }
  }

  function selectTeam(teamId: string) {
    setSelectedTeamId(teamId);
    setFilters((current) => ({ ...current, teamId }));
    setMobilePane("players");
    const pool = playerLifecycle === "active" ? activePlayers : archivedPlayers;
    const first = pool
      .filter((player) => player.teamId === teamId)
      .sort((a, b) => a.displayName.localeCompare(b.displayName))[0];
    setSelectedPlayerId(first?.id ?? "");
  }

  /** Middle-column / roster select — stay on main page; do not open Player Card. */
  function selectPlayer(player: ScoutingOpponentPlayer) {
    setSelectedPlayerId(player.id);
    setSelectedTeamId(player.teamId);
    setFilters((current) => ({ ...current, teamId: player.teamId }));
    setMobilePane("report");
    setSurface({ kind: "directory" });
  }

  function openPlayerCardFromDirectory(player: ScoutingOpponentPlayer) {
    openScoutingPlayer(player.id);
  }

  function handlePlayerArchived(playerId: string) {
    const teamId =
      players.find((player) => player.id === playerId)?.teamId || focusTeamId || selectedTeamId;
    const priorRoster = sortPlayers(
      filterPlayers(
        activePlayers.filter((player) => player.teamId === teamId),
        { ...filters, teamId },
      ),
      "displayName",
      "asc",
    );
    const nextId = selectNextActivePlayerId(priorRoster, playerId);
    setPlayerLifecycle("active");
    setView("opponentPlayers");
    setSelectedTeamId(teamId);
    setFilters((current) => ({ ...current, teamId }));
    setSelectedPlayerId(nextId);
    setMobilePane(nextId ? "players" : "players");
    setSurface({ kind: "directory" });
  }

  function handlePlayerRestored(playerId: string) {
    const player = players.find((row) => row.id === playerId);
    setPlayerLifecycle("active");
    setView("opponentPlayers");
    if (player) {
      setSelectedTeamId(player.teamId);
      setFilters((current) => ({ ...current, teamId: player.teamId }));
      setSelectedPlayerId(playerId);
    }
    setSurface({
      kind: "player",
      playerId,
      workspace: "overview",
      origin: {
        view: "opponentPlayers",
        filters: { ...filters, teamId: player?.teamId ?? filters.teamId },
        selectedTeamId: player?.teamId ?? selectedTeamId,
        selectedPlayerId: playerId,
        mobilePane: "report",
        playerLifecycle: "active",
      },
    });
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function openTeamEdit(team: ScoutingTeam) {
    openDrawer({
      id: `scouting-team-${team.id}`,
      title: scoutingTeamCanonicalLabel(team.displayName),
      subtitle: "Team scouting",
      hideFooter: true,
      content: (
        <TeamWorkspaceDrawer
          team={team}
          players={activePlayers.filter((player) => player.teamId === team.id)}
          reports={reports.filter((report) => report.teamId === team.id)}
          onOpenPlayer={(playerId) => {
            closeDrawer();
            openScoutingPlayer(playerId);
          }}
          onOpenReport={(reportId) => {
            closeDrawer();
            openScoutingReport(reportId);
          }}
          onOpenTeamReport={(teamReportId) => {
            closeDrawer();
            openTeamReportCard(team.id, teamReportId);
          }}
          onClose={closeDrawer}
        />
      ),
    });
  }

  function openAddReport() {
    openDrawer({
      id: "scouting-report-new",
      title: "Add Match Report",
      subtitle: "Team Operations · Scouting",
      hideFooter: true,
      content: (
        <DirectReportForm
          teams={teams}
          players={activePlayers}
          archivedPlayers={archivedPlayers}
          onCancel={closeDrawer}
        />
      ),
    });
  }

  function openFormLinks() {
    openDrawer({
      id: "scouting-form-links",
      title: "Shareable Form Links",
      subtitle: "Tokenized post-match form",
      hideFooter: true,
      content: (
        <FormLinksPanel teams={teams} players={activePlayers} links={formLinks} onClose={closeDrawer} />
      ),
    });
  }

  const filtersActive =
    Boolean(filters.query) ||
    Boolean(filters.teamId) ||
    Boolean(filters.handedness) ||
    Boolean(filters.aiStatus) ||
    Boolean(filters.importStatus) ||
    Boolean(filters.submissionStatus);

  const activePlayer =
    surface.kind === "player" ? players.find((player) => player.id === surface.playerId) ?? null : null;
  const activeReport =
    surface.kind === "report" ? reports.find((report) => report.id === surface.reportId) ?? null : null;
  const activeSubmission =
    surface.kind === "submission"
      ? submissions.find((row) => row.id === surface.submissionId) ?? null
      : null;

  return (
    <ModulePageShell
      title="Scouting"
      subtitle="Opponent players, team dossiers, match reports, and form submissions."
      actions={
        surface.kind === "directory" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openFormLinks}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-primary shadow-sm"
            >
              <Link2 className="h-4 w-4" />
              Form Links
            </button>
            <button
              type="button"
              onClick={openAddReport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-[var(--module-accent)] px-4 text-sm font-semibold text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Report
            </button>
          </div>
        ) : null
      }
    >
      <nav className="text-xs text-text-secondary" aria-label="Breadcrumb">
        <Link href={TEAM_OPERATIONS_ROUTE} className="hover:text-text-primary">
          Team Operations
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-text-primary">Scouting</span>
      </nav>

      {loadError ? (
        <div className="mt-4 rounded-control border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {loadError} Apply migration <code className="font-mono text-xs">0056_team_operations_scouting.sql</code>{" "}
          (and <code className="font-mono text-xs">0057</code>–<code className="font-mono text-xs">0059</code> if
          needed).
        </div>
      ) : null}

      {surface.kind !== "directory" ? (
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={goBackFromCard}
            data-scouting-back=""
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--module-accent-text)] hover:underline md:min-h-0"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to{" "}
            {surface.kind === "report" && surface.returnPlayerId
              ? "Player"
              : surface.kind === "player" && surface.returnTeamReport
                ? "Team Report"
                : surface.origin.view === "teams"
                  ? "Teams"
                  : surface.origin.view === "matchReports"
                    ? "Match Reports"
                    : surface.origin.view === "formSubmissions"
                      ? "Form Submissions"
                      : surface.origin.playerLifecycle === "archived"
                        ? "Archived Opponents"
                        : "Opponent Players"}
          </button>

          {surface.kind === "player" && activePlayer ? (
            <ScoutingPlayerCard
              key={`${activePlayer.id}:${surface.workspace}:${surface.returnReportId ?? ""}`}
              player={activePlayer}
              reports={reports}
              initialWorkspace={surface.workspace}
              onOpenReport={(report) =>
                openScoutingReport(report.id, {
                  origin: surface.origin,
                  returnPlayerId: activePlayer.id,
                  returnWorkspace: "matchReports",
                })
              }
              onArchived={handlePlayerArchived}
              onRestored={handlePlayerRestored}
            />
          ) : null}

          {surface.kind === "report" && activeReport ? (
            <ScoutingDirectReportCard
              report={activeReport}
              opponentArchived={
                activeReport.opponentPlayerId
                  ? archivedPlayerIds.has(activeReport.opponentPlayerId)
                  : false
              }
              onOpenLinkedPlayer={(playerId) =>
                openScoutingPlayer(playerId, {
                  origin: surface.origin,
                  returnReportId: activeReport.id,
                })
              }
            />
          ) : null}

          {surface.kind === "submission" && activeSubmission ? (
            <SubmissionCardSurface
              submission={activeSubmission}
              onStatusChange={() => {
                /* status select triggers revalidate via action */
              }}
            />
          ) : null}

          {surface.kind === "teamReport" ? (
            <TeamReportSurface
              teamId={surface.teamId}
              teamReportId={surface.teamReportId}
              teams={teams}
              reports={reports}
              onOpenReport={(reportId) => openScoutingReport(reportId, { origin: surface.origin })}
              onOpenPlayer={(playerId) =>
                openScoutingPlayer(playerId, {
                  origin: surface.origin,
                  returnTeamReport: {
                    teamId: surface.teamId,
                    teamReportId: surface.teamReportId,
                  },
                })
              }
            />
          ) : null}
        </div>
      ) : (
        <section className="mt-4 overflow-hidden rounded-card border border-border bg-surface shadow-sm">
          <div
            data-scouting-filter-bar=""
            className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:px-5"
          >
            <ModuleSectionTabs
              aria-label="Scouting sections"
              tabs={SCOUTING_VIEW_TABS}
              activeId={view}
              onChange={setView}
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[12rem] flex-1">
                <SearchInput
                  value={filters.query}
                  onChange={(query) => setFilters((current) => ({ ...current, query }))}
                  placeholder="Search scouting…"
                />
              </div>
              {view === "opponentPlayers" ? (
                <div data-scouting-lifecycle-toggle="">
                  <CompactSelect
                    ariaLabel="Opponent lifecycle"
                    value={playerLifecycle}
                    options={[
                      { value: "active", label: "Active" },
                      { value: "archived", label: `Archived (${archivedCount})` },
                    ]}
                    onChange={(value) => {
                      const next = value === "archived" ? "archived" : "active";
                      setPlayerLifecycle(next);
                      const pool = next === "active" ? activePlayers : archivedPlayers;
                      const teamId = filters.teamId || selectedTeamId || firstTeamWithActivePlayers;
                      const first = pool
                        .filter((player) => (teamId ? player.teamId === teamId : true))
                        .sort((a, b) => a.displayName.localeCompare(b.displayName))[0];
                      setSelectedPlayerId(first?.id ?? "");
                    }}
                  />
                </div>
              ) : null}
              {view === "opponentPlayers" || view === "matchReports" ? (
                <CompactSelect
                  ariaLabel="Team filter"
                  value={filters.teamId}
                  allLabel="All teams"
                  options={teamsAlpha.map((team) => ({
                    value: team.id,
                    label: scoutingTeamCanonicalLabel(team.displayName),
                  }))}
                  onChange={(teamId) => {
                    setFilters((current) => ({ ...current, teamId }));
                    if (teamId) setSelectedTeamId(teamId);
                  }}
                />
              ) : null}
              {view === "opponentPlayers" ? (
                <>
                  <CompactSelect
                    ariaLabel="Handedness"
                    value={filters.handedness}
                    allLabel="All hands"
                    options={[
                      { value: "Right", label: "Right" },
                      { value: "Left", label: "Left" },
                      { value: "none", label: "Unknown" },
                    ]}
                    onChange={(handedness) => setFilters((current) => ({ ...current, handedness }))}
                  />
                  <CompactSelect
                    ariaLabel="AI status"
                    value={filters.aiStatus}
                    allLabel="All AI"
                    options={[
                      { value: "ready", label: "AI ready" },
                      { value: "stale", label: "AI stale" },
                      { value: "none", label: "No AI" },
                    ]}
                    onChange={(aiStatus) => setFilters((current) => ({ ...current, aiStatus }))}
                  />
                </>
              ) : null}
              {view === "matchReports" ? (
                <CompactSelect
                  ariaLabel="Import status"
                  value={filters.importStatus}
                  allLabel="All statuses"
                  options={[
                    { value: "imported", label: "Imported" },
                    { value: "compound_unresolved", label: "Compound" },
                    { value: "unresolved_review", label: "Unresolved" },
                    { value: "team_level", label: "Team level" },
                  ]}
                  onChange={(importStatus) => setFilters((current) => ({ ...current, importStatus }))}
                />
              ) : null}
              {view === "formSubmissions" ? (
                <CompactSelect
                  ariaLabel="Submission status"
                  value={filters.submissionStatus}
                  allLabel="All statuses"
                  options={[
                    { value: "new", label: "New" },
                    { value: "reviewed", label: "Reviewed" },
                    { value: "needs_clarification", label: "Needs Clarification" },
                    { value: "archived", label: "Archived" },
                  ]}
                  onChange={(submissionStatus) => setFilters((current) => ({ ...current, submissionStatus }))}
                />
              ) : null}
              {filtersActive ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-9 rounded-control px-2 text-xs font-semibold text-[var(--module-accent-text)] hover:underline"
                >
                  Clear
                </button>
              ) : null}
              <span className="text-xs text-text-secondary tabular-nums" aria-live="polite">
                {view === "opponentPlayers"
                  ? filtersActive
                    ? `${playerRows.length} filtered player${playerRows.length === 1 ? "" : "s"}`
                    : `${playerRows.length} player${playerRows.length === 1 ? "" : "s"}`
                  : view === "teams"
                    ? `${teamRows.length} teams`
                    : view === "matchReports"
                      ? `${reportRows.length} reports`
                      : `${submissionRows.length} submissions`}
              </span>
            </div>
          </div>

          {loadError ? (
            <div className="p-5" data-scouting-load-error="">
              <EmptyState
                title="Could not load scouting data"
                description={loadError}
              />
            </div>
          ) : null}

          {/* Shell always mounts for Opponent Players — data/error must not remove columns. */}
          {view === "opponentPlayers" ? (
            <OpponentPlayersMasterDetail
              teams={navTeams.length ? navTeams : teamsAlpha}
              allPlayers={players}
              rosterPlayers={rosterPlayers}
              filteredPlayerCount={playerRows.length}
              reports={reports}
              selectedTeam={selectedTeam}
              selectedPlayer={selectedPlayer}
              mobilePane={mobilePane}
              playerLifecycle={playerLifecycle}
              filtersActive={filtersActive}
              onMobilePane={setMobilePane}
              onSelectTeam={selectTeam}
              onSelectPlayer={selectPlayer}
              onOpenPlayerCard={openPlayerCardFromDirectory}
              onOpenReport={(report) => openScoutingReport(report.id)}
              onShowArchived={() => setPlayerLifecycle("archived")}
              onClearFilters={clearFilters}
            />
          ) : null}
          {!loadError && view === "teams" ? (
            <TeamsView
              rows={teamRows}
              players={activePlayers}
              reports={reports}
              sort={teamSort}
              onSort={(key) =>
                setTeamSort((current) => ({
                  key,
                  direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
                }))
              }
              onOpenEdit={openTeamEdit}
              onOpenPlayer={openScoutingPlayer}
              onOpenReport={(reportId) => openScoutingReport(reportId)}
            />
          ) : null}
          {!loadError && view === "matchReports" ? (
            <ReportsCardGrid
              rows={reportRows}
              sort={reportSort}
              onSort={(key) =>
                setReportSort((current) => ({
                  key,
                  direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
                }))
              }
              onOpen={(report) => openScoutingReport(report.id)}
            />
          ) : null}
          {!loadError && view === "formSubmissions" ? (
            <SubmissionsCardGrid
              rows={submissionRows}
              sort={submissionSort}
              onSort={(key) =>
                setSubmissionSort((current) => ({
                  key,
                  direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
                }))
              }
              onOpen={(submission) => openSubmissionCard(submission.id)}
            />
          ) : null}
        </section>
      )}
      <p className="sr-only">{TEAM_OPERATIONS_SCOUTING_ROUTE}</p>
    </ModulePageShell>
  );
}

function OpponentPlayersMasterDetail({
  teams,
  allPlayers,
  rosterPlayers,
  filteredPlayerCount,
  reports,
  selectedTeam,
  selectedPlayer,
  mobilePane,
  playerLifecycle,
  filtersActive,
  onMobilePane,
  onSelectTeam,
  onSelectPlayer,
  onOpenPlayerCard,
  onOpenReport,
  onShowArchived,
  onClearFilters,
}: {
  teams: ScoutingTeam[];
  allPlayers: ScoutingOpponentPlayer[];
  rosterPlayers: ScoutingOpponentPlayer[];
  filteredPlayerCount: number;
  reports: ScoutingDirectReport[];
  selectedTeam: ScoutingTeam | null;
  selectedPlayer: ScoutingOpponentPlayer | null;
  mobilePane: MobilePane;
  playerLifecycle: OpponentPlayerLifecycleView;
  filtersActive: boolean;
  onMobilePane: (pane: MobilePane) => void;
  onSelectTeam: (teamId: string) => void;
  onSelectPlayer: (player: ScoutingOpponentPlayer) => void;
  onOpenPlayerCard: (player: ScoutingOpponentPlayer) => void;
  onOpenReport: (report: ScoutingDirectReport) => void;
  onShowArchived: () => void;
  onClearFilters: () => void;
}) {
  const teamId = selectedTeam?.id ?? "";
  const playerId = selectedPlayer?.id ?? "";
  const teamArchivedCount = selectedTeam
    ? allPlayers.filter((player) => player.teamId === selectedTeam.id && isOpponentArchived(player))
        .length
    : 0;
  const teamActiveCount = selectedTeam
    ? allPlayers.filter((player) => player.teamId === selectedTeam.id && !isOpponentArchived(player))
        .length
    : 0;
  const linkedReportsForSelected = selectedPlayer
    ? reports.filter((report) => report.opponentPlayerId === selectedPlayer.id)
    : [];
  const rosterHeader =
    selectedTeam != null
      ? `${scoutingTeamCanonicalLabel(selectedTeam.displayName)} · ${rosterPlayers.length} player${
          rosterPlayers.length === 1 ? "" : "s"
        }`
      : `Players · ${rosterPlayers.length}`;

  const emptyRosterTitle =
    playerLifecycle === "archived" ? "No archived opponents" : "No players";
  const emptyRosterDescription =
    playerLifecycle === "archived"
      ? "Archived opponents for this team will appear here."
      : filtersActive
        ? "No active opponents match the current filters. Clear filters or choose another team."
        : teamArchivedCount > 0 && teamActiveCount === 0
          ? "No active opponents on this team. View archived opponents or choose another team."
          : "Select another team or clear filters.";
  const emptyRosterAction =
    playerLifecycle === "active" && teamArchivedCount > 0 && teamActiveCount === 0 && !filtersActive ? (
      <button
        type="button"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[var(--module-accent-text)] hover:underline"
        onClick={onShowArchived}
      >
        View archived ({teamArchivedCount})
      </button>
    ) : playerLifecycle === "active" && filtersActive ? (
      <button
        type="button"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[var(--module-accent-text)] hover:underline"
        onClick={onClearFilters}
      >
        Clear filters
      </button>
    ) : null;

  /**
   * Desktop columns must default to `grid` + `max-md:hidden`.
   * Do NOT use the hidden-then-md-grid anti-pattern — if the md display utility
   * is not generated, the pane stays display:none on desktop while the toolbar
   * count still shows filtered players.
   */
  return (
    <div data-scouting-master-detail="" className="min-h-[28rem]">
      <div className="md:hidden" data-scouting-mobile-progressive="">
        {mobilePane === "teams" ? (
          <TeamNavigator
            teams={teams}
            players={allPlayers}
            selectedTeamId={teamId}
            onSelect={onSelectTeam}
          />
        ) : null}
        {mobilePane === "players" || mobilePane === "report" ? (
          <div>
            <MobileBack label="Teams" onClick={() => onMobilePane("teams")} />
            <PlayerRoster
              players={rosterPlayers}
              reports={reports}
              selectedPlayerId={playerId}
              headerLabel={rosterHeader}
              emptyTitle={emptyRosterTitle}
              emptyDescription={emptyRosterDescription}
              emptyAction={emptyRosterAction}
              onSelect={onSelectPlayer}
            />
            {mobilePane === "report" && selectedPlayer ? (
              <div className="border-t border-border p-4">
                <button
                  type="button"
                  onClick={() => onOpenPlayerCard(selectedPlayer)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-control bg-[var(--module-accent)] px-4 text-sm font-semibold text-white"
                >
                  Open player card
                </button>
                <ul className="mt-4 space-y-2">
                  {linkedReportsForSelected.length ? (
                    linkedReportsForSelected.map((report) => (
                      <li key={report.id}>
                        <ScoutingDirectReportPreviewCard report={report} onOpen={onOpenReport} />
                      </li>
                    ))
                  ) : (
                    <li>
                      <EmptyState
                        title="No linked reports"
                        description="This opponent has no direct match reports yet."
                      />
                    </li>
                  )}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        data-scouting-tablet-layout=""
        data-scouting-desktop-columns=""
        className="grid min-h-[min(70vh,40rem)] grid-cols-[minmax(14.5rem,16.5rem)_minmax(17.5rem,21rem)_minmax(0,1fr)] max-md:hidden"
      >
        <div
          data-scouting-team-column=""
          className="min-h-0 overflow-y-auto border-r border-border"
        >
          <TeamNavigator
            teams={teams}
            players={allPlayers}
            selectedTeamId={teamId}
            onSelect={onSelectTeam}
          />
        </div>
        <div
          data-scouting-player-column=""
          className="min-h-0 overflow-y-auto border-r border-border"
        >
          <PlayerRoster
            players={rosterPlayers}
            reports={reports}
            selectedPlayerId={playerId}
            headerLabel={rosterHeader}
            emptyTitle={emptyRosterTitle}
            emptyDescription={emptyRosterDescription}
            emptyAction={emptyRosterAction}
            onSelect={onSelectPlayer}
          />
        </div>
        <div data-scouting-report-column="" className="min-h-0 overflow-y-auto">
          {selectedPlayer ? (
            <div className="p-4 sm:p-5" data-scouting-player-workspace="">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{selectedPlayer.displayName}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {scoutingTeamCanonicalLabel(selectedPlayer.teamDisplayName)}
                    {selectedPlayer.handedness ? ` · ${selectedPlayer.handedness}` : ""}
                    {` · ${linkedReportsForSelected.length} report${linkedReportsForSelected.length === 1 ? "" : "s"}`}
                  </p>
                  {filtersActive ? (
                    <p className="mt-1 text-[11px] text-text-secondary">
                      {filteredPlayerCount} filtered across all teams · {rosterPlayers.length} on this
                      team
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenPlayerCard(selectedPlayer)}
                  className="inline-flex h-11 items-center rounded-control bg-[var(--module-accent)] px-4 text-sm font-semibold text-white md:h-9"
                >
                  Open player card
                </button>
              </div>
              <ul className="mt-4 space-y-2">
                {linkedReportsForSelected.length ? (
                  linkedReportsForSelected.map((report) => (
                    <li key={report.id}>
                      <ScoutingDirectReportPreviewCard report={report} onOpen={onOpenReport} />
                    </li>
                  ))
                ) : (
                  <li>
                    <EmptyState
                      title="No linked reports"
                      description="This opponent has no direct match reports yet."
                    />
                  </li>
                )}
              </ul>
            </div>
          ) : filteredPlayerCount > 0 ? (
            <div data-scouting-player-workspace="" className="flex min-h-[16rem] items-center justify-center p-6">
              <EmptyState
                title="Select an opponent player"
                description="Filtered players are available in the middle column. Choose a team, then a player to preview reports."
              />
            </div>
          ) : (
            <div data-scouting-player-workspace="" className="flex min-h-[16rem] items-center justify-center p-6">
              <EmptyState
                title={
                  playerLifecycle === "archived"
                    ? "No archived opponent selected"
                    : teamArchivedCount > 0 && teamActiveCount === 0
                      ? "All opponents archived"
                      : "Select an opponent player"
                }
                description={
                  playerLifecycle === "archived"
                    ? "Choose a team, then an archived opponent to review preserved history."
                    : teamArchivedCount > 0 && teamActiveCount === 0
                      ? "No active opponents remain on this team. Open Archived to review preserved history, or choose another team."
                      : filtersActive
                        ? "No players match the current filters. Clear filters or choose another team."
                        : "Choose a team, then a player to preview reports. Use Open player card for the full card."
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm font-medium text-[var(--module-accent-text)]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back to {label}
    </button>
  );
}

function TeamNavigator({
  teams,
  players,
  selectedTeamId,
  onSelect,
}: {
  teams: ScoutingTeam[];
  players: ScoutingOpponentPlayer[];
  selectedTeamId: string;
  onSelect: (teamId: string) => void;
}) {
  return (
    <nav data-scouting-team-nav="" aria-label="Opponent teams" className="min-h-0 overflow-y-auto">
      <p className="sticky top-0 z-[1] border-b border-border bg-app-background px-3 py-2 text-[10px] font-semibold tracking-wide text-text-secondary uppercase">
        Opponent Teams
      </p>
      <ul className="p-1.5">
        {teams.map((team) => {
          const selected = team.id === selectedTeamId;
          const teamPlayers = players.filter((player) => player.teamId === team.id);
          const activeCount = teamPlayers.filter((player) => !isOpponentArchived(player)).length;
          const archivedForTeam = teamPlayers.filter((player) => isOpponentArchived(player)).length;
          const activeTeamPlayers = teamPlayers.filter((player) => !isOpponentArchived(player));
          const aiReady = activeTeamPlayers.filter((player) => player.hasAiReport && !player.aiStale).length;
          const aiStale = activeTeamPlayers.filter((player) => player.hasAiReport && player.aiStale).length;
          const label = scoutingTeamCanonicalLabel(team.displayName);
          return (
            <li key={team.id}>
              <button
                type="button"
                aria-pressed={selected}
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(team.id)}
                className={`flex min-h-11 w-full items-start gap-2.5 rounded-control border px-2.5 py-2 text-left transition-colors md:min-h-0 ${
                  selected
                    ? "border-[var(--module-accent)]/25 bg-[var(--module-tint)]/70 shadow-[inset_3px_0_0_var(--module-accent)]"
                    : "border-transparent hover:bg-[var(--module-tint)]/35"
                }`}
              >
                <ScoutingTeamMark name={team.displayName} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">{label}</span>
                  <span className="mt-0.5 block text-[11px] text-text-secondary">
                    {activeCount} players · {team.reportCount} reports
                  </span>
                  {archivedForTeam > 0 ? (
                    <span className="mt-0.5 block text-[10px] text-text-secondary">
                      {archivedForTeam} archived
                    </span>
                  ) : null}
                  {aiReady || aiStale ? (
                    <span className="mt-0.5 block text-[10px] text-text-secondary">
                      {aiReady ? `${aiReady} AI ready` : null}
                      {aiReady && aiStale ? " · " : null}
                      {aiStale ? `${aiStale} stale` : null}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PlayerRoster({
  players,
  reports,
  selectedPlayerId,
  onSelect,
  headerLabel = "Players",
  emptyTitle = "No players",
  emptyDescription = "Select another team or clear filters.",
  emptyAction,
}: {
  players: ScoutingOpponentPlayer[];
  reports: ScoutingDirectReport[];
  selectedPlayerId: string;
  onSelect: (player: ScoutingOpponentPlayer) => void;
  headerLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}) {
  if (!players.length) {
    return (
      <div data-scouting-player-list="" className="min-h-0 overflow-y-auto p-4">
        <EmptyState title={emptyTitle} description={emptyDescription} />
        {emptyAction}
      </div>
    );
  }
  return (
    <div
      data-scouting-player-list=""
      className="min-h-0 overflow-y-auto"
      role="listbox"
      aria-label="Opponent players"
    >
      <p className="sticky top-0 z-[1] border-b border-border bg-app-background px-3 py-2 text-[10px] font-semibold tracking-wide text-text-secondary uppercase">
        {headerLabel}
      </p>
      <ul className="divide-y divide-border/70">
        {players.map((player) => {
          const selected = player.id === selectedPlayerId;
          const playerReports = reports.filter((report) => report.opponentPlayerId === player.id);
          const latest = latestReportMeta(playerReports);
          const aiLabel = player.hasAiReport ? (player.aiStale ? "Stale" : "Ready") : "No AI";
          return (
            <li key={player.id}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(player)}
                className={`flex min-h-11 w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors md:min-h-0 ${
                  selected
                    ? "border-l-[3px] border-l-[var(--module-accent)] bg-[var(--module-tint)]/55"
                    : "border-l-[3px] border-l-transparent hover:bg-[var(--module-tint)]/30"
                }`}
              >
                <ScoutingTeamMark name={player.teamDisplayName} size={22} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-text-primary">{player.displayName}</span>
                    <span className="shrink-0 text-[10px] font-medium text-text-secondary">{aiLabel}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-text-secondary">
                    {player.handedness || "Hand?"} · {player.directReportCount} reports
                    {latest.dateLabel ? ` · ${latest.dateLabel}` : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TeamsView({
  rows,
  players,
  reports,
  sort,
  onSort,
  onOpenEdit,
  onOpenPlayer,
  onOpenReport,
}: {
  rows: ScoutingTeam[];
  players: ScoutingOpponentPlayer[];
  reports: ScoutingDirectReport[];
  sort: { key: TeamSortKey; direction: ScoutingSortDirection };
  onSort: (key: TeamSortKey) => void;
  onOpenEdit: (team: ScoutingTeam) => void;
  onOpenPlayer: (playerId: string) => void;
  onOpenReport: (reportId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");
  const effectiveId = rows.some((team) => team.id === selectedId) ? selectedId : (rows[0]?.id ?? "");
  const selected = rows.find((team) => team.id === effectiveId) ?? null;

  if (!rows.length) {
    return (
      <div className="p-5">
        <EmptyState title="No teams" description="Import or add scouting teams to begin." />
      </div>
    );
  }

  const teamPlayers = selected ? players.filter((player) => player.teamId === selected.id) : [];
  const teamReports = selected ? reports.filter((report) => report.teamId === selected.id) : [];

  return (
    <div data-scouting-teams-view="" className="grid min-h-[28rem] lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
      <div className="min-h-0 overflow-y-auto border-b border-border lg:border-r lg:border-b-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="bg-app-background">
              <tr className="border-b border-border">
                <Header label="Team" field="displayName" sort={sort} update={onSort} />
                <Header label="Players" field="playerCount" sort={sort} update={onSort} />
                <Header label="Reports" field="reportCount" sort={sort} update={onSort} />
              </tr>
            </thead>
            <tbody>
              {rows.map((team) => {
                const active = team.id === selected?.id;
                return (
                  <tr
                    key={team.id}
                    tabIndex={0}
                    role="button"
                    aria-pressed={active}
                    className={`cursor-pointer border-b border-border/70 text-xs ${
                      active
                        ? "bg-[var(--module-tint)]/60 shadow-[inset_3px_0_0_var(--module-accent)]"
                        : "hover:bg-[var(--module-tint)]/40"
                    }`}
                    onClick={() => setSelectedId(team.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(team.id);
                      }
                    }}
                  >
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
                        <ScoutingTeamMark name={team.displayName} size={22} />
                        {scoutingTeamCanonicalLabel(team.displayName)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{team.playerCount}</td>
                    <td className="px-3 py-2.5 tabular-nums">{team.reportCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-border md:hidden">
          {rows.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => setSelectedId(team.id)}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left"
            >
              <ScoutingTeamMark name={team.displayName} size={24} />
              <span>
                <span className="block text-sm font-semibold">{scoutingTeamCanonicalLabel(team.displayName)}</span>
                <span className="text-xs text-text-secondary">
                  {team.playerCount} players · {team.reportCount} reports
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div data-scouting-team-workspace="" className="min-h-0 overflow-y-auto p-4 sm:p-5">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <ScoutingTeamMark name={selected.displayName} size={40} />
              <div>
                <h2 className="text-lg font-semibold">{scoutingTeamCanonicalLabel(selected.displayName)}</h2>
                <p className="text-xs text-text-secondary">
                  {teamPlayers.length} players · {teamReports.length} match reports
                  {resolveScoutingTeamIdentity(selected.displayName)?.slug
                    ? ` · ${resolveScoutingTeamIdentity(selected.displayName)?.slug}`
                    : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenEdit(selected)}
              className="h-11 rounded-control border border-border px-3 text-sm font-semibold md:h-9"
            >
              Edit / AI
            </button>
          </header>

          <section className="mt-4">
            <h3 className="text-xs font-semibold tracking-wide text-text-secondary uppercase">Opponent players</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {teamPlayers.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    data-scouting-team-player-card=""
                    onClick={() => onOpenPlayer(player.id)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-card border border-[var(--module-border)] bg-surface px-3 py-2.5 text-left transition-colors hover:bg-[var(--module-tint)]/40"
                  >
                    <ScoutingTeamMark name={player.teamDisplayName} size={22} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-text-primary">
                        {player.displayName}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {player.directReportCount} reports ·{" "}
                        {player.hasAiReport ? (player.aiStale ? "AI stale" : "AI ready") : "No AI"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {teamPlayers.length === 0 ? (
                <li className="text-sm text-text-secondary">No linked opponent players for this team.</li>
              ) : null}
            </ul>
          </section>

          <section className="mt-4">
            <h3 className="text-xs font-semibold tracking-wide text-text-secondary uppercase">Match reports</h3>
            <ul className="mt-2 space-y-2">
              {teamReports.map((report) => (
                <li key={report.id}>
                  <ScoutingDirectReportPreviewCard report={report} onOpen={(row) => onOpenReport(row.id)} />
                </li>
              ))}
              {teamReports.length === 0 ? (
                <li className="text-sm text-text-secondary">No match reports for this team.</li>
              ) : null}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ReportsCardGrid({
  rows,
  sort,
  onSort,
  onOpen,
}: {
  rows: ScoutingDirectReport[];
  sort: { key: MatchReportSortKey; direction: ScoutingSortDirection };
  onSort: (key: MatchReportSortKey) => void;
  onOpen: (report: ScoutingDirectReport) => void;
}) {
  if (!rows.length) {
    return (
      <div className="p-5">
        <EmptyState title="No match reports" description="Try another search or clear filters." />
      </div>
    );
  }
  return (
    <div data-scouting-match-reports-view="" className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap gap-2">
        <SortChip label="Date" active={sort.key === "matchDate"} onClick={() => onSort("matchDate")} />
        <SortChip
          label="Opponent"
          active={sort.key === "opponentDisplayName"}
          onClick={() => onSort("opponentDisplayName")}
        />
        <SortChip
          label="Team"
          active={sort.key === "teamDisplayName"}
          onClick={() => onSort("teamDisplayName")}
        />
        <SortChip label="By" active={sort.key === "reportBy"} onClick={() => onSort("reportBy")} />
        <SortChip
          label="Status"
          active={sort.key === "importStatus"}
          onClick={() => onSort("importStatus")}
        />
      </div>
      <ul className="grid gap-2 lg:grid-cols-2">
        {rows.map((report) => (
          <li key={report.id}>
            <ScoutingDirectReportPreviewCard report={report} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubmissionsCardGrid({
  rows,
  sort,
  onSort,
  onOpen,
}: {
  rows: ScoutingFormSubmission[];
  sort: { key: SubmissionSortKey; direction: ScoutingSortDirection };
  onSort: (key: SubmissionSortKey) => void;
  onOpen: (submission: ScoutingFormSubmission) => void;
}) {
  if (!rows.length) {
    return (
      <div className="p-5">
        <EmptyState
          title="No form submissions"
          description="Create a shareable form link to collect post-match notes."
        />
      </div>
    );
  }
  return (
    <div data-scouting-submissions-view="" className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap gap-2">
        <SortChip label="Submitted" active={sort.key === "createdAt"} onClick={() => onSort("createdAt")} />
        <SortChip
          label="Opponent"
          active={sort.key === "opponentDisplayName"}
          onClick={() => onSort("opponentDisplayName")}
        />
        <SortChip
          label="Team"
          active={sort.key === "teamDisplayName"}
          onClick={() => onSort("teamDisplayName")}
        />
        <SortChip label="Status" active={sort.key === "status"} onClick={() => onSort("status")} />
      </div>
      <ul className="grid gap-2 lg:grid-cols-2">
        {rows.map((row) => (
          <li key={row.id}>
            <ScoutingSubmissionPreviewCard submission={row} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubmissionCardSurface({
  submission,
}: {
  submission: ScoutingFormSubmission;
  onStatusChange: () => void;
}) {
  const [, startTransition] = useTransition();
  return (
    <ScoutingSubmissionCard
      submission={submission}
      statusControl={
        <select
          className="h-11 rounded-control border border-border bg-surface px-2 text-sm md:h-9"
          defaultValue={submission.status}
          onChange={(event) => {
            const formData = new FormData();
            formData.set("status", event.target.value);
            startTransition(async () => {
              await updateSubmissionStatusAction(submission.id, formData);
            });
          }}
        >
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="needs_clarification">Needs Clarification</option>
          <option value="archived">Archived</option>
        </select>
      }
    />
  );
}

function TeamReportSurface({
  teamId,
  teamReportId,
  teams,
  reports,
  onOpenReport,
  onOpenPlayer,
}: {
  teamId: string;
  teamReportId: string;
  teams: ScoutingTeam[];
  reports: ScoutingDirectReport[];
  onOpenReport: (reportId: string) => void;
  onOpenPlayer: (playerId: string) => void;
}) {
  const team = teams.find((row) => row.id === teamId) ?? null;
  const [teamReport, setTeamReport] = useState<ScoutingTeamReport | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await loadTeamWorkspaceAction(teamId);
      if (!result.success) return;
      setTeamReport(result.workspace.teamReports.find((row) => row.id === teamReportId) ?? null);
    });
  }, [teamId, teamReportId]);

  if (!team || !teamReport) {
    return <EmptyState title="Team report" description="Loading team report…" />;
  }

  return (
    <ScoutingTeamReportCard
      report={teamReport}
      teamName={team.displayName}
      sourceReports={reports.filter((report) => report.teamId === teamId)}
      onOpenSource={(report) => onOpenReport(report.id)}
      onOpenPlayer={onOpenPlayer}
    />
  );
}

function SortChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-control px-2.5 py-1 text-[11px] font-semibold ${
        active
          ? "bg-[var(--module-tint)] text-[var(--module-accent-text)]"
          : "border border-border text-text-secondary"
      }`}
    >
      {label}
    </button>
  );
}

function CompactSelect({
  ariaLabel,
  value,
  allLabel,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  /** When empty/omitted, no blank “all” option is rendered (required selects). */
  allLabel?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 min-w-[7.5rem] rounded-control border border-border bg-surface px-2.5 text-sm text-text-primary"
    >
      {allLabel ? <option value="">{allLabel}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Header<T extends string>({
  label,
  field,
  sort,
  update,
}: {
  label: string;
  field: T;
  sort: { key: T; direction: ScoutingSortDirection };
  update: (key: T) => void;
}) {
  return (
    <SortableColumnHeader
      label={label}
      sortDirection={sort.key === field ? sort.direction : null}
      onSort={() => update(field)}
      className="px-3"
    />
  );
}

function latestReportMeta(reports: ScoutingDirectReport[]) {
  const dated = [...reports]
    .map((report) => ({
      key: report.matchDate || report.matchDateRaw,
      label: report.matchDate ? formatDate(report.matchDate) : report.matchDateRaw || null,
    }))
    .filter((row) => row.key)
    .sort((a, b) => (a.key! < b.key! ? 1 : a.key! > b.key! ? -1 : 0));
  return { dateLabel: dated[0]?.label ?? null };
}

function TeamWorkspaceDrawer({
  team,
  players,
  reports,
  onOpenPlayer,
  onOpenReport,
  onOpenTeamReport,
  onClose,
}: {
  team: ScoutingTeam;
  players: ScoutingOpponentPlayer[];
  reports: ScoutingDirectReport[];
  onOpenPlayer: (playerId: string) => void;
  onOpenReport: (reportId: string) => void;
  onOpenTeamReport: (teamReportId: string) => void;
  onClose: () => void;
}) {
  const [manualBody, setManualBody] = useState("");
  const [teamReports, setTeamReports] = useState<ScoutingTeamReport[]>([]);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const identity = resolveScoutingTeamIdentity(team.displayName);

  useEffect(() => {
    startTransition(async () => {
      const result = await loadTeamWorkspaceAction(team.id);
      if (result.success) {
        const manual = result.workspace.teamReports.find((report) => report.kind === "manual");
        setManualBody(manual?.body ?? "");
        setTeamReports(result.workspace.teamReports);
      }
    });
  }, [team.id]);

  return (
    <div className="space-y-5 p-5" data-scouting-team-edit-drawer="">
      <div className="flex items-center gap-3">
        <ScoutingTeamMark name={team.displayName} size={36} />
        <div>
          <p className="text-lg font-semibold">{scoutingTeamCanonicalLabel(team.displayName)}</p>
          <p className="text-xs text-text-secondary">
            {identity?.slug ? `identity: ${identity.slug}` : "No school identity link"} · {players.length}{" "}
            players · {reports.length} reports
          </p>
        </div>
      </div>
      <section>
        <h3 className="text-xs font-semibold tracking-wide text-text-secondary uppercase">Opponent players</h3>
        <ul className="mt-2 space-y-2">
          {players.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                onClick={() => onOpenPlayer(player.id)}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--module-accent-text)] hover:underline"
              >
                <ScoutingTeamMark name={player.teamDisplayName} size={16} />
                {player.displayName} · {player.directReportCount} reports
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-wide text-text-secondary uppercase">Match reports</h3>
        <ul className="mt-2 space-y-2">
          {reports.slice(0, 6).map((report) => (
            <li key={report.id}>
              <ScoutingDirectReportPreviewCard report={report} onOpen={(row) => onOpenReport(row.id)} />
            </li>
          ))}
        </ul>
      </section>
      <DrawerField label="Manual team report">
        <textarea
          value={manualBody}
          onChange={(event) => setManualBody(event.target.value)}
          rows={5}
          className="w-full rounded-control border border-border px-3 py-2 text-sm"
        />
      </DrawerField>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className="rounded-control bg-[var(--module-accent)] px-3 py-2 text-sm font-semibold text-white"
          onClick={() =>
            startTransition(async () => {
              const result = await saveManualTeamReportAction(team.id, manualBody);
              setMessage(result.success ? "Team report saved." : result.message);
            })
          }
        >
          Save team report
        </button>
        <button
          type="button"
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-control border border-border px-3 py-2 text-sm font-semibold"
          onClick={() =>
            startTransition(async () => {
              const result = await regenerateTeamAiAction(team.id);
              if (result.success) {
                setTeamReports((current) => {
                  const withoutAi = current.filter((row) => row.kind !== "ai_generated");
                  return [...withoutAi, result.report];
                });
                setMessage("Team AI summary generated (draft).");
              } else setMessage(result.message);
            })
          }
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Generate AI team summary
        </button>
      </div>
      {teamReports.map((report) => (
        <button
          key={report.id}
          type="button"
          onClick={() => onOpenTeamReport(report.id)}
          className="block w-full rounded-control border border-border px-3 py-2 text-left text-sm hover:bg-[var(--module-tint)]/40"
        >
          Open {report.kind === "ai_generated" ? "AI" : "manual"} team report card
        </button>
      ))}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      <button type="button" onClick={onClose} className="text-sm font-semibold text-[var(--module-accent-text)]">
        Close
      </button>
    </div>
  );
}

function DirectReportForm({
  teams,
  players,
  archivedPlayers = [],
  onCancel,
}: {
  teams: ScoutingTeam[];
  players: ScoutingOpponentPlayer[];
  archivedPlayers?: ScoutingOpponentPlayer[];
  onCancel: () => void;
}) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const activeForTeam = players.filter((player) => player.teamId === teamId);
  const archivedForTeam = archivedPlayers.filter((player) => player.teamId === teamId);

  return (
    <form
      className="space-y-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await saveDirectReportAction(formData);
          if (result.success) onCancel();
          else setMessage(result.message);
        });
      }}
    >
      <DrawerField label="Team">
        <select
          name="teamId"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          className="h-10 w-full rounded-control border border-border px-3 text-sm"
          required
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {scoutingTeamCanonicalLabel(team.displayName)}
            </option>
          ))}
        </select>
      </DrawerField>
      <DrawerField label="Opponent player (optional)">
        <select name="opponentPlayerId" className="h-10 w-full rounded-control border border-border px-3 text-sm">
          <option value="">Unlinked / compound</option>
          {activeForTeam.map((player) => (
            <option key={player.id} value={player.id}>
              {player.displayName}
            </option>
          ))}
          {archivedForTeam.length > 0 ? (
            <optgroup label="Archived opponents">
              {archivedForTeam.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.displayName} (archived)
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </DrawerField>
      <DrawerField label="Opponent display name">
        <input name="opponentDisplayName" className="h-10 w-full rounded-control border border-border px-3 text-sm" />
      </DrawerField>
      <DrawerField label="Match date">
        <input name="matchDate" type="date" className="h-10 w-full rounded-control border border-border px-3 text-sm" />
      </DrawerField>
      <DrawerField label="Handedness">
        <select name="handedness" className="h-10 w-full rounded-control border border-border px-3 text-sm">
          <option value="">Unknown</option>
          <option value="Right">Right</option>
          <option value="Left">Left</option>
        </select>
      </DrawerField>
      <DrawerField label="Report by">
        <input name="reportBy" className="h-10 w-full rounded-control border border-border px-3 text-sm" />
      </DrawerField>
      <DrawerField label="Strengths / weaknesses / notes">
        <textarea name="strengthsWeaknesses" rows={6} className="w-full rounded-control border border-border px-3 py-2 text-sm" />
      </DrawerField>
      <DrawerField label="Scouting report">
        <textarea name="scoutingReport" rows={3} className="w-full rounded-control border border-border px-3 py-2 text-sm" />
      </DrawerField>
      <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <input name="isDoubles" type="checkbox" value="true" />
        Doubles
      </label>
      {message ? <p className="text-sm text-danger">{message}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-[var(--module-accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-control border border-border px-4 py-2 text-sm font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}

function FormLinksPanel({
  teams,
  players,
  links,
  onClose,
}: {
  teams: ScoutingTeam[];
  players: ScoutingOpponentPlayer[];
  links: ScoutingFormLink[];
  onClose: () => void;
}) {
  const [createdUrl, setCreatedUrl] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4 p-5">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await createFormLinkAction(formData);
            if (result.success) {
              const origin = typeof window !== "undefined" ? window.location.origin : "";
              setCreatedUrl(result.urlPath ? `${origin}${result.urlPath}` : undefined);
              setMessage("Link created. Copy now — the raw token is shown only once.");
            } else setMessage(result.message);
          });
        }}
      >
        <DrawerField label="Label">
          <input
            name="label"
            defaultValue="Post-match scouting"
            className="h-10 w-full rounded-control border border-border px-3 text-sm"
          />
        </DrawerField>
        <DrawerField label="Preselect team">
          <select name="teamId" className="h-10 w-full rounded-control border border-border px-3 text-sm">
            <option value="">None</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {scoutingTeamCanonicalLabel(team.displayName)}
              </option>
            ))}
          </select>
        </DrawerField>
        <DrawerField label="Preselect player">
          <select name="opponentPlayerId" className="h-10 w-full rounded-control border border-border px-3 text-sm">
            <option value="">None</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.displayName} ({scoutingTeamCanonicalLabel(player.teamDisplayName)})
              </option>
            ))}
          </select>
        </DrawerField>
        <DrawerField label="Expires at">
          <input name="expiresAt" type="datetime-local" className="h-10 w-full rounded-control border border-border px-3 text-sm" />
        </DrawerField>
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-[var(--module-accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          Create link
        </button>
      </form>
      {createdUrl ? (
        <p className="break-all rounded-control border border-green-200 bg-green-50 p-3 text-sm">{createdUrl}</p>
      ) : null}
      <ul className="space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.id} className="flex items-center justify-between gap-2 rounded-control border border-border px-3 py-2">
            <span>
              {link.label || "Untitled"} {link.revokedAt ? "(revoked)" : ""}
            </span>
            {!link.revokedAt ? (
              <button
                type="button"
                className="text-xs font-semibold text-danger"
                onClick={() =>
                  startTransition(async () => {
                    await revokeFormLinkAction(link.id);
                    setMessage("Link revoked.");
                  })
                }
              >
                Revoke
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      <button type="button" onClick={onClose} className="text-sm font-semibold text-[var(--module-accent-text)]">
        Close
      </button>
    </div>
  );
}
