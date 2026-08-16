"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { publishFoundSet } from "@/components/found-set";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import { Toolbar } from "@/components/toolbar";
import ViewToggle, { type ViewMode } from "@/components/ViewToggle";
import { useDrawerManager } from "@/components/workspace-drawer";
import { ROLE_KEYS } from "@/features/lookups/seed";
import AddPersonFlow from "@/features/people/components/AddPersonFlow";

import type { RecruitDirectoryRow } from "../directory";
import {
  RECRUITING_FOUND_SET_COLUMNS,
  RECRUITING_FOUND_SET_FILENAME_BASE,
  RECRUITING_FOUND_SET_MODULE_KEY,
} from "../directoryColumns";
import {
  readStoredRecruitingDirectoryQuery,
  readStoredRecruitingDirectoryView,
  subscribeRecruitingDirectoryQuery,
  subscribeRecruitingDirectoryView,
  writeStoredRecruitingDirectoryQuery,
  writeStoredRecruitingDirectoryView,
} from "../directorySessionState";
import {
  buildRecruitingFilterDefinitions,
  filterRecruitDirectoryRows,
  normalizeActiveRecruitingFilters,
  readStoredActiveRecruitingFilters,
  subscribeRecruitingFilters,
  writeStoredActiveRecruitingFilters,
} from "../filters";
import RecruitCard from "./RecruitCard";
import RecruitList from "./RecruitList";
import RecruitingFilterControl from "./RecruitingFilterControl";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-control bg-denison-red px-4 text-sm font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

export default function RecruitingDirectory({ rows }: { rows: RecruitDirectoryRow[] }) {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const query = useSyncExternalStore(
    subscribeRecruitingDirectoryQuery,
    readStoredRecruitingDirectoryQuery,
    () => "",
  );
  const view = useSyncExternalStore(
    subscribeRecruitingDirectoryView,
    readStoredRecruitingDirectoryView,
    () => "list" as ViewMode,
  );
  const storedFilterIds = useSyncExternalStore(
    subscribeRecruitingFilters,
    readStoredActiveRecruitingFilters,
    () => [] as string[],
  );

  const definitions = useMemo(() => buildRecruitingFilterDefinitions(rows), [rows]);
  const allowedIds = useMemo(() => definitions.map((definition) => definition.id), [definitions]);
  const activeFilterIds = useMemo(
    () => normalizeActiveRecruitingFilters(storedFilterIds, allowedIds),
    [storedFilterIds, allowedIds],
  );

  const filtered = useMemo(
    () => filterRecruitDirectoryRows(rows, { activeFilterIds, query, definitions }),
    [rows, activeFilterIds, query, definitions],
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

  function handleCreated(personId: string) {
    closeDrawer();
    router.push(`/recruiting/${personId}`);
  }

  function openAddRecruitDrawer() {
    openDrawer({
      id: "recruiting-add-recruit",
      title: "Add Recruit",
      subtitle: "Recruiting",
      content: (
        <AddPersonFlow
          roleKey={ROLE_KEYS.recruit}
          description="Creates a Person with role Recruit and a Recruit Profile. Required fields only — recruiting details can be edited after opening the record."
          submitLabel="Create Recruit"
          onSuccess={handleCreated}
        />
      ),
      cancelAction: {
        label: "Cancel",
        onClick: () => closeDrawer(),
      },
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Recruiting"
        subtitle="Current recruits (role Recruit + Recruit Profile)"
        meta={`${filtered.length} ${filtered.length === 1 ? "recruit" : "recruits"}`}
        actions={
          <button type="button" className={primaryButtonClass} onClick={openAddRecruitDrawer}>
            + ADD RECRUIT
          </button>
        }
      />

      <Toolbar
        primary={
          <SearchInput
            value={query}
            onChange={writeStoredRecruitingDirectoryQuery}
            placeholder="Search by name, school, or recruiting fields"
          />
        }
        tertiary={<ViewToggle value={view} onChange={writeStoredRecruitingDirectoryView} />}
      />

      <RecruitingFilterControl
        value={activeFilterIds}
        onChange={handleFilterChange}
        definitions={definitions}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No recruits found"
          description="Try a different search term or filter."
        />
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => (
            <RecruitCard key={row.person.id} row={row} />
          ))}
        </div>
      ) : (
        <RecruitList rows={filtered} />
      )}
    </div>
  );
}
