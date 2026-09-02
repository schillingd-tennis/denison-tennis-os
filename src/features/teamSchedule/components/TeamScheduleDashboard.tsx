"use client";

import { Download, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import EmptyState from "@/components/EmptyState";
import ModulePageShell from "@/components/ModulePageShell";
import {
  DesktopOnlySummary,
  DirectoryToolbar,
  MobileDirectoryControls,
  MobileDirectorySearchRegion,
  MobileViewSelector,
} from "@/components/mobile-dashboard";
import SearchInput from "@/components/SearchInput";
import { SegmentedControl } from "@/components/toolbar";
import { useDrawerManager } from "@/components/workspace-drawer";
import { TEAM_OPERATIONS_ROUTE } from "@/lib/module-routes";

import { duplicateScheduleEventAction } from "../actions";
import {
  readStoredScheduleDirectoryQuery,
  readStoredScheduleDirectoryView,
  subscribeScheduleDirectoryQuery,
  subscribeScheduleDirectoryView,
  writeStoredScheduleDirectoryQuery,
  writeStoredScheduleDirectoryView,
  type ScheduleViewMode,
} from "../directorySessionState";
import { scheduleEventsToCsv } from "../display";
import {
  buildScheduleFilterDefinitions,
  filterScheduleEvents,
  normalizeActiveScheduleFilters,
  readServerActiveScheduleFilters,
  readStoredActiveScheduleFilters,
  subscribeScheduleFilters,
  writeStoredActiveScheduleFilters,
} from "../filters";
import { computeScheduleKpis } from "../metrics";
import { sortScheduleEvents } from "../sorting";
import { scheduleDrawerTitle } from "../schoolIdentity";
import { formatSeasonLabel, type TeamScheduleEvent } from "../types";
import { SCHEDULE_VIEW_OPTIONS } from "../viewOptions";
import { scheduleViewContextLabel } from "../views";
import ScheduleDeleteConfirm from "./ScheduleDeleteConfirm";
import ScheduleFilterControl from "./ScheduleFilterControl";
import ScheduleForm from "./ScheduleForm";
import ScheduleSummaryCards from "./ScheduleSummaryCards";
import ScheduleTable from "./ScheduleTable";

const ADD_MATCH_BUTTON_CLASS =
  "inline-flex h-11 shrink-0 items-center justify-center rounded-control bg-denison-red px-5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_18px_rgba(200,16,46,0.28)] transition-opacity hover:opacity-90";

export default function TeamScheduleDashboard({
  events: initialEvents,
  seasonYears,
  initialSeasonYear,
  loadError = null,
}: {
  events: TeamScheduleEvent[];
  seasonYears: number[];
  initialSeasonYear: number;
  loadError?: string | null;
}) {
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [events, setEvents] = useState(initialEvents);
  const [serverEvents, setServerEvents] = useState(initialEvents);
  const [seasonYear, setSeasonYear] = useState(initialSeasonYear);

  if (initialEvents !== serverEvents) {
    setServerEvents(initialEvents);
    setEvents(initialEvents);
  }

  const query = useSyncExternalStore(
    subscribeScheduleDirectoryQuery,
    readStoredScheduleDirectoryQuery,
    () => "",
  );
  const view = useSyncExternalStore(
    subscribeScheduleDirectoryView,
    readStoredScheduleDirectoryView,
    () => "all" as ScheduleViewMode,
  );
  const storedFilterIds = useSyncExternalStore(
    subscribeScheduleFilters,
    readStoredActiveScheduleFilters,
    readServerActiveScheduleFilters,
  );

  const seasonEvents = useMemo(
    () => events.filter((event) => event.seasonYear === seasonYear),
    [events, seasonYear],
  );

  const definitions = useMemo(() => buildScheduleFilterDefinitions(), []);
  const allowedIds = useMemo(() => definitions.map((definition) => definition.id), [definitions]);
  const activeFilterIds = useMemo(
    () => normalizeActiveScheduleFilters(storedFilterIds, allowedIds),
    [storedFilterIds, allowedIds],
  );

  const filtered = useMemo(() => {
    const narrowed = filterScheduleEvents(seasonEvents, {
      activeFilterIds,
      query,
      definitions,
      view,
    });
    return sortScheduleEvents(narrowed);
  }, [seasonEvents, activeFilterIds, query, definitions, view]);

  const kpis = useMemo(() => computeScheduleKpis(seasonEvents), [seasonEvents]);

  function handleFilterChange(next: string[]) {
    writeStoredActiveScheduleFilters(normalizeActiveScheduleFilters(next, allowedIds));
  }

  function upsert(saved: TeamScheduleEvent) {
    setEvents((current) => {
      const exists = current.some((row) => row.id === saved.id);
      return exists ? current.map((row) => (row.id === saved.id ? saved : row)) : [...current, saved];
    });
  }

  function remove(id: string) {
    setEvents((current) => current.filter((row) => row.id !== id));
  }

  function openForm(event?: TeamScheduleEvent) {
    openDrawer({
      id: `schedule-form-${event?.id ?? "new"}`,
      title: scheduleDrawerTitle(event),
      subtitle: "Team Operations · Schedule",
      hideFooter: true,
      content: (
        <ScheduleForm
          event={event}
          seasonYear={seasonYear}
          onCancel={closeDrawer}
          onSaved={(saved) => {
            upsert(saved);
            closeDrawer();
          }}
        />
      ),
    });
  }

  function openDelete(event: TeamScheduleEvent) {
    openDrawer({
      id: `schedule-delete-${event.id}`,
      title: "Delete Match",
      subtitle: "Team Operations · Schedule",
      hideFooter: true,
      content: (
        <ScheduleDeleteConfirm
          event={event}
          onCancelled={closeDrawer}
          onDeleted={(id) => {
            remove(id);
            closeDrawer();
          }}
        />
      ),
    });
  }

  async function duplicate(event: TeamScheduleEvent) {
    const result = await duplicateScheduleEventAction(event);
    if (result.success) upsert(result.event);
  }

  function exportCsv() {
    const csv = scheduleEventsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `denison-schedule-${seasonYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printView() {
    window.print();
  }

  const seasonOptions = seasonYears.length > 0 ? seasonYears : [seasonYear];
  const viewLabel = scheduleViewContextLabel(view);
  const filtersActive = activeFilterIds.length > 0 || query.trim().length > 0 || view !== "all";

  return (
    <ModulePageShell
      title="Team Match Schedule"
      subtitle="View and manage all team matches and competition events for the upcoming season."
      actions={
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary">
            Season
            <select
              className="h-9 rounded-control border border-border bg-surface px-2 text-xs font-semibold text-text-primary"
              value={seasonYear}
              onChange={(e) => setSeasonYear(Number(e.target.value))}
            >
              {seasonOptions.map((year) => (
                <option key={year} value={year}>
                  {formatSeasonLabel(year)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-xs font-semibold"
            onClick={exportCsv}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-xs font-semibold"
            onClick={printView}
          >
            <Printer className="h-3.5 w-3.5" />
            Print View
          </button>
          <button type="button" className={ADD_MATCH_BUTTON_CLASS} onClick={() => openForm()}>
            <Plus className="mr-1.5 h-4 w-4" strokeWidth={2} />
            Add Match
          </button>
        </div>
      }
    >
      <nav className="text-xs text-text-secondary print:hidden" aria-label="Breadcrumb">
        <Link href={TEAM_OPERATIONS_ROUTE} className="hover:text-text-primary">
          Team Operations
        </Link>
        <span className="mx-1.5">›</span>
        <span className="text-text-primary">Schedule</span>
      </nav>

      {loadError ? (
        <p className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{loadError}</p>
      ) : null}

      <DesktopOnlySummary>
        <ScheduleSummaryCards kpis={kpis} />
      </DesktopOnlySummary>

      <MobileDirectorySearchRegion
        toolbar={
          <DirectoryToolbar
            search={
              <SearchInput
                value={query}
                onChange={writeStoredScheduleDirectoryQuery}
                placeholder="Search matches…"
                aria-label="Search schedule matches"
              />
            }
            views={
              <div className="max-w-full overflow-x-auto">
                <SegmentedControl
                  value={view}
                  onChange={writeStoredScheduleDirectoryView}
                  options={[...SCHEDULE_VIEW_OPTIONS]}
                  ariaLabel="Change schedule view"
                  equalWidth={false}
                />
              </div>
            }
            filters={
              <ScheduleFilterControl
                value={activeFilterIds}
                onChange={handleFilterChange}
                definitions={definitions}
                renderMobileTrigger={(filtersButton) => (
                  <MobileDirectoryControls>
                    <MobileViewSelector
                      value={view}
                      onChange={writeStoredScheduleDirectoryView}
                      options={[...SCHEDULE_VIEW_OPTIONS]}
                      ariaLabel="Change schedule view"
                    />
                    {filtersButton}
                    <button type="button" className={ADD_MATCH_BUTTON_CLASS} onClick={() => openForm()}>
                      Add Match
                    </button>
                  </MobileDirectoryControls>
                )}
              />
            }
          />
        }
      >
        <div className="isolate z-0 flex flex-col gap-3">
          <p className="text-[11px] font-medium tracking-wide text-text-secondary uppercase print:hidden">
            {viewLabel} · {formatSeasonLabel(seasonYear)}
          </p>

          {filtered.length === 0 ? (
            <EmptyState
              title="No matches found"
              description={
                filtersActive
                  ? "No matches match the current search or filters."
                  : "Try a different search term or filter."
              }
            />
          ) : (
            <ScheduleTable
              events={filtered}
              allEvents={seasonEvents}
              onEdit={openForm}
              onDuplicate={duplicate}
              onDelete={openDelete}
              onEventUpdated={upsert}
            />
          )}
        </div>
      </MobileDirectorySearchRegion>
    </ModulePageShell>
  );
}
