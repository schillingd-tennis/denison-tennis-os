"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import {
  AdaptiveWorkspace,
  type AdaptiveWorkspaceDefinition,
} from "@/components/adaptive-workspace";
import { SaveIndicator, useSaveIndicator } from "@/components/inline-edit";
import { MobileWorkspaceSelector } from "@/components/mobile-workspace";
import {
  PersonWorkspaceDesktopSplit,
  PersonWorkspaceMobilePane,
  PersonWorkspaceShell,
} from "@/components/person-workspace-shell";
import { useDrawerManager } from "@/components/workspace-drawer";
import type { RecruitDirectoryRow } from "@/features/recruiting/directory";
import { RECRUITING_TOURNAMENTS_ROUTE, recruitingTournamentPath } from "@/lib/module-routes";

import { TournamentFieldSession } from "./TournamentFieldSession";
import LinkRecruitPicker from "./LinkRecruitPicker";
import TournamentPlayersWorkspace from "./TournamentPlayersWorkspace";
import {
  TournamentLinksNotesWorkspace,
  TournamentOverviewWorkspace,
  TournamentTravelWorkspace,
} from "./TournamentWorkspaceFields";
import {
  TournamentWorkspaceNav,
  TournamentWorkspaceProfile,
  tournamentWorkspaceItems,
} from "./TournamentWorkspaceChrome";
import type { Tournament } from "../types";
import { parseTournamentWorkspaceId, type TournamentWorkspaceId } from "../workspaces";

export default function TournamentWorkspace({
  tournament: initialTournament,
  recruits,
  initialWorkspace = "overview",
}: {
  tournament: Tournament;
  recruits: RecruitDirectoryRow[];
  initialWorkspace?: TournamentWorkspaceId;
}) {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const { status: saveStatus, error: saveError, runSave } = useSaveIndicator();
  const [tournament, setTournament] = useState(initialTournament);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(initialWorkspace);

  if (initialTournament.id !== tournament.id) {
    setTournament(initialTournament);
    setActiveWorkspaceId(initialWorkspace);
  }

  function selectWorkspace(id: string) {
    setActiveWorkspaceId(id);
    const workspace = parseTournamentWorkspaceId(id);
    router.replace(`${recruitingTournamentPath(tournament.id)}?workspace=${workspace}`, { scroll: false });
  }

  function openAddPlayers() {
    openDrawer({
      id: `tournament-link-${tournament.id}`,
      title: "Add Players",
      subtitle: tournament.name,
      hideFooter: true,
      content: (
        <LinkRecruitPicker
          tournamentId={tournament.id}
          linkedPersonIds={tournament.linkedRecruits.map((recruit) => recruit.personId)}
          recruits={recruits}
          onCancel={closeDrawer}
          onLinked={(saved) => {
            setTournament(saved);
            closeDrawer();
          }}
        />
      ),
    });
  }

  const adaptiveWorkspaces: AdaptiveWorkspaceDefinition[] = [
    {
      id: "overview",
      title: "Overview",
      subtitle: "Tournament, dates, and location",
      content: <TournamentOverviewWorkspace />,
    },
    {
      id: "players",
      title: "The Players",
      subtitle: "Recruits linked to this tournament",
      content: (
        <TournamentPlayersWorkspace
          tournament={tournament}
          pending={false}
          onAddPlayers={openAddPlayers}
          onUnlinked={setTournament}
        />
      ),
    },
    {
      id: "travel",
      title: "Travel Info",
      subtitle: "Trip logistics before you leave",
      content: <TournamentTravelWorkspace />,
    },
    {
      id: "links",
      title: "Links / Notes",
      subtitle: "Pages and working notes",
      content: <TournamentLinksNotesWorkspace />,
    },
  ];

  const navItems = tournamentWorkspaceItems(tournament);
  const resolvedId = navItems.some((item) => item.id === activeWorkspaceId) ? activeWorkspaceId : "overview";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 max-md:min-w-0 max-md:overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={RECRUITING_TOURNAMENTS_ROUTE}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Tournaments
        </Link>
        <SaveIndicator status={saveStatus} error={saveError} />
      </div>

      <TournamentWorkspaceProfile tournament={tournament} />

      <TournamentFieldSession
        tournament={tournament}
        onTournamentChange={setTournament}
        runSave={runSave}
      >
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
                <TournamentWorkspaceNav
                  items={navItems}
                  activeId={resolvedId}
                  onSelect={selectWorkspace}
                />
              }
              content={
                <AdaptiveWorkspace framed={false} activeId={resolvedId} workspaces={adaptiveWorkspaces} />
              }
            />
          }
        />
      </TournamentFieldSession>
    </div>
  );
}
