"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type MouseEvent } from "react";
import { Plus } from "lucide-react";

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

import {
  buildDoublesPairRecords,
  buildDoublesPlayerRecords,
  buildOverallDoublesRecord,
  buildSinglesPlayerRecords,
  buildTeamSeasonRecords,
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
} from "../types";
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
        {tab === "team" ? (
          <label className="text-xs text-text-secondary">
            Competitions{" "}
            <select
              value={competitionFilter}
              onChange={(e) => setCompetitionFilter(e.target.value as CompetitionFilter)}
              className="ml-1 h-9 rounded-control border border-border bg-surface px-2 text-xs font-semibold"
            >
              <option value="all">All competitions</option>
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

      {tab === "team" ? (
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

      {tab === "players" ? (
        <SinglesTable records={singlesRecords} roster={roster} />
      ) : null}

      {tab === "doubles-players" ? (
        <section className="grid gap-3">
          <div className={`${cardClass} px-4 py-3 text-xs text-text-secondary`}>
            Overall doubles (once per match): {formatRecord(overallDoubles)}. Player rows credit each
            participant.
          </div>
          <DoublesPlayersTable records={doublesPlayerRecords} roster={roster} />
        </section>
      ) : null}

      {tab === "doubles-teams" ? (
        <DoublesTeamsTable records={doublesPairRecords} roster={roster} />
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
          title="No scheduled competitions"
          description="Competitive Schedule events (duals, tournaments, placeholders) appear here before results exist. Non-team / travel-only events are excluded."
        />
      </div>
    );
  }

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-app-background/60 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Opponent / Event</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Site / Location</th>
              <th className="px-4 py-2.5">Schedule</th>
              <th className="px-4 py-2.5">Results</th>
              <th className="px-4 py-2.5">Score / Count</th>
              <th className="px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const schedule = row.schedule;
              const dateLabel =
                schedule.startDate === schedule.endDate
                  ? formatDate(schedule.startDate)
                  : `${formatDate(schedule.startDate)} – ${formatDate(schedule.endDate)}`;
              const location =
                schedule.locationText?.trim() ||
                [schedule.venueName, schedule.city, schedule.state].filter(Boolean).join(", ") ||
                "—";
              const typeLabel = row.formatAmbiguous
                ? "Placeholder"
                : row.matchFormat === "dual"
                  ? "Dual"
                  : row.matchFormat === "tournament"
                    ? "Tournament"
                    : "—";
              const scoreLabel =
                row.matchFormat === "dual" || (!row.matchFormat && row.matchEvent?.eventType === "dual")
                  ? dualScoreSummary(row.matchEvent) ??
                    (row.matchEvent ? formatTeamScore(row.matchEvent) : "—")
                  : tournamentResultSummary(row.resultCount);

              return (
                <tr key={row.scheduleEventId} className="hover:bg-app-background/50">
                  <td className="px-4 py-3 tabular-nums text-text-secondary">{dateLabel}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={competitionRowHref(row)}
                      className="font-semibold text-text-primary hover:underline"
                    >
                      {displayOpponentOrEvent(schedule)}
                    </Link>
                    {row.incompletePlaceholder ? (
                      <p className="mt-0.5 text-[11px] text-amber-800">
                        Incomplete placeholder — confirm Team Match vs Tournament on Schedule
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{typeLabel}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    <span className="font-medium">
                      {SITE_DESIGNATION_LABELS[schedule.siteDesignation]}
                    </span>
                    <span className="mt-0.5 block text-[11px]">{location}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-control px-2 py-0.5 text-[11px] font-medium ${scheduleStatusBadgeClass(schedule.status)}`}
                    >
                      {SCHEDULE_STATUS_LABELS[schedule.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-control px-2 py-0.5 text-[11px] font-medium ${resultsStatusBadgeClass(row.resultsStatus)}`}
                    >
                      {RESULTS_STATUS_LABELS[row.resultsStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {row.matchFormat === "dual" && row.matchEvent?.teamOutcome
                      ? `${formatTeamOutcome(row.matchEvent.teamOutcome)} ${scoreLabel}`
                      : scoreLabel}
                  </td>
                  <td className="px-4 py-3">
                    <ResultsActionButton row={row} onEnter={onEnter} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-2 text-[11px] text-text-secondary">
        Derived from Schedule competitions — empty Matches containers are not created to fill this
        list. Open Schedule Event from a row’s action when type is blocked.
      </p>
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

function SinglesTable({
  records,
  roster,
}: {
  records: ReturnType<typeof buildSinglesPlayerRecords>;
  roster: RosterPlayer[];
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
        </table>
      </div>
    </section>
  );
}

function DoublesPlayersTable({
  records,
  roster,
}: {
  records: ReturnType<typeof buildDoublesPlayerRecords>;
  roster: RosterPlayer[];
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
        </table>
      </div>
    </section>
  );
}

function DoublesTeamsTable({
  records,
  roster,
}: {
  records: ReturnType<typeof buildDoublesPairRecords>;
  roster: RosterPlayer[];
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
