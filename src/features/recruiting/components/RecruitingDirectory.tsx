"use client";

import { BarChart3, GraduationCap, LayoutGrid, List, ListOrdered } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { publishFoundSet } from "@/components/found-set";
import EmptyState from "@/components/EmptyState";
import ModulePageShell from "@/components/ModulePageShell";
import {
  DesktopOnlySummary,
  MobileViewSelector,
} from "@/components/mobile-dashboard";
import SearchInput from "@/components/SearchInput";
import ViewToggle from "@/components/ViewToggle";
import { useDrawerManager } from "@/components/workspace-drawer";
import { ROLE_KEYS } from "@/features/lookups/seed";
import AddPersonFlow from "@/features/people/components/AddPersonFlow";

import type { RecruitDirectoryRow } from "../directory";
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
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [liveRows, setLiveRows] = useState(rows);
  const [serverRows, setServerRows] = useState(rows);
  if (rows !== serverRows) {
    setServerRows(rows);
    setLiveRows(rows);
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

  function handleCreated(personId: string, intent: "stay" | "open" = "stay") {
    closeDrawer();
    if (intent === "open") {
      router.push(`/recruiting/${personId}`);
      return;
    }
    router.refresh();
  }

  function openAddRecruitDrawer() {
    openDrawer({
      id: "recruiting-add-recruit",
      title: "Add Recruit",
      subtitle: "Recruiting",
      hideFooter: true,
      content: (
        <AddPersonFlow
          roleKey={ROLE_KEYS.recruit}
          description="Creates a Person with role Recruit and a Recruit Profile. Required: first name, last name, and class year. More recruiting details can be edited after opening the record."
          submitLabel="Create Recruit"
          onCancel={() => closeDrawer()}
          onSuccess={handleCreated}
        />
      ),
    });
  }

  return (
    <ModulePageShell
      title="Recruiting"
      subtitle="Current recruits"
      actions={
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-control bg-denison-red px-5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_18px_rgba(200,16,46,0.28)] transition-opacity hover:opacity-90"
          onClick={openAddRecruitDrawer}
        >
          + ADD RECRUIT
        </button>
      }
    >
      <DesktopOnlySummary>
        <RecruitingKpiRow kpis={kpis} />
      </DesktopOnlySummary>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 sm:max-w-xl">
            <SearchInput
              value={query}
              onChange={writeStoredRecruitingDirectoryQuery}
              placeholder="Search by name, school, or recruiting fields"
            />
          </div>
          <div className="sm:ml-auto">
            <MobileViewSelector
              value={view}
              onChange={writeStoredRecruitingDirectoryView}
              options={RECRUITING_VIEW_OPTIONS}
              ariaLabel="Change recruiting view"
            />
            <div className="hidden md:block">
              <ViewToggle
                value={view}
                onChange={writeStoredRecruitingDirectoryView}
                options={RECRUITING_VIEW_OPTIONS}
                ariaLabel="Change recruiting view"
              />
            </div>
          </div>
        </div>
        <RecruitingFilterControl
          value={activeFilterIds}
          onChange={handleFilterChange}
          definitions={definitions}
        />
      </div>

      {/*
        Shared content stacking context for Cards / List / Rank / Commit / Metrics.
        `isolate` + `z-0` traps descendant z-index (card z-10 links, sticky
        table headers) so the body-portaled filter menu always paints above.
      */}
      <div data-recruiting-content="" className="relative z-0 isolate">
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
      </div>
    </ModulePageShell>
  );
}
