"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ClipboardList, History, ListChecks } from "lucide-react";

import {
  AdaptiveWorkspace,
  type AdaptiveWorkspaceDefinition,
} from "@/components/adaptive-workspace";
import { MobileWorkspaceSelector } from "@/components/mobile-workspace";
import {
  PersonWorkspaceDesktopSplit,
  PersonWorkspaceMobilePane,
  PersonWorkspaceShell,
} from "@/components/person-workspace-shell";
import { formatDate } from "@/lib/formatting";
import {
  MATCHES_ROUTE,
  matchesEventPath,
  matchesImportPath,
  teamOperationsScheduleEventPath,
} from "@/lib/module-routes";

import type { TeamScheduleEvent } from "@/features/teamSchedule/types";
import {
  SCHEDULE_EVENT_TYPE_LABELS,
  displayOpponentOrEvent,
} from "@/features/teamSchedule/types";

import {
  markMatchResultsCompleteAction,
  reopenMatchResultsEntryAction,
} from "../actions";
import { resolveMatchSchoolName } from "../schoolNames";
import {
  eventDisplayTitle,
  formatTeamOutcome,
  formatTeamScore,
  pairDisplayName,
  playerNameFor,
} from "../display";
import { resolveMatchEventDisplay } from "../scheduleLink";
import { hasResultsEntryWork } from "../teamCompetitions";
import type { MatchEvent, MatchImportBatch, MatchResult, RosterPlayer } from "../types";
import {
  parseMatchEventWorkspaceId,
  type MatchEventWorkspaceId,
} from "../workspaces";
import ImportBoxScoreFlow from "./ImportBoxScoreFlow";
import LinkSchedulePanel from "./LinkSchedulePanel";
import ManualResultsEntry from "./ManualResultsEntry";
import DeleteMatchResultButton from "./DeleteMatchResultButton";

