"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { publishFoundSet } from "@/components/found-set";
import EmptyState from "@/components/EmptyState";
import { modulePrimaryButtonClass } from "@/components/module-theme";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import { Toolbar } from "@/components/toolbar";
import ViewToggle, { type ViewMode } from "@/components/ViewToggle";
import { useDrawerManager } from "@/components/workspace-drawer";
import { ROLE_KEYS } from "@/features/lookups/seed";
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

import {
  PLAYERS_COACHES_ROUTE,
  playersCoachesPersonPath,
} from "@/lib/module-routes";
import AddPersonFlow from "./AddPersonFlow";
import PersonCard from "./PersonCard";
import PersonList from "./PersonList";
import RoleFilterControl from "./RoleFilterControl";

/**
 * Players/Coaches directory surface for the People domain.
 * Base set is program membership only (players + coaches) — not all People.
 * BP-031A: search + view persist in sessionStorage so Workspace Back restores them.
 * BP-041 / BP-042: + ADD PLAYER / + ADD COACH via shared AddPersonFlow.
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
  const [livePeople, setLivePeople] = useState(people);
  const [serverPeople, setServerPeople] = useState(people);
  if (people !== serverPeople) {
    setServerPeople(people);
    setLivePeople(people);
  }

  // Facets first, then search — Cards and List share `filtered`.
  const filtered = useMemo(
    () => filterPeople(livePeople, { activeFilterIds, query }),
    [livePeople, activeFilterIds, query],
  );

  function replacePerson(person: Person) {
    setLivePeople((current) =>
      current.map((row) => (row.id === person.id ? person : row)),
    );
  }

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

  function handleCreated(personId: string) {
    closeDrawer();
    router.push(playersCoachesPersonPath(personId));
  }

  function openAddPlayerDrawer() {
    openDrawer({
      id: "team-add-player",
      title: "Add Player",
      subtitle: "Players/Coaches",
      content: (
        <AddPersonFlow
          roleKey={ROLE_KEYS.player}
          description="Creates a new Player on the Team. Required fields only — more details can be edited after opening the record."
          submitLabel="Create Player"
          onSuccess={handleCreated}
        />
      ),
      cancelAction: {
        label: "Cancel",
        onClick: () => closeDrawer(),
      },
    });
  }

  function openAddCoachDrawer() {
    openDrawer({
      id: "team-add-coach",
      title: "Add Coach",
      subtitle: "Players/Coaches",
      content: (
        <AddPersonFlow
          roleKey={ROLE_KEYS.coach}
          description="Creates a new Coach on the Team. Required fields only — more details can be edited after opening the record."
          submitLabel="Create Coach"
          onSuccess={handleCreated}
        />
      ),
      cancelAction: {
        label: "Cancel",
        onClick: () => closeDrawer(),
      },
    });
  }

  // Coaches filter: lead with + ADD COACH so the primary action matches the section.
  // All / Current / Players / mixed: keep both, Player-first action group.
  const coachesSectionActive =
    activeFilterIds.includes("coaches") && !activeFilterIds.includes("players");

  const addPlayerButton = (
    <button type="button" className={modulePrimaryButtonClass} onClick={openAddPlayerDrawer}>
      + ADD PLAYER
    </button>
  );
  const addCoachButton = (
    <button type="button" className={modulePrimaryButtonClass} onClick={openAddCoachDrawer}>
      + ADD COACH
    </button>
  );

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Players/Coaches"
        subtitle="Players and coaches on the Denison Tennis team"
        meta={`${filtered.length} ${filtered.length === 1 ? "person" : "people"}`}
        actions={
          <div className="flex items-center gap-2">
            {coachesSectionActive ? (
              <>
                {addCoachButton}
                {addPlayerButton}
              </>
            ) : (
              <>
                {addPlayerButton}
                {addCoachButton}
              </>
            )}
          </div>
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
            <PersonCard key={person.id} person={person} onPersonCommit={replacePerson} />
          ))}
        </div>
      ) : (
        <PersonList people={filtered} onPersonCommit={replacePerson} />
      )}
    </div>
  );
}
