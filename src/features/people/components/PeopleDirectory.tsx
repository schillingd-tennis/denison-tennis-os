"use client";

import { LayoutGrid, List } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { publishFoundSet } from "@/components/found-set";
import EmptyState from "@/components/EmptyState";
import ModulePageShell from "@/components/ModulePageShell";
import {
  DesktopOnlySummary,
  MobileDirectoryControls,
  MobileDirectorySearchRegion,
  MobileViewSelector,
} from "@/components/mobile-dashboard";
import SearchInput from "@/components/SearchInput";
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
import { computePeopleDirectoryKpis } from "@/features/people/directorySummary";
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

import { playersCoachesPersonPath } from "@/lib/module-routes";
import AddPersonFlow from "./AddPersonFlow";
import PeopleDirectoryKpiRow from "./PeopleDirectoryKpiRow";
import PersonCard from "./PersonCard";
import PersonList from "./PersonList";
import RoleFilterControl from "./RoleFilterControl";

/**
 * Same geometry as Recruiting Rank's + ADD RECRUIT, using the Players/Coaches
 * module accent instead of recruiting red.
 */
const addButtonClass =
  "inline-flex h-11 items-center justify-center rounded-control bg-[var(--module-accent)] px-5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_18px_rgba(17,24,39,0.12)] transition-opacity hover:opacity-90";

const TEAM_VIEW_OPTIONS = [
  { value: "cards" as const, label: "Cards", icon: LayoutGrid },
  { value: "list" as const, label: "List", icon: List },
];

/**
 * Players/Coaches directory surface for the People domain.
 * Base set is program membership only (players + coaches) — not all People.
 * Visual shell matches Recruiting List via ModulePageShell.
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
  const kpis = useMemo(() => computePeopleDirectoryKpis(livePeople), [livePeople]);

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
      subtitle: "Team",
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
      subtitle: "Team",
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
    <button type="button" className={addButtonClass} onClick={openAddPlayerDrawer}>
      + ADD PLAYER
    </button>
  );
  const addCoachButton = (
    <button type="button" className={addButtonClass} onClick={openAddCoachDrawer}>
      + ADD COACH
    </button>
  );

  return (
    <ModulePageShell
      title="Team"
      subtitle="Players and coaches on the Denison Tennis team"
      actions={
        <div className="flex shrink-0 items-center gap-2">
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
    >
      <DesktopOnlySummary>
        <PeopleDirectoryKpiRow kpis={kpis} />
      </DesktopOnlySummary>

      <MobileDirectorySearchRegion
        toolbar={
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1 md:max-w-xl">
                <SearchInput
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Search by name, title, hometown, or major"
                  aria-label="Search people"
                />
              </div>
              <div className="hidden md:ml-auto md:block">
                <ViewToggle value={view} onChange={handleViewChange} />
              </div>
            </div>
            <RoleFilterControl
              value={activeFilterIds}
              onChange={handleFilterChange}
              renderMobileTrigger={(filtersButton) => (
                <MobileDirectoryControls>
                  <MobileViewSelector
                    value={view}
                    onChange={handleViewChange}
                    options={TEAM_VIEW_OPTIONS}
                    ariaLabel="Change team view"
                  />
                  {filtersButton}
                </MobileDirectoryControls>
              )}
            />
          </div>
        }
      >
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
          <PersonList
            people={filtered}
            allPeople={livePeople}
            activeFilterIds={activeFilterIds}
            onPersonCommit={replacePerson}
          />
        )}
      </MobileDirectorySearchRegion>
    </ModulePageShell>
  );
}