export default function MatchEventWorkspace({
  event: initialEvent,
  results,
  imports,
  roster,
  schedule = null,
  initialWorkspace = "overview",
  backHref = MATCHES_ROUTE,
}: {
  event: MatchEvent;
  results: MatchResult[];
  imports: MatchImportBatch[];
  roster: RosterPlayer[];
  schedule?: TeamScheduleEvent | null;
  initialWorkspace?: MatchEventWorkspaceId;
  backHref?: string;
}) {
  const router = useRouter();
  const [event, setEvent] = useState(initialEvent);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(initialWorkspace);
  const [entryOpen, setEntryOpen] = useState(false);
  const [manualInline, setManualInline] = useState(false);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const display = resolveMatchEventDisplay(event, schedule);

  if (initialEvent.id !== event.id) {
    setEvent(initialEvent);
  }

  function selectWorkspace(id: string) {
    setActiveWorkspaceId(id);
    const workspace = parseMatchEventWorkspaceId(id);
    router.replace(`${matchesEventPath(event.id)}?workspace=${workspace}`, { scroll: false });
  }

  function markComplete() {
    setActionError(null);
    startTransition(async () => {
      const result = await markMatchResultsCompleteAction(event.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setEvent(result.event);
      router.refresh();
    });
  }

  function reopen() {
    setActionError(null);
    startTransition(async () => {
      const result = await reopenMatchResultsEntryAction(event.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setEvent(result.event);
      router.refresh();
    });
  }

  const navItems = [
    {
      id: "overview",
      title: "Overview",
      icon: ClipboardList,
      descriptor: event.eventType === "dual" ? formatTeamScore(event) : "Tournament",
    },
    {
      id: "results",
      title: "Results",
      icon: ListChecks,
      descriptor: String(results.length),
    },
    {
      id: "import-history",
      title: "Import history",
      icon: History,
      descriptor: String(imports.length),
    },
  ];

  const resolvedId = navItems.some((item) => item.id === activeWorkspaceId)
    ? activeWorkspaceId
    : "overview";

  const adaptiveWorkspaces: AdaptiveWorkspaceDefinition[] = [
    {
      id: "overview",
      title: "Overview",
      subtitle: "Identity, score, and schedule link",
      content: (
        <OverviewSection
          event={event}
          results={results}
          schedule={schedule}
          display={display}
          pending={pending}
          actionError={actionError}
          onMarkComplete={markComplete}
          onReopen={reopen}
          onContinue={() => {
            if (event.scheduleEventId) setEntryOpen(true);
            else setManualInline(true);
          }}
        />
      ),
    },
    {
      id: "results",
      title: "Results",
      subtitle: "Official match results",
      content: (
        <div className="grid gap-4">
          <ResultsSection event={event} results={results} roster={roster} />
          {schedule && manualInline ? (
            <div className="border-t border-border p-4">
              <ManualResultsEntry
                roster={roster}
                schedule={schedule}
                onSaved={() => {
                  setManualInline(false);
                  router.refresh();
                }}
                onCancel={() => setManualInline(false)}
              />
            </div>
          ) : schedule ? (
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => setManualInline(true)}
                className="h-9 rounded-control border border-border px-3 text-sm font-semibold"
              >
                Add result manually
              </button>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "import-history",
      title: "Import history",
      subtitle: "Original paste and draft provenance",
      content: <ImportHistorySection imports={imports} />,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 max-md:min-w-0 max-md:overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={backHref}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back
        </Link>
        {event.scheduleEventId ? (
          <button
            type="button"
            onClick={() => setEntryOpen(true)}
            className="h-9 rounded-control bg-[var(--module-accent)] px-3 text-xs font-semibold text-white"
          >
            {event.resultsMarkedCompleteAt ? "Add / correct results" : "Continue Entry"}
          </button>
        ) : null}
      </div>

      <div>
        <p className="text-xs font-medium tracking-wide text-text-secondary uppercase">
          {event.eventType === "dual" ? "Dual match" : "Tournament"}
          {!event.scheduleEventId ? " · Unlinked" : ""}
          {event.resultsMarkedCompleteAt ? " · Results complete" : " · Results entry open"}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-text-primary">
          {eventDisplayTitle(event, schedule)}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {formatDate(display.startDate)}
          {display.locationText ? ` · ${display.locationText}` : ""}
          {event.eventType === "dual"
            ? ` · ${formatTeamOutcome(event.teamOutcome)} ${formatTeamScore(event)}`
            : " · Individual results"}
          {display.fromSchedule ? " · from Schedule" : ""}
        </p>
        {event.scheduleEventId ? (
          <p className="mt-2 text-sm">
            <Link
              href={teamOperationsScheduleEventPath(event.scheduleEventId)}
              className="font-medium text-[var(--module-accent)] hover:underline"
            >
              Open Schedule Event
            </Link>
            {schedule ? (
              <span className="ml-2 text-xs text-text-secondary">
                {SCHEDULE_EVENT_TYPE_LABELS[schedule.eventType]} ·{" "}
                {displayOpponentOrEvent(schedule)}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      <PersonWorkspaceShell
        mobile={
          <PersonWorkspaceMobilePane>
            <MobileWorkspaceSelector
              items={navItems.map((item) => ({
                id: item.id,
                title: item.title,
                icon: item.icon,
                lines: item.descriptor ? [item.descriptor] : [],
              }))}
              activeId={resolvedId}
              onSelect={selectWorkspace}
            />
            <AdaptiveWorkspace activeId={resolvedId} workspaces={adaptiveWorkspaces} />
          </PersonWorkspaceMobilePane>
        }
        desktop={
          <PersonWorkspaceDesktopSplit
            nav={
              <nav aria-label="Event workspaces" className="grid gap-1 p-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectWorkspace(item.id)}
                      aria-current={resolvedId === item.id ? "page" : undefined}
                      className={`flex items-center justify-between gap-2 rounded-control px-3 py-2 text-left text-sm ${
                        resolvedId === item.id
                          ? "bg-[var(--module-accent)] text-white"
                          : "text-text-secondary hover:bg-app-background hover:text-text-primary"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 font-medium">
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                        {item.title}
                      </span>
                      <span className="text-xs opacity-80">{item.descriptor}</span>
                    </button>
                  );
                })}
              </nav>
            }
            content={
              <AdaptiveWorkspace
                activeId={resolvedId}
                workspaces={adaptiveWorkspaces}
                framed={false}
              />
            }
          />
        }
      />

      {entryOpen && event.scheduleEventId ? (
        <ImportBoxScoreFlow
          roster={roster}
          seasonYear={event.seasonYear}
          initialScheduleEventId={event.scheduleEventId}
          onClose={() => setEntryOpen(false)}
          onSaved={() => {
            setEntryOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function OverviewSection({
  event,
  results,
  schedule: _schedule,
  display,
  pending,
  actionError,
  onMarkComplete,
  onReopen,
  onContinue,
}: {
  event: MatchEvent;
  results: MatchResult[];
  schedule: TeamScheduleEvent | null;
  display: ReturnType<typeof resolveMatchEventDisplay>;
  pending: boolean;
  actionError: string | null;
  onMarkComplete: () => void;
  onReopen: () => void;
  onContinue: () => void;
}) {
  void _schedule;
  const canMarkComplete =
    !event.resultsMarkedCompleteAt && hasResultsEntryWork(event, results.length);

  return (
    <div className="grid gap-4 p-4">
      <section>
        <h2 className="text-sm font-semibold">Summary</h2>
        {display.fromSchedule ? (
          <p className="mt-1 text-xs text-text-secondary">
            Shared event details from linked Schedule (edits there reflect here).
          </p>
        ) : null}
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-text-secondary">Season</dt>
            <dd>{display.seasonYear}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-secondary">Event status</dt>
            <dd className="capitalize">{event.status}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-secondary">Results entry</dt>
            <dd>
              {event.resultsMarkedCompleteAt
                ? `Complete (${formatDate(event.resultsMarkedCompleteAt)})`
                : hasResultsEntryWork(event, results.length)
                  ? "Partial"
                  : "Awaiting"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-secondary">Site</dt>
            <dd className="capitalize">{display.site ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-secondary">Venue</dt>
            <dd>{display.venueName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-secondary">Location</dt>
            <dd>{display.locationText ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-secondary">Dates</dt>
            <dd>
              {formatDate(display.startDate)}
              {display.endDate && display.endDate !== display.startDate
                ? ` – ${formatDate(display.endDate)}`
                : ""}
            </dd>
          </div>
          {event.eventType === "dual" ? (
            <>
              <div>
                <dt className="text-xs font-medium text-text-secondary">Reported score</dt>
                <dd className="tabular-nums">
                  {event.reportedTeamScoreDenison ?? "—"}–{event.reportedTeamScoreOpponent ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-secondary">Calculated score</dt>
                <dd className="tabular-nums">
                  {event.calculatedTeamScoreDenison ?? "—"}–{event.calculatedTeamScoreOpponent ?? "—"}
                  {event.teamScoreDiscrepancy ? " (discrepancy)" : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-secondary">Scoring format</dt>
                <dd>{event.scoringFormat ?? "—"}</dd>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-text-secondary">Team W/L</dt>
              <dd>Not applicable — tournament individual results only ({results.length})</dd>
            </div>
          )}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {canMarkComplete ? (
            <button
              type="button"
              disabled={pending}
              onClick={onMarkComplete}
              className="h-9 rounded-control bg-[var(--module-accent)] px-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              Mark results complete
            </button>
          ) : null}
          {event.resultsMarkedCompleteAt ? (
            <button
              type="button"
              disabled={pending}
              onClick={onReopen}
              className="h-9 rounded-control border border-border px-3 text-xs font-semibold disabled:opacity-50"
            >
              Reopen for corrections
            </button>
          ) : (
            <button
              type="button"
              onClick={onContinue}
              className="h-9 rounded-control border border-border px-3 text-xs font-semibold"
            >
              Continue Entry
            </button>
          )}
          {event.scheduleEventId ? (
            <Link
              href={matchesImportPath(event.scheduleEventId)}
              className="inline-flex h-9 items-center rounded-control border border-border px-3 text-xs font-semibold"
            >
              Shared entry flow
            </Link>
          ) : null}
        </div>
        {actionError ? <p className="mt-2 text-sm text-red-700">{actionError}</p> : null}
        <p className="mt-2 text-[11px] text-text-secondary">
          Mark complete is admin entry status — it does not invent scores. Dual team outcomes and
          confirmed individual results still count while Partial.
        </p>

        {event.scheduleEventId ? (
          <p className="mt-4 text-sm">
            <Link
              href={teamOperationsScheduleEventPath(event.scheduleEventId)}
              className="font-medium text-[var(--module-accent)] hover:underline"
            >
              Open Schedule Event
            </Link>
            <span className="ml-2 text-xs text-text-secondary">
              Schedule owns identity; Matches owns official results.
            </span>
          </p>
        ) : (
          <LinkSchedulePanel matchEventId={event.id} />
        )}
        {event.scheduleUnlinkedReason === "schedule_deleted" ? (
          <p className="mt-3 text-xs text-amber-800">
            Linked Schedule event was deleted. Official results were preserved (not cascade-deleted).
            Snapshot identity is shown until you link another Schedule event.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ResultsSection({
  event,
  results,
  roster,
}: {
  event: MatchEvent;
  results: MatchResult[];
  roster: RosterPlayer[];
}) {
  if (results.length === 0) {
    return <p className="p-4 text-sm text-text-secondary">No results saved for this event.</p>;
  }

  const singles = results.filter((r) => r.discipline === "singles");
  const doubles = results.filter((r) => r.discipline === "doubles");

  return (
    <div className="grid gap-4 p-4">
      {event.eventType === "dual" ? (
        <>
          <ResultGroup title="Doubles" rows={doubles} roster={roster} />
          <ResultGroup title="Singles" rows={singles} roster={roster} />
        </>
      ) : (
        <TournamentGroupedResults results={results} roster={roster} />
      )}
    </div>
  );
}

function ResultGroup({
  title,
  rows,
  roster,
}: {
  title: string;
  rows: MatchResult[];
  roster: RosterPlayer[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-card border border-border">
      <h2 className="border-b border-border px-4 py-2.5 text-sm font-semibold">{title}</h2>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[4rem_1fr_1fr_auto_auto_auto]">
            <span className="text-text-secondary">
              {row.lineupPosition != null ? `#${row.lineupPosition}` : row.roundLabel ?? "—"}
            </span>
            <span>
              {row.discipline === "doubles"
                ? pairDisplayName(row.denisonPlayerAId ?? "", row.denisonPlayerBId ?? "", roster)
                : playerNameFor(row.denisonPlayerAId, roster)}
            </span>
            <span className="text-text-secondary">
              {[row.opponentPlayerAName, row.opponentPlayerBName].filter(Boolean).join(" / ") || "—"}
              {resolveMatchSchoolName(row.opponentSchool).name
                ? ` (${resolveMatchSchoolName(row.opponentSchool).name})`
                : ""}
            </span>
            <span className="tabular-nums">{row.scoreText ?? "—"}</span>
            <span className="font-semibold">
              {row.winnerSide === "denison" ? "W" : row.winnerSide === "opponent" ? "L" : "—"}
            </span>
            <DeleteMatchResultButton resultId={row.id} eventId={row.eventId} />
            {row.sourceExcerpt ? (
              <p className="text-[11px] text-text-secondary sm:col-span-6">{row.sourceExcerpt}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TournamentGroupedResults({
  results,
  roster,
}: {
  results: MatchResult[];
  roster: RosterPlayer[];
}) {
  const groups = new Map<string, MatchResult[]>();
  for (const row of results) {
    const key = [row.drawName, row.flightName, row.roundLabel].filter(Boolean).join(" · ") || "Results";
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return (
    <>
      {[...groups.entries()].map(([title, rows]) => (
        <ResultGroup key={title} title={title} rows={rows} roster={roster} />
      ))}
    </>
  );
}

function ImportHistorySection({ imports }: { imports: MatchImportBatch[] }) {
  if (imports.length === 0) {
    return <p className="p-4 text-sm text-text-secondary">No import batches linked to this event.</p>;
  }
  return (
    <ul className="grid gap-3 p-4">
      {imports.map((batch) => (
        <li key={batch.id} className="rounded-card border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold capitalize">{batch.status}</p>
            <p className="text-xs text-text-secondary">{formatDate(batch.createdAt)}</p>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {batch.detectionMethod} · {batch.eventType ?? "type unset"}
          </p>
          {batch.errorMessage ? (
            <p className="mt-2 text-xs text-red-700">{batch.errorMessage}</p>
          ) : null}
          <pre className="mt-3 max-h-48 overflow-auto rounded-control bg-app-background p-3 text-[11px] whitespace-pre-wrap">
            {batch.sourceText}
          </pre>
        </li>
      ))}
    </ul>
  );
}
