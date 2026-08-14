"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { publishFoundSet } from "@/components/found-set";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import { Toolbar } from "@/components/toolbar";
import ViewToggle, { type ViewMode } from "@/components/ViewToggle";
import { useDrawerManager } from "@/components/workspace-drawer";
import type { Person } from "@/features/people/types";
import {
  readStoredDirectoryQuery,
  readStoredDirectoryView,
  subscribeDirectoryQuery,
  subscribeDirectoryView,
  writeStoredDirectoryQuery,
  writeStoredDirectoryView,
} from "@/features/people/directorySessionState";
import {
  filterPeople,
  normalizeActivePeopleFilters,
  readStoredActivePeopleFilters,
  writeStoredActivePeopleFilters,
} from "@/features/people/filters";
import {
  TEAM_FOUND_SET_COLUMNS,
  TEAM_FOUND_SET_FILENAME_BASE,
  TEAM_FOUND_SET_MODULE_KEY,
} from "@/features/people/foundSet";

import AddPlayerFlow from "./AddPlayerFlow";
import PersonCard from "./PersonCard";
import PersonList from "./PersonList";
import RoleFilterControl from "./RoleFilterControl";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-control bg-denison-red px-4 text-sm font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Team directory surface for the People domain.
 * Nav label and `/team` routes stay "Team"; data model is People.
 * Base set is Team membership only (players + coaches) — not all People.
 * BP-031A: search + view persist in sessionStorage so Workspace Back restores them.
 * BP-041: + ADD PLAYER creates a Player Person via DrawerManager.
 */
export default function PeopleDirectory({ people }: { people: Person[] }) {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const query = useSyncExternalStore(
    subscribeDirectoryQuery,
    readStoredDirectoryQuery,
    () => "",
  );
  const view = useSyncExternalStore(
    subscribeDirectoryView,
    readStoredDirectoryView,
    () => "list" as ViewMode,
  );

  const [activeFilterIds, setActiveFilterIds] = useState<string[]>(() =>
    readStoredActivePeopleFilters(),
  );

  // Facets first, then search — Cards and List share `filtered`.
  const filtered = useMemo(
    () => filterPeople(people, { activeFilterIds, query }),
    [people, activeFilterIds, query],
  );

  useEffect(() => {
    writeStoredActivePeopleFilters(activeFilterIds);
  }, [activeFilterIds]);

  // Keep found-set in sync for every facet combination (Cards + List share `filtered`).
  useEffect(() => {
    publishFoundSet({
      moduleKey: TEAM_FOUND_SET_MODULE_KEY,
      filenameBase: TEAM_FOUND_SET_FILENAME_BASE,
      rows: filtered,
      columns: TEAM_FOUND_SET_COLUMNS,
    });
  }, [filtered]);

  function handleFilterChange(next: string[]) {
    setActiveFilterIds(normalizeActivePeopleFilters(next));
  }

  function handleQueryChange(next: string) {
    writeStoredDirectoryQuery(next);
  }

  function handleViewChange(next: ViewMode) {
    writeStoredDirectoryView(next);
  }

  function openAddPlayerDrawer() {
    openDrawer({
      id: "team-add-player",
      title: "Add Player",
      subtitle: "Team",
      content: (
        <AddPlayerFlow
          onSuccess={() => {
            closeDrawer();
            router.refresh();
          }}
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
        title="Team"
        subtitle="Players and coaches on the Denison Tennis team"
        meta={`${filtered.length} ${filtered.length === 1 ? "person" : "people"}`}
        actions={
          <button type="button" className={primaryButtonClass} onClick={openAddPlayerDrawer}>
            + ADD PLAYER
          </button>
        }
      />

      <Toolbar
        primary={
          <SearchInput
            value={query}
            onChange={handleQueryChange}
            placeholder="Search by name, title, hometown, or major"
          />
        }
        secondary={
          <RoleFilterControl value={activeFilterIds} onChange={handleFilterChange} />
        }
        tertiary={<ViewToggle value={view} onChange={handleViewChange} />}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No people found"
          description="Try a different search term or filter."
        />
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <PersonList people={filtered} />
      )}
    </div>
  );
}
