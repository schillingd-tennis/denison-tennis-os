"use client";

import { BarChart3, GraduationCap, LayoutGrid, List, ListOrdered } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { publishFoundSet } from "@/components/found-set";
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
import ViewToggle from "@/components/ViewToggle";

import type { RecruitDirectoryRow } from "../directory";
import { ADD_RECRUIT_BUTTON_CLASS, useAddRecruitDrawer } from "../useAddRecruitDrawer";
import {
  RECRUITING_FOUND_SET_COLUMNS,
  RECRUITING_FOUND_SET_FILENAME_BASE,
  RECRUITING_FOUND_SET_MODULE_KEY,
} from "../directoryColumns";
import { computeRecruitingDirectoryKpis } from "../directorySummary";
import {
  readStoredRecruitingDirectoryQuery,
  readStoredRecruitingDirectoryView,
  subscribeRecruitingDirectoryQuery,
  subscribeRecruitingDirectoryView,
  writeStoredRecruitingDirectoryQuery,
  writeStoredRecruitingDirectoryView,
  type RecruitingViewMode,
} from "../directorySessionState";
import {
  buildRecruitingFilterDefinitions,
  filterRecruitDirectoryRows,
  normalizeActiveRecruitingFilters,
  readServerActiveRecruitingFilters,
  readStoredActiveRecruitingFilters,
  subscribeRecruitingFilters,
  writeStoredActiveRecruitingFilters,
} from "../filters";
import RecruitCard from "./RecruitCard";
import RecruitCommitView from "./RecruitCommitView";
import RecruitList from "./RecruitList";
import RecruitMetricsView from "./RecruitMetricsView";
import RecruitRankView from "./RecruitRankView";
import RecruitingFilterControl from "./RecruitingFilterControl";
import RecruitingKpiRow from "./RecruitingKpiRow";

const RECRUITING_VIEW_OPTIONS = [
  { value: "cards" as const, label: "Cards", icon: LayoutGrid },
  { value: "list" as const, label: "List", icon: List },
  { value: "rank" as const, label: "Rank", icon: ListOrdered },
  { value: "commit" as const, label: "Commit", icon: GraduationCap },
  { value: "metrics" as const, label: "Metrics", icon: BarChart3 },
];

