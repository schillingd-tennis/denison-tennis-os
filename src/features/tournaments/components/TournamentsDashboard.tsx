"use client";

import { CalendarDays, List } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/EmptyState";
import ModulePageShell from "@/components/ModulePageShell";
import { typeRole } from "@/components/typography";
import {
  DesktopOnlySummary,
  DirectoryToolbar,
  MobileDirectoryControls,
  MobileDirectorySearchRegion,
  MobileViewSelector,
} from "@/components/mobile-dashboard";
import SearchInput from "@/components/SearchInput";
import ViewToggle from "@/components/ViewToggle";
import { useDrawerManager } from "@/components/workspace-drawer";
import type { RecruitDirectoryRow } from "@/features/recruiting/directory";
import { RECRUITING_TOURNAMENTS_ROUTE } from "@/lib/module-routes";

import {
  readStoredTournamentDirectoryView,
  subscribeTournamentDirectoryView,
  writeStoredTournamentDirectoryView,
  type TournamentDirectoryView,
} from "../directoryView";
import { buildTournamentFilterDefinitions, filterTournaments, sanitizeTournamentFilterIds } from "../filters";
import { partitionTournamentsBySchedule } from "../location";
import { computeTournamentKpis } from "../metrics";
import type { Tournament } from "../types";
import TournamentCalendar from "./TournamentCalendar";
import TournamentFilterControl from "./TournamentFilterControl";
import TournamentForm from "./TournamentForm";
import TournamentKpiRow from "./TournamentKpiRow";
import TournamentList from "./TournamentList";

export const TOURNAMENT_DIRECTORY_VIEW_OPTIONS = [
  { value: "list" as const, label: "List", icon: List },
  { value: "calendar" as const, label: "Calendar", icon: CalendarDays },
];

export default function TournamentsDashboard({
  tournaments,
  recruits,
  loadError = null,
  initialView = "list",
}: {
  tournaments: Tournament[];
  recruits: RecruitDirectoryRow[];
  loadError?: string | null;
  initialView?: TournamentDirectoryView;
}) {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [rows, setRows] = useState(tournaments);
  const [serverTournaments, setServerTournaments] = useState(tournaments);
  const [query, setQuery] = useState("");
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>([]);
  const [view, setView] = useState<TournamentDirectoryView>(initialView);

  if (tournaments !== serverTournaments) {
    setServerTournaments(tournaments);
    setRows(tournaments);
  }

  useEffect(() => {
    setView(readStoredTournamentDirectoryView());
    return subscribeTournamentDirectoryView(() => {
      setView(readStoredTournamentDirectoryView());
    });
  }, []);

  function handleViewChange(next: TournamentDirectoryView) {
    setView(next);
    writeStoredTournamentDirectoryView(next);
    router.replace(
      next === "calendar" ? `${RECRUITING_TOURNAMENTS_ROUTE}?view=calendar` : RECRUITING_TOURNAMENTS_ROUTE,
      { scroll: false },
    );
  }

  const definitions = useMemo(() => buildTournamentFilterDefinitions(rows), [rows]);
  const sanitizedFilterIds = useMemo(
    () => sanitizeTournamentFilterIds(activeFilterIds, definitions),
    [activeFilterIds, definitions],
  );
  if (sanitizedFilterIds.length !== activeFilterIds.length) {
    setActiveFilterIds(sanitizedFilterIds);
  }
  const filtered = useMemo(
    () => filterTournaments(rows, query, sanitizedFilterIds, definitions),
    [rows, query, sanitizedFilterIds, definitions],
  );
  const { upcoming, past } = useMemo(() => partitionTournamentsBySchedule(filtered), [filtered]);
  const kpis = useMemo(() => computeTournamentKpis(rows), [rows]);

  function upsert(saved: Tournament) {
    setRows((current) => {
      const exists = current.some((row) => row.id === saved.id);
      return exists ? current.map((row) => (row.id === saved.id ? saved : row)) : [...current, saved];
    });
  }

  function openForm(tournament?: Tournament) {
    openDrawer({
      id: `tournament-form-${tournament?.id ?? "new"}`,
      title: tournament ? "Edit tournament" : "Add Tournament",
      subtitle: "Recruiting · Tournaments",
      hideFooter: true,
      content: (
        <TournamentForm
          tournament={tournament}
          recruits={recruits}
          onCancel={closeDrawer}
          onSaved={(saved) => {
            upsert(saved);
            closeDrawer();
          }}
        />
      ),
    });
  }

  return (
    <ModulePageShell
      title="Tournaments"
      subtitle="Track recruiting events, travel plans, and the prospects expected to compete."
      actions={
        <button
          type="button"
          onClick={() => openForm()}
          className="inline-flex h-11 items-center justify-center rounded-control bg-denison-red px-5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_18px_rgba(200,16,46,0.28)] hover:opacity-90"
        >
          + Add Tournament
        </button>
      }
    >
      <DesktopOnlySummary>
        <TournamentKpiRow kpis={kpis} />
      </DesktopOnlySummary>

      <MobileDirectorySearchRegion
        toolbar={
          <DirectoryToolbar
            search={
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search by tournament, city, state, or recruiting fields"
                aria-label="Search tournaments"
              />
            }
            views={
              <ViewToggle
                value={view}
                onChange={handleViewChange}
                options={TOURNAMENT_DIRECTORY_VIEW_OPTIONS}
                ariaLabel="Change tournament view"
              />
            }
            filters={
              <TournamentFilterControl
                value={activeFilterIds}
                onChange={setActiveFilterIds}
                definitions={definitions}
                renderMobileTrigger={(filtersButton) => (
                  <MobileDirectoryControls>
                    <MobileViewSelector
                      value={view}
                      onChange={handleViewChange}
                      options={TOURNAMENT_DIRECTORY_VIEW_OPTIONS}
                      ariaLabel="Change tournament view"
                    />
                    {filtersButton}
                  </MobileDirectoryControls>
                )}
              />
            }
          />
        }
      >
        {loadError ? (
          <EmptyState title="Tournaments could not load" description={loadError} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No tournament records exist"
            description="The tournaments table is empty. Import Tournaments.csv or add a tournament."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No tournaments match the current filters"
            description="Try a different search or filter."
          />
        ) : view === "calendar" ? (
          <TournamentCalendar tournaments={filtered} />
        ) : (
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className={typeRole.sectionTitle}>Upcoming Tournaments</h2>
              {upcoming.length === 0 ? (
                <p className="text-sm text-text-secondary">No upcoming tournaments found.</p>
              ) : (
                <TournamentList tournaments={upcoming} />
              )}
            </section>
            <section className="space-y-3" style={{ marginTop: 24 }}>
              <h2 className={typeRole.sectionTitle}>Past Tournaments</h2>
              {past.length === 0 ? (
                <p className="text-sm text-text-secondary">No past tournaments found.</p>
              ) : (
                <TournamentList tournaments={past} />
              )}
            </section>
          </div>
        )}
      </MobileDirectorySearchRegion>
    </ModulePageShell>
  );
}
