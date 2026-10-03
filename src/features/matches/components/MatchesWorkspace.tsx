"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type MouseEvent } from "react";
import {
  Activity,
  BadgePercent,
  Home,
  MapPin,
  Plane,
  Plus,
  RefreshCcw,
  Trophy,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import EmptyState from "@/components/EmptyState";
import ModulePageShell from "@/components/ModulePageShell";
import ModuleSectionTabs from "@/components/ModuleSectionTabs";
import SearchInput from "@/components/SearchInput";
import { formatDate } from "@/lib/formatting";
import { modulePrimaryButtonClass } from "@/components/module-theme";
import {
  MATCHES_ROUTE,
  matchesEventPath,
  matchesPlayerPath,
  matchesPairPath,
  teamOperationsScheduleEventPath,
} from "@/lib/module-routes";
import {
  SCHEDULE_STATUS_LABELS,
  SITE_DESIGNATION_LABELS,
  displayOpponentOrEvent,
  type TeamScheduleEvent,
} from "@/features/teamSchedule/types";
import { formatScheduleDateDisplay, typeBadgeForEvent } from "@/features/teamSchedule/display";
import { resolveScheduleIdentity } from "@/features/teamSchedule/schoolIdentity";
import ScheduleIdentityMark from "@/features/teamSchedule/components/ScheduleIdentityMark";

import {
  buildDoublesPairRecords,
  buildDoublesPlayerRecords,
  buildOverallDoublesRecord,
  buildSinglesPlayerRecords,
  buildTeamRecordsDashboard,
  buildTeamSeasonRecords,
  type TeamDashboardRecord,
  type TeamRecordsDashboard,
} from "../records";
import {
  eventDisplayTitle,
  formatRecord,
  formatSeasonLabel,
  formatTeamOutcome,
  formatTeamScore,
  matchesTabHref,
  pairDisplayName,
  playerNameFor,
} from "../display";
import { resolveMatchSchoolName } from "../schoolNames";
import {
  buildTeamCompetitionRows,
  competitionRowHref,
  dualScoreSummary,
  filterTeamCompetitionRows,
  listUnlinkedMatchEvents,
  RESULTS_STATUS_LABELS,
  tournamentResultSummary,
  type CompetitionFilter,
  type TeamCompetitionRow,
} from "../teamCompetitions";
import {
  DEFAULT_MATCHES_SEASON_YEAR,
  MATCHES_TAB_LABELS,
  MATCHES_TABS,
  type EventTypeFilter,
  type MatchEvent,
  type MatchResult,
  type MatchesTab,
  type RosterPlayer,
  type WinLossRecord,
} from "../types";
import { EMPTY_RECORD, sumRecords } from "../scoringRules";
import ImportBoxScoreFlow from "./ImportBoxScoreFlow";
import LinkSchedulePanel from "./LinkSchedulePanel";
import DeleteMatchResultButton from "./DeleteMatchResultButton";

const cardClass =
  "rounded-card border border-border bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]";

function resultsStatusBadgeClass(status: TeamCompetitionRow["resultsStatus"]): string {
  switch (status) {
    case "complete":
      return "bg-green-50 text-green-700";
    case "partial":
      return "bg-amber-50 text-amber-800";
    case "awaiting":
      return "bg-red-50 text-red-700";
    case "upcoming":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function scheduleStatusBadgeClass(status: TeamScheduleEvent["status"]): string {
  switch (status) {
    case "confirmed":
      return "bg-green-50 text-green-700";
    case "tentative":
      return "bg-amber-50 text-amber-800";
    case "tbd":
      return "bg-slate-100 text-slate-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function MatchesWorkspace({
  events,
  results,
  roster,
  scheduleById = {},
  tab,
  loadError = null,
  initialImportOpen = false,
  initialScheduleEventId = null,
  initialEntryMethod = "paste",
}: {
  events: MatchEvent[];
  results: MatchResult[];
  roster: RosterPlayer[];
  scheduleById?: Record<string, TeamScheduleEvent>;
  tab: MatchesTab;
  loadError?: string | null;
  initialImportOpen?: boolean;
  initialScheduleEventId?: string | null;
  initialEntryMethod?: "paste" | "manual";
}) {
  const router = useRouter();
  const [seasonYear, setSeasonYear] = useState<number | "all">(DEFAULT_MATCHES_SEASON_YEAR);
  const [eventType, setEventType] = useState<EventTypeFilter>("all");
  const [competitionFilter, setCompetitionFilter] = useState<CompetitionFilter>("all");
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(initialImportOpen);
  const [importScheduleId, setImportScheduleId] = useState<string | null>(initialScheduleEventId);
  const [entryMethod, setEntryMethod] = useState<"paste" | "manual">(initialEntryMethod);

  const scheduleEvents = useMemo(() => Object.values(scheduleById), [scheduleById]);

  const seasonOptions = useMemo(() => {
    const years = new Set(scheduleEvents.map((e) => e.seasonYear));
    for (const event of events) years.add(event.seasonYear);
    years.add(DEFAULT_MATCHES_SEASON_YEAR);
    return [...years].sort((a, b) => b - a);
  }, [events, scheduleEvents]);

  const competitionRows = useMemo(
    () =>
      buildTeamCompetitionRows({
        scheduleEvents,
        matchEvents: events,
        results,
      }),
    [scheduleEvents, events, results],
  );

  const filteredCompetitions = useMemo(
    () =>
      filterTeamCompetitionRows(competitionRows, {
        seasonYear,
        eventType,
        competitionFilter,
        query,
      }),
    [competitionRows, seasonYear, eventType, competitionFilter, query],
  );

  const unlinkedEvents = useMemo(() => {
    const unlinked = listUnlinkedMatchEvents(events);
    return unlinked.filter((event) => {
      if (seasonYear !== "all" && event.seasonYear !== seasonYear) return false;
      if (eventType !== "all" && event.eventType !== eventType) return false;
      if (!query.trim()) return true;
      const hay = [event.title, event.opposingTeamName, event.locationText, event.venueName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
  }, [events, seasonYear, eventType, query]);

  const seasonEventsForRecord =
    seasonYear === "all"
      ? events
      : events.filter((e) => {
          const schedule = e.scheduleEventId ? scheduleById[e.scheduleEventId] : null;
          return (schedule?.seasonYear ?? e.seasonYear) === seasonYear;
        });
  const teamRecord = buildTeamSeasonRecords(seasonEventsForRecord);
  const currentTeam = teamRecord.find(
    (r) => r.seasonYear === (seasonYear === "all" ? DEFAULT_MATCHES_SEASON_YEAR : seasonYear),
  );

  const singlesRecords = buildSinglesPlayerRecords(results, events, {
    seasonYear: seasonYear === "all" ? null : seasonYear,
    eventType,
  });
  const doublesPlayerRecords = buildDoublesPlayerRecords(results, events, {
    seasonYear: seasonYear === "all" ? null : seasonYear,
    eventType,
  });
  const doublesPairRecords = buildDoublesPairRecords(results, events, {
    seasonYear: seasonYear === "all" ? null : seasonYear,
    eventType,
  });
  const overallDoubles = buildOverallDoublesRecord(results, events, {
    seasonYear: seasonYear === "all" ? null : seasonYear,
    eventType,
  });
  const singlesTotals = aggregateRecordBreakdown(singlesRecords);
  const doublesPlayerTotals = aggregateRecordBreakdown(doublesPlayerRecords);
  const doublesTeamTotals = aggregateRecordBreakdown(doublesPairRecords);
  const teamDashboard = buildTeamRecordsDashboard(results, events, {
    seasonYear: seasonYear === "all" ? null : seasonYear,
    eventType,
  });

  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      const event = events.find((e) => e.id === result.eventId);
      if (!event) return false;
      const schedule = event.scheduleEventId ? scheduleById[event.scheduleEventId] : null;
      const displayYear = schedule?.seasonYear ?? event.seasonYear;
      if (seasonYear !== "all" && displayYear !== seasonYear) return false;
      if (eventType !== "all" && event.eventType !== eventType) return false;
      if (!query.trim()) return true;
      const hay = [
        eventDisplayTitle(event, schedule),
        playerNameFor(result.denisonPlayerAId, roster),
        playerNameFor(result.denisonPlayerBId, roster),
        result.opponentPlayerAName,
        result.opponentPlayerBName,
        result.opponentSchool,
        resolveMatchSchoolName(result.opponentSchool).name,
        result.scoreText,
        result.drawName,
        result.roundLabel,
        result.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
  }, [results, events, seasonYear, eventType, query, roster, scheduleById]);

  function openEntry(scheduleEventId?: string | null, method: "paste" | "manual" = "paste") {
    setImportScheduleId(scheduleEventId ?? null);
    setEntryMethod(method);
    setImportOpen(true);
  }

  return (
    <ModulePageShell
      title="Matches"
      subtitle="Official dual and tournament results — Schedule owns identity; Matches owns results."
    >
      {loadError ? (
        <p className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ModuleSectionTabs
          aria-label="Matches sections"
          tabs={MATCHES_TABS.map((id) => ({ id, label: MATCHES_TAB_LABELS[id] }))}
          activeId={tab}
          onChange={(id) => router.push(matchesTabHref(id), { scroll: false })}
        />
        <button
          type="button"
          onClick={() => openEntry(null, "paste")}
          className={`${modulePrimaryButtonClass} shrink-0 gap-2 shadow-sm`}
        >
          <Plus className="h-4 w-4" />
          Enter Results
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="text-xs text-text-secondary">
          Season{" "}
          <select
            value={seasonYear === "all" ? "all" : String(seasonYear)}
            onChange={(e) =>
              setSeasonYear(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="ml-1 h-9 rounded-control border border-border bg-surface px-2 text-xs font-semibold"
          >
            <option value="all">All</option>
            {seasonOptions.map((year: number) => (
              <option key={year} value={year}>
                {formatSeasonLabel(year)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-secondary">
          Type{" "}
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventTypeFilter)}
            className="ml-1 h-9 rounded-control border border-border bg-surface px-2 text-xs font-semibold"
          >
            <option value="all">All</option>
            <option value="dual">Dual</option>
            <option value="tournament">Tournament</option>
          </select>
        </label>
        {tab === "events" ? (
          <label className="text-xs text-text-secondary">
            Event status{" "}
            <select
              value={competitionFilter}
              onChange={(e) => setCompetitionFilter(e.target.value as CompetitionFilter)}
              className="ml-1 h-9 rounded-control border border-border bg-surface px-2 text-xs font-semibold"
            >
              <option value="all">All events</option>
              <option value="needs_results">Needs Results</option>
              <option value="upcoming">Upcoming</option>
              <option value="complete">Complete</option>
            </select>
          </label>
        ) : null}
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <SearchInput value={query} onChange={setQuery} placeholder="Search…" aria-label="Search matches" />
        </div>
      </div>

      {tab === "events" ? (
        <section className="grid gap-3">
          <div className={`${cardClass} p-4`}>
            <p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
              Dual season record
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {currentTeam
                ? `${currentTeam.wins}–${currentTeam.losses}${currentTeam.ties ? `–${currentTeam.ties}` : ""}`
                : "0–0"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Confirmed dual outcomes only. Upcoming/awaiting invent nothing. Partial duals with a
              team outcome still count; Mark complete is separate admin status.
            </p>
          </div>
          <CompetitionsTable
            rows={filteredCompetitions}
            onEnter={(scheduleId, method) => openEntry(scheduleId, method)}
          />
          {unlinkedEvents.length > 0 ? (
            <UnlinkedResultsSection events={unlinkedEvents} />
          ) : null}
        </section>
      ) : null}

      {tab === "team" ? <TeamRecordsDashboardView records={teamDashboard} /> : null}

      {tab === "players" ? (
        <section className="grid gap-3">
          <RecordSummaryCards totals={singlesTotals} recordLabel="Singles" />
          <SinglesTable records={singlesRecords} roster={roster} totals={singlesTotals} />
        </section>
      ) : null}

      {tab === "doubles-players" ? (
        <section className="grid gap-3">
          <RecordSummaryCards
            totals={{ ...doublesTeamTotals, overall: overallDoubles }}
            recordLabel="Doubles"
            note="Team totals count each match once."
          />
          <DoublesPlayersTable
            records={doublesPlayerRecords}
            roster={roster}
            totals={doublesPlayerTotals}
          />
        </section>
      ) : null}

      {tab === "doubles-teams" ? (
        <section className="grid gap-3">
          <RecordSummaryCards totals={doublesTeamTotals} recordLabel="Doubles teams" />
          <DoublesTeamsTable
            records={doublesPairRecords}
            roster={roster}
            totals={doublesTeamTotals}
          />
        </section>
      ) : null}

      {tab === "results" ? (
        <ResultsTable
          results={filteredResults}
          events={events}
          roster={roster}
          scheduleById={scheduleById}
        />
      ) : null}

      {importOpen ? (
        <ImportBoxScoreFlow
          roster={roster}
          seasonYear={seasonYear === "all" ? DEFAULT_MATCHES_SEASON_YEAR : seasonYear}
          initialScheduleEventId={importScheduleId}
          initialMethod={entryMethod}
          onClose={() => setImportOpen(false)}
          onSaved={(eventId) => {
            setImportOpen(false);
            router.push(matchesEventPath(eventId));
            router.refresh();
          }}
        />
      ) : null}
    </ModulePageShell>
  );
}

function recordPercentage(record: TeamDashboardRecord): string {
  const decided = record.wins + record.losses;
  return decided > 0 ? `${((record.wins / decided) * 100).toFixed(1)}%` : "—";
}

function TeamRecordCard({
  title,
  description,
  record,
  icon: Icon,
  tone,
}: {
  title: string;
  description: string;
  record: TeamDashboardRecord;
  icon: LucideIcon;
  tone: "red" | "blue" | "green" | "violet" | "orange" | "teal";
}) {
  const colors = {
    red: "border-red-200 bg-gradient-to-br from-red-50 via-white to-white text-red-700",
    blue: "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-white text-blue-700",
    green: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white text-emerald-700",
    violet: "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white text-violet-700",
    orange: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white text-amber-700",
    teal: "border-teal-200 bg-gradient-to-br from-teal-50 via-white to-white text-teal-700",
  } as const;
  const ties = record.ties ?? 0;

  return (
    <article className={`rounded-card border p-4 shadow-[0_8px_22px_rgba(17,24,39,0.045)] ${colors[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">{title}</p>
          <p className="mt-2 text-[28px] leading-none font-semibold tabular-nums tracking-tight text-text-primary">
            {record.wins}–{record.losses}{ties ? `–${ties}` : ""}
          </p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-current/10">
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-current/10 pt-3">
        <p className="text-xs leading-5 text-text-secondary">{description}</p>
        <div className="shrink-0 text-right">
          <p className="text-lg font-semibold tabular-nums text-current">{recordPercentage(record)}</p>
          <p className="text-[9px] font-semibold tracking-wide text-text-secondary uppercase">Win rate</p>
        </div>
      </div>
    </article>
  );
}

function TeamRecordsDashboardView({ records }: { records: TeamRecordsDashboard }) {
  return (
    <section className="grid gap-4" aria-label="Team records dashboard">
      <div className="rounded-card border border-border bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 px-5 py-4 text-white shadow-sm">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-red-300 uppercase">Performance dashboard</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Team Records</h2>
            <p className="mt-1 text-sm text-slate-300">Team, player, doubles, and pressure-match performance.</p>
          </div>
          <p className="text-xs text-slate-300">Win rate uses decided wins and losses only.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <TeamRecordCard title="Team Record" description="Confirmed dual-match outcomes" record={records.team} icon={Trophy} tone="red" />
        <TeamRecordCard title="Player Record" description="All individual singles matches" record={records.players} icon={UserRound} tone="blue" />
        <TeamRecordCard title="Doubles Record" description="Each doubles match counted once" record={records.doubles} icon={UsersRound} tone="green" />
        <TeamRecordCard title="Three-Set Record" description="Matches with three recorded sets" record={records.threeSet} icon={RefreshCcw} tone="violet" />
        <TeamRecordCard title="Tiebreaker Record" description="Decided 7–6, 8–7, or by a match tiebreak" record={records.tiebreakers} icon={BadgePercent} tone="orange" />
        <TeamRecordCard title="Super Tiebreaker Record" description="Third-set match tiebreaks scored to 10+" record={records.superTiebreakers} icon={Activity} tone="teal" />
      </div>
    </section>
  );
}

function CompetitionsTable({
  rows,
  onEnter,
}: {
  rows: TeamCompetitionRow[];
  onEnter: (scheduleEventId: string, method: "paste" | "manual") => void;
}) {
  if (rows.length === 0) {
    return (
      <div className={cardClass}>
        <EmptyState
          title="No scheduled events"
          description="Competitive Schedule events (duals, tournaments, placeholders) appear here before results exist. Non-team / travel-only events are excluded."
        />
      </div>
    );
  }

  return (
    <section className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3 border-b border-border/70 px-1 pb-2">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-text-secondary uppercase">
            Schedule
          </p>
          <h2 className="text-base font-semibold text-text-primary">Events</h2>
        </div>
        <span className="text-sm tabular-nums text-text-secondary">{rows.length}</span>
      </div>
      <div className={`${cardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
            <thead className="border-b border-border/70 bg-app-background/40 text-[11px] font-semibold tracking-wide text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-center">Date</th>
                <th className="px-3 py-2">Opponent / Event</th>
                <th className="px-3 py-2">Site</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Schedule</th>
                <th className="px-3 py-2">Results</th>
                <th className="px-3 py-2">Score / Count</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {rows.map((row) => {
              const schedule = row.schedule;
              const dateDisplay = formatScheduleDateDisplay(schedule.startDate, schedule.endDate);
              const identity = resolveScheduleIdentity(schedule);
              const location =
                schedule.locationText?.trim() ||
                [schedule.venueName, schedule.city, schedule.state].filter(Boolean).join(", ") ||
                "—";
              const typeBadge = typeBadgeForEvent(schedule);
              const scoreLabel =
                row.matchFormat === "dual" || (!row.matchFormat && row.matchEvent?.eventType === "dual")
                  ? dualScoreSummary(row.matchEvent) ??
                    (row.matchEvent ? formatTeamScore(row.matchEvent) : "—")
                  : tournamentResultSummary(row.resultCount);

              return (
                <tr key={row.scheduleEventId} className="hover:bg-app-background/50">
                  <td className="px-3 py-2 text-center align-top">
                    <div className="inline-block min-w-[3.5rem] text-center leading-none">
                      <p className="text-[10px] font-semibold tracking-wide text-text-secondary">
                        {dateDisplay.month}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">
                        {dateDisplay.day}
                      </p>
                      <p className="mt-0.5 text-[9px] font-medium text-text-secondary">
                        {dateDisplay.weekday}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex min-w-[12rem] items-center gap-2">
                      <ScheduleIdentityMark identity={identity} />
                      <div className="min-w-0">
                        <Link
                          href={competitionRowHref(row)}
                          className="block truncate text-xs font-semibold text-text-primary hover:underline"
                        >
                          {displayOpponentOrEvent(schedule)}
                        </Link>
                        <p className="truncate text-[11px] text-text-secondary">
                          {schedule.itaRank != null ? `#${schedule.itaRank} · ` : ""}
                          {schedule.ncac
                            ? "NCAC"
                            : schedule.eventType === "tournament"
                              ? "Tournament"
                              : "Team Match"}
                        </p>
                      </div>
                    </div>
                    {row.incompletePlaceholder ? (
                      <p className="mt-0.5 text-[11px] text-amber-800">
                        Incomplete placeholder — confirm Team Match vs Tournament on Schedule
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-text-secondary">
                    <span className="flex items-center gap-1 font-medium text-text-primary">
                      {schedule.siteDesignation === "home" ? (
                        <Home className="h-3 w-3" aria-hidden />
                      ) : schedule.siteDesignation === "away" ? (
                        <Plane className="h-3 w-3" aria-hidden />
                      ) : (
                        <MapPin className="h-3 w-3" aria-hidden />
                      )}
                      {SITE_DESIGNATION_LABELS[schedule.siteDesignation]}
                    </span>
                    <span className="mt-0.5 block text-[11px]">{location}</span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-normal leading-none ${typeBadge.className}`}
                    >
                      {row.formatAmbiguous ? "Placeholder" : typeBadge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex rounded-control px-2 py-0.5 text-[11px] font-medium ${scheduleStatusBadgeClass(schedule.status)}`}
                    >
                      {SCHEDULE_STATUS_LABELS[schedule.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex rounded-control px-2 py-0.5 text-[11px] font-medium ${resultsStatusBadgeClass(row.resultsStatus)}`}
                    >
                      {RESULTS_STATUS_LABELS[row.resultsStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top text-xs font-semibold tabular-nums">
                    {row.matchFormat === "dual" && row.matchEvent?.teamOutcome
                      ? `${formatTeamOutcome(row.matchEvent.teamOutcome)} ${scoreLabel}`
                      : scoreLabel}
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <ResultsActionButton row={row} onEnter={onEnter} />
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-2 text-[11px] text-text-secondary">
          Events come from Schedule; results remain managed here. Open the Schedule event when its
          competition type needs to be confirmed.
        </p>
      </div>
    </section>
  );
}

function ResultsActionButton({
  row,
  onEnter,
}: {
  row: TeamCompetitionRow;
  onEnter: (scheduleEventId: string, method: "paste" | "manual") => void;
}) {
  if (row.action === "blocked") {
    return (
      <Link
        href={teamOperationsScheduleEventPath(row.scheduleEventId)}
        className="inline-flex h-8 items-center rounded-control border border-border px-2.5 text-xs font-semibold hover:bg-app-background"
        onClick={(e) => e.stopPropagation()}
      >
        {row.actionLabel}
      </Link>
    );
  }
  if (row.action === "view" && row.matchEvent) {
    return (
      <Link
        href={matchesEventPath(row.matchEvent.id)}
        className="inline-flex h-8 items-center rounded-control border border-border px-2.5 text-xs font-semibold hover:bg-app-background"
        onClick={(e) => e.stopPropagation()}
      >
        {row.actionLabel}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onEnter(row.scheduleEventId, "paste");
      }}
      className="inline-flex h-8 items-center rounded-control border border-border px-2.5 text-xs font-semibold hover:bg-app-background"
    >
      {row.actionLabel}
    </button>
  );
}

function UnlinkedResultsSection({ events }: { events: MatchEvent[] }) {
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Unlinked Results</h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          Legacy official results without a Schedule link. Link explicitly — nothing is assigned or
          deleted silently.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {events.map((event) => (
          <li key={event.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <Link
                href={matchesEventPath(event.id)}
                className="font-semibold text-text-primary hover:underline"
              >
                {eventDisplayTitle(event)}
              </Link>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                {event.eventType === "dual" ? "Dual" : "Tournament"} · {formatDate(event.startDate)}
                {event.scheduleUnlinkedReason ? ` · ${event.scheduleUnlinkedReason}` : ""}
              </p>
              <div className="mt-2">
                <LinkSchedulePanel matchEventId={event.id} />
              </div>
            </div>
            <Link
              href={matchesEventPath(event.id)}
              className="text-xs font-semibold text-[var(--module-accent)] hover:underline"
            >
              View Results
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

type RecordBreakdown = {
  overall: WinLossRecord;
  dual: WinLossRecord;
  tournament: WinLossRecord;
};

function aggregateRecordBreakdown(
  records: readonly (WinLossRecord & { dual: WinLossRecord; tournament: WinLossRecord })[],
): RecordBreakdown {
  return records.reduce<RecordBreakdown>(
    (totals, record) => ({
      overall: sumRecords(totals.overall, record),
      dual: sumRecords(totals.dual, record.dual),
      tournament: sumRecords(totals.tournament, record.tournament),
    }),
    { overall: EMPTY_RECORD(), dual: EMPTY_RECORD(), tournament: EMPTY_RECORD() },
  );
}

function winPercentage(record: WinLossRecord): string {
  const decided = record.wins + record.losses;
  return decided > 0 ? `${((record.wins / decided) * 100).toFixed(1)}%` : "—";
}

function RecordSummaryCards({
  totals,
  recordLabel,
  note,
}: {
  totals: RecordBreakdown;
  recordLabel: string;
  note?: string;
}) {
  const cards = [
    {
      label: `${recordLabel} record`,
      value: formatRecord(totals.overall),
      detail: note ?? `${totals.overall.wins + totals.overall.losses} decided matches`,
      icon: Trophy,
      tone: "border-red-200 bg-gradient-to-br from-red-50 to-surface text-red-700",
      iconTone: "bg-red-100 text-red-700",
    },
    {
      label: "Dual record",
      value: formatRecord(totals.dual),
      detail: `${winPercentage(totals.dual)} win rate`,
      icon: UsersRound,
      tone: "border-blue-200 bg-gradient-to-br from-blue-50 to-surface text-blue-700",
      iconTone: "bg-blue-100 text-blue-700",
    },
    {
      label: "Tournament record",
      value: formatRecord(totals.tournament),
      detail: `${winPercentage(totals.tournament)} win rate`,
      icon: Activity,
      tone: "border-violet-200 bg-gradient-to-br from-violet-50 to-surface text-violet-700",
      iconTone: "bg-violet-100 text-violet-700",
    },
    {
      label: "Overall win percentage",
      value: winPercentage(totals.overall),
      detail: `${totals.overall.wins} wins · ${totals.overall.losses} losses`,
      icon: BadgePercent,
      tone: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-surface text-emerald-700",
      iconTone: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={`${recordLabel} summary`}>
      {cards.map(({ label, value, detail, icon: Icon, tone, iconTone }) => (
        <article key={label} className={`rounded-card border p-4 shadow-sm ${tone}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
              <p className="mt-1 text-xs text-text-secondary">{detail}</p>
            </div>
            <span className={`rounded-full p-2 ${iconTone}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}

function RecordTableFooter({ label, totals }: { label: string; totals: RecordBreakdown }) {
  return (
    <tfoot className="border-t-2 border-border bg-app-background/70 font-semibold text-text-primary">
      <tr>
        <th scope="row" className="px-4 py-3 text-left text-xs uppercase tracking-wide">
          {label}
        </th>
        <td className="px-4 py-3 tabular-nums">{formatRecord(totals.overall)}</td>
        <td className="px-4 py-3 tabular-nums">{formatRecord(totals.dual)}</td>
        <td className="px-4 py-3 tabular-nums">{formatRecord(totals.tournament)}</td>
      </tr>
    </tfoot>
  );
}

function SinglesTable({
  records,
  roster,
  totals,
}: {
  records: ReturnType<typeof buildSinglesPlayerRecords>;
  roster: RosterPlayer[];
  totals: RecordBreakdown;
}) {
  if (records.length === 0) {
    return (
      <div className={cardClass}>
        <EmptyState title="No singles records" description="Import dual or tournament singles results." />
      </div>
    );
  }
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-app-background/60 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
            <tr>
              <th className="px-4 py-2.5">Player</th>
              <th className="px-4 py-2.5">Overall</th>
              <th className="px-4 py-2.5">Dual</th>
              <th className="px-4 py-2.5">Tournament</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((row) => (
              <tr key={row.playerId} className="hover:bg-app-background/50">
                <td className="px-4 py-3">
                  <Link
                    href={matchesPlayerPath(row.playerId)}
                    className="font-semibold hover:underline"
                  >
                    {playerNameFor(row.playerId, roster)}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatRecord(row)}</td>
                <td className="px-4 py-3 tabular-nums text-text-secondary">{formatRecord(row.dual)}</td>
                <td className="px-4 py-3 tabular-nums text-text-secondary">
                  {formatRecord(row.tournament)}
                </td>
              </tr>
            ))}
          </tbody>
          <RecordTableFooter label="Team totals" totals={totals} />
        </table>
      </div>
    </section>
  );
}

function DoublesPlayersTable({
  records,
  roster,
  totals,
}: {
  records: ReturnType<typeof buildDoublesPlayerRecords>;
  roster: RosterPlayer[];
  totals: RecordBreakdown;
}) {
  if (records.length === 0) {
    return (
      <div className={cardClass}>
        <EmptyState title="No doubles player records" description="Import doubles results to populate this tab." />
      </div>
    );
  }
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-app-background/60 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
            <tr>
              <th className="px-4 py-2.5">Player</th>
              <th className="px-4 py-2.5">Overall</th>
              <th className="px-4 py-2.5">Dual</th>
              <th className="px-4 py-2.5">Tournament</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((row) => (
              <tr key={row.playerId} className="hover:bg-app-background/50">
                <td className="px-4 py-3">
                  <Link
                    href={`${matchesPlayerPath(row.playerId)}?view=doubles`}
                    className="font-semibold hover:underline"
                  >
                    {playerNameFor(row.playerId, roster)}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatRecord(row)}</td>
                <td className="px-4 py-3 tabular-nums text-text-secondary">{formatRecord(row.dual)}</td>
                <td className="px-4 py-3 tabular-nums text-text-secondary">
                  {formatRecord(row.tournament)}
                </td>
              </tr>
            ))}
          </tbody>
          <RecordTableFooter label="Player-credit totals" totals={totals} />
        </table>
      </div>
      <p className="border-t border-border bg-app-background/35 px-4 py-2 text-[11px] text-text-secondary">
        Player-credit totals count a doubles result once for each Denison player in the partnership.
      </p>
    </section>
  );
}

function DoublesTeamsTable({
  records,
  roster,
  totals,
}: {
  records: ReturnType<typeof buildDoublesPairRecords>;
  roster: RosterPlayer[];
  totals: RecordBreakdown;
}) {
  if (records.length === 0) {
    return (
      <div className={cardClass}>
        <EmptyState title="No doubles teams" description="Partnerships appear after doubles results are saved." />
      </div>
    );
  }
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-app-background/60 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
            <tr>
              <th className="px-4 py-2.5">Partnership</th>
              <th className="px-4 py-2.5">Overall</th>
              <th className="px-4 py-2.5">Dual</th>
              <th className="px-4 py-2.5">Tournament</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((row) => (
              <tr key={row.pairKey} className="hover:bg-app-background/50">
                <td className="px-4 py-3">
                  <Link href={matchesPairPath(row.pairKey)} className="font-semibold hover:underline">
                    {pairDisplayName(row.playerAId, row.playerBId, roster)}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatRecord(row)}</td>
                <td className="px-4 py-3 tabular-nums text-text-secondary">{formatRecord(row.dual)}</td>
                <td className="px-4 py-3 tabular-nums text-text-secondary">
                  {formatRecord(row.tournament)}
                </td>
              </tr>
            ))}
          </tbody>
          <RecordTableFooter label="Team totals" totals={totals} />
        </table>
      </div>
    </section>
  );
}

function ResultsTable({
  results,
  events,
  roster,
  scheduleById,
}: {
  results: MatchResult[];
  events: MatchEvent[];
  roster: RosterPlayer[];
  scheduleById: Record<string, TeamScheduleEvent>;
}) {
  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  if (results.length === 0) {
    return (
      <div className={cardClass}>
        <EmptyState title="No results" description="Import or enter official match results." />
      </div>
    );
  }
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-app-background/60 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
            <tr>
              <th className="px-4 py-2.5">Event</th>
              <th className="px-4 py-2.5">Denison</th>
              <th className="px-4 py-2.5">Opponent</th>
              <th className="px-4 py-2.5">Score</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">W/L</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {results.map((result) => {
              const event = eventsById.get(result.eventId);
              const schedule =
                event?.scheduleEventId != null
                  ? scheduleById[event.scheduleEventId]
                  : undefined;
              const denison =
                result.discipline === "doubles"
                  ? pairDisplayName(
                      result.denisonPlayerAId ?? "",
                      result.denisonPlayerBId ?? "",
                      roster,
                    )
                  : playerNameFor(result.denisonPlayerAId, roster);
              const opponent = [result.opponentPlayerAName, result.opponentPlayerBName]
                .filter(Boolean)
                .join(" / ");
              const wl =
                result.winnerSide === "denison"
                  ? "W"
                  : result.winnerSide === "opponent"
                    ? "L"
                    : "—";
              return (
                <tr key={result.id} className="hover:bg-app-background/50">
                  <td className="px-4 py-3">
                    {event ? (
                      <Link
                        href={matchesEventPath(event.id)}
                        className="font-semibold hover:underline"
                      >
                        {eventDisplayTitle(event, schedule)}
                      </Link>
                    ) : (
                      "—"
                    )}
                    <p className="mt-0.5 text-[11px] text-text-secondary">
                      {result.discipline}
                      {result.roundLabel ? ` · ${result.roundLabel}` : ""}
                      {result.lineupPosition != null ? ` · #${result.lineupPosition}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">{denison}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {opponent || "—"}
                    {resolveMatchSchoolName(result.opponentSchool).name ? (
                      <span className="block text-[11px]">{resolveMatchSchoolName(result.opponentSchool).name}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{result.scoreText ?? "—"}</td>
                  <td className="px-4 py-3 capitalize text-text-secondary">{result.status}</td>
                  <td className="px-4 py-3 font-semibold">{wl}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteMatchResultButton resultId={result.id} eventId={result.eventId} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-2 text-[11px] text-text-secondary">
        Open an event to view, edit, or correct results. Records recalculate from saved results.
        Directory: <Link href={MATCHES_ROUTE} className="underline">Matches</Link>
      </p>
    </section>
  );
}