export default function RecruitingDirectory({
  rows,
  denisonCommits,
}: {
  rows: RecruitDirectoryRow[];
  denisonCommits: number;
}) {
  const openAddRecruitDrawer = useAddRecruitDrawer();
  const [liveRows, setLiveRows] = useState(rows);
  const [serverRows, setServerRows] = useState(rows);
  const persistLockRef = useRef(false);
  const pendingServerRowsRef = useRef<RecruitDirectoryRow[] | null>(null);
  if (rows !== serverRows) {
    setServerRows(rows);
    // Skip adopting server props while Rank Board persist is in flight —
    // mid-flight revalidate used to wipe optimistic coachRank/tier order.
    if (persistLockRef.current) {
      pendingServerRowsRef.current = rows;
    } else {
      setLiveRows(rows);
    }
  }
  const query = useSyncExternalStore(
    subscribeRecruitingDirectoryQuery,
    readStoredRecruitingDirectoryQuery,
    () => "",
  );
  const view = useSyncExternalStore(
    subscribeRecruitingDirectoryView,
    readStoredRecruitingDirectoryView,
    () => "list" as RecruitingViewMode,
  );
  const storedFilterIds = useSyncExternalStore(
    subscribeRecruitingFilters,
    readStoredActiveRecruitingFilters,
    readServerActiveRecruitingFilters,
  );

  const definitions = useMemo(() => buildRecruitingFilterDefinitions(liveRows), [liveRows]);
  const allowedIds = useMemo(() => definitions.map((definition) => definition.id), [definitions]);
  const activeFilterIds = useMemo(
    () => normalizeActiveRecruitingFilters(storedFilterIds, allowedIds),
    [storedFilterIds, allowedIds],
  );

  const filtered = useMemo(
    () => filterRecruitDirectoryRows(liveRows, { activeFilterIds, query, definitions }),
    [liveRows, activeFilterIds, query, definitions],
  );
  const kpis = useMemo(
    () => computeRecruitingDirectoryKpis(liveRows, denisonCommits),
    [liveRows, denisonCommits],
  );

  useEffect(() => {
    publishFoundSet({
      moduleKey: RECRUITING_FOUND_SET_MODULE_KEY,
      filenameBase: RECRUITING_FOUND_SET_FILENAME_BASE,
      rows: filtered,
      columns: RECRUITING_FOUND_SET_COLUMNS,
    });
  }, [filtered]);

  function handleFilterChange(next: string[]) {
    writeStoredActiveRecruitingFilters(normalizeActiveRecruitingFilters(next, allowedIds));
  }

  return (
    <ModulePageShell
      title="Recruiting"
      subtitle="Current recruits"
      actions={
        <button
          type="button"
          className={ADD_RECRUIT_BUTTON_CLASS}
          onClick={openAddRecruitDrawer}
        >
          + ADD RECRUIT
        </button>
      }
    >
      <DesktopOnlySummary>
        <RecruitingKpiRow kpis={kpis} />
      </DesktopOnlySummary>

      <MobileDirectorySearchRegion
        toolbar={
          <DirectoryToolbar
            search={
              <SearchInput
                value={query}
                onChange={writeStoredRecruitingDirectoryQuery}
                placeholder="Search by name, school, or recruiting fields"
                aria-label="Search recruits"
              />
            }
            views={
              <ViewToggle
                value={view}
                onChange={writeStoredRecruitingDirectoryView}
                options={RECRUITING_VIEW_OPTIONS}
                ariaLabel="Change recruiting view"
              />
            }
            filters={
              <RecruitingFilterControl
                value={activeFilterIds}
                onChange={handleFilterChange}
                definitions={definitions}
                renderMobileTrigger={(filtersButton) => (
                  <MobileDirectoryControls>
                    <MobileViewSelector
                      value={view}
                      onChange={writeStoredRecruitingDirectoryView}
                      options={RECRUITING_VIEW_OPTIONS}
                      ariaLabel="Change recruiting view"
                    />
                    {filtersButton}
                  </MobileDirectoryControls>
                )}
              />
            }
          />
        }
      >
        {/*
          Shared content stacking context for Cards / List / Rank / Commit / Metrics.
          `isolate` + `z-0` traps descendant z-index (card z-10 links, sticky
          table headers) so the body-portaled filter menu always paints above.
        */}
        {filtered.length === 0 &&
        (view === "cards" || view === "list" || view === "metrics") ? (
          <EmptyState
            title="No recruits found"
            description="Try a different search term or filter."
          />
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((row) => (
              <RecruitCard
                key={row.person.id}
                row={row}
                cohort={liveRows}
                onCohortChange={setLiveRows}
              />
            ))}
          </div>
        ) : view === "rank" ? (
          <RecruitRankView
            rows={liveRows}
            filteredRows={filtered}
            activeFilterIds={activeFilterIds}
            onCohortChange={setLiveRows}
            onPersistLockChange={(locked) => {
              persistLockRef.current = locked;
              if (!locked) {
                // Drop mid-flight RSC snapshots. Applying them here used to
                // overwrite the action-reconciled tier/order after a successful
                // save (stale props → recruit snaps back to old Tier).
                pendingServerRowsRef.current = null;
              }
            }}
          />
        ) : view === "commit" ? (
          <RecruitCommitView
            filteredRows={filtered}
            cohort={liveRows}
            activeFilterIds={activeFilterIds}
            onCohortChange={setLiveRows}
          />
        ) : view === "metrics" ? (
          <RecruitMetricsView rows={filtered} />
        ) : (
          <RecruitList
            rows={filtered}
            cohort={liveRows}
            activeFilterIds={activeFilterIds}
            onCohortChange={setLiveRows}
          />
        )}
      </MobileDirectorySearchRegion>
    </ModulePageShell>
  );
}
