"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import ModulePageShell from "@/components/ModulePageShell";
import { useDrawerManager } from "@/components/workspace-drawer";
import { TEAM_OPERATIONS_ROUTE } from "@/lib/module-routes";

import { intraSquadTabHref, sortMatchesNewestFirst } from "../display";
import { computeEloRankings, rebuildEloFromMatches } from "../elo";
import {
  computeMatchValueRankings,
  computeMatchValueStandings,
} from "../matchValue";
import { computeProvisionalRankings, topProvisionalRankings } from "../rankings";
import { computePlayerRecords, playerNameFor } from "../records";
import type { IntraSquadMatch, IntraSquadTab, MatchStatus, RosterPlayer } from "../types";
import EloRankingsTable from "./EloRankingsTable";
import EloRatingTrendCard from "./EloRatingTrendCard";
import HowRankingsWorkCard from "./HowRankingsWorkCard";
import IntraSquadDeleteConfirm from "./IntraSquadDeleteConfirm";
import IntraSquadMatchForm from "./IntraSquadMatchForm";
import IntraSquadMatchList from "./IntraSquadMatchList";
import IntraSquadPlayerDetail, {
  playerDetailSubtitle,
  type IntraSquadPlayerDetailContext,
} from "./IntraSquadPlayerDetail";
import IntraSquadSummaryCards from "./IntraSquadSummaryCards";
import IntraSquadTabs from "./IntraSquadTabs";
import LiveRankingsPreview from "./LiveRankingsPreview";
import MatchValueRankingsTable from "./MatchValueRankingsTable";
import PlayerRecordsTable, { RankingsTable } from "./PlayerRecordsTable";
import QuickMatchEntry from "./QuickMatchEntry";
import styles from "./intraSquadDashboard.module.css";

export default function IntraSquadWorkspace({
  matches: initialMatches,
  roster,
  tab,
  loadError = null,
}: {
  matches: IntraSquadMatch[];
  roster: RosterPlayer[];
  tab: IntraSquadTab;
  loadError?: string | null;
}) {
  const { openDrawer, closeDrawer, replaceDrawer } = useDrawerManager();
  const [matches, setMatches] = useState(initialMatches);
  const [serverMatches, setServerMatches] = useState(initialMatches);
  const [logStatusFilter, setLogStatusFilter] = useState<"all" | MatchStatus>("all");

  if (initialMatches !== serverMatches) {
    setServerMatches(initialMatches);
    setMatches(initialMatches);
  }

  const ordered = useMemo(() => sortMatchesNewestFirst(matches), [matches]);
  const logMatches = useMemo(
    () => (logStatusFilter === "all" ? ordered : ordered.filter((row) => row.status === logStatusFilter)),
    [ordered, logStatusFilter],
  );
  const records = useMemo(() => computePlayerRecords(ordered), [ordered]);
  const rankings = useMemo(
    () => computeProvisionalRankings(ordered, records, roster),
    [ordered, records, roster],
  );
  const top5 = useMemo(
    () => topProvisionalRankings(ordered, records, roster, 5),
    [ordered, records, roster],
  );
  const eloRebuild = useMemo(() => rebuildEloFromMatches(matches), [matches]);
  const eloRankings = useMemo(
    () => computeEloRankings(matches, records, roster),
    [matches, records, roster],
  );
  const matchValueStandings = useMemo(() => computeMatchValueStandings(matches), [matches]);
  const matchValueByPlayerId = useMemo(() => {
    const map = new Map<string, number>();
    for (const [playerId, standing] of matchValueStandings) {
      map.set(playerId, standing.totalMatchValue);
    }
    return map;
  }, [matchValueStandings]);
  const matchValueRankings = useMemo(
    () => computeMatchValueRankings(matches, roster),
    [matches, roster],
  );

  function upsert(saved: IntraSquadMatch) {
    setMatches((current) => {
      const exists = current.some((row) => row.id === saved.id);
      return exists ? current.map((row) => (row.id === saved.id ? saved : row)) : [saved, ...current];
    });
  }

  function remove(id: string) {
    setMatches((current) => current.filter((row) => row.id !== id));
  }

  function openDelete(match: IntraSquadMatch) {
    replaceDrawer({
      id: `intra-squad-delete-${match.id}`,
      title: "Delete Match",
      subtitle: "Team Operations · Intra Squad",
      hideFooter: true,
      content: (
        <IntraSquadDeleteConfirm
          match={match}
          roster={roster}
          onCancelled={closeDrawer}
          onDeleted={(id) => {
            remove(id);
            closeDrawer();
          }}
        />
      ),
    });
  }

  function openForm(match?: IntraSquadMatch) {
    openDrawer({
      id: `intra-squad-form-${match?.id ?? "new"}`,
      title: match ? "Edit Match" : "Add Match",
      subtitle: "Team Operations · Intra Squad",
      hideFooter: true,
      content: (
        <IntraSquadMatchForm
          match={match}
          roster={roster}
          onCancel={closeDrawer}
          onSaved={(saved) => {
            upsert(saved);
            closeDrawer();
          }}
          onRequestDelete={match ? () => openDelete(match) : undefined}
        />
      ),
    });
  }

  function openPlayerDetail(playerId: string, context: IntraSquadPlayerDetailContext) {
    const record = records.find((row) => row.playerId === playerId) ?? null;
    const rankingRow = rankings.find((row) => row.playerId === playerId) ?? null;
    const matchValueRow = matchValueRankings.find((row) => row.playerId === playerId) ?? null;
    const eloRow = eloRankings.find((row) => row.playerId === playerId) ?? null;

    openDrawer({
      id: `intra-squad-player-${playerId}-${context}`,
      title: playerNameFor(playerId, roster),
      subtitle: playerDetailSubtitle(context),
      hideFooter: true,
      content: (
        <IntraSquadPlayerDetail
          playerId={playerId}
          context={context}
          matches={ordered}
          roster={roster}
          record={record}
          rankingRow={rankingRow}
          matchValueRow={matchValueRow}
          eloRow={eloRow}
        />
      ),
    });
  }

  return (
    <ModulePageShell
      title="Intra Squad"
      subtitle="Denison men’s tennis intra-squad singles results, records, and live rankings."
      actions={
        <button
          type="button"
          className="hidden h-11 items-center justify-center rounded-control bg-[var(--module-accent)] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(200,16,46,0.28)] lg:inline-flex"
          onClick={() => openForm()}
        >
          <Plus className="mr-1.5 h-4 w-4" strokeWidth={2} />
          Add Match
        </button>
      }
    >
      <div className={styles.page}>
        <nav className="text-xs text-text-secondary" aria-label="Breadcrumb">
          <Link href={TEAM_OPERATIONS_ROUTE} className="hover:text-text-primary">
            Team Operations
          </Link>
          <span className="mx-1.5">›</span>
          <span className="text-text-primary">Intra Squad</span>
        </nav>

        <IntraSquadTabs active={tab} />

        {loadError ? (
          <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p>
        ) : null}

        {tab === "dashboard" ? (
          <div data-intra-squad-dashboard="" className={styles.dashboard}>
            <div data-intra-squad-quick-entry="" className={styles.quick}>
              <QuickMatchEntry roster={roster} onSaved={upsert} />
            </div>
            <div data-intra-squad-rankings="" className={styles.rankings}>
              <LiveRankingsPreview
                rows={top5}
                roster={roster}
                eloByPlayerId={eloRebuild.ratings}
                matchValueByPlayerId={matchValueByPlayerId}
                onSelectPlayer={(playerId) => openPlayerDetail(playerId, "rankings")}
              />
            </div>
            <div data-intra-squad-summary="" className={styles.metrics}>
              <IntraSquadSummaryCards matches={ordered} />
            </div>
            <section data-intra-squad-recent="" className={styles.recent}>
              <div className={styles.card}>
                <span aria-hidden="true" className={styles.cardAccent} />
                <div className={styles.cardBody}>
                  <div className={`${styles.cardHeaderRow} mb-3`}>
                    <div>
                      <h2 className="text-sm font-semibold text-text-primary">Recent Matches</h2>
                      <p className="text-xs text-text-secondary">Newest first</p>
                    </div>
                    <Link
                      href={intraSquadTabHref("match-log")}
                      className="shrink-0 text-xs font-semibold text-info hover:underline"
                    >
                      View All Matches
                    </Link>
                  </div>
                  <IntraSquadMatchList
                    matches={ordered.slice(0, 12)}
                    roster={roster}
                    onEdit={openForm}
                    onDelete={openDelete}
                    onSelectPlayer={(playerId) => openPlayerDetail(playerId, "records")}
                    nested
                  />
                </div>
              </div>
            </section>
            <div data-intra-squad-elo-trend="" className={styles.elo}>
              <EloRatingTrendCard rankings={eloRankings} roster={roster} />
            </div>
            <div className={styles.how}>
              <HowRankingsWorkCard />
            </div>
          </div>
        ) : null}

        {tab === "match-log" ? (
          <section className="flex min-w-0 w-full flex-col gap-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Match Log</h2>
                <p className="text-xs text-text-secondary">All stored intra-squad singles results. Click a match to edit.</p>
              </div>
              <div
                data-intra-squad-status-filter=""
                className="flex gap-1"
                role="group"
                aria-label="Match status"
              >
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "completed", label: "Completed" },
                    { id: "unfinished", label: "Unfinished" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={logStatusFilter === option.id}
                    onClick={() => setLogStatusFilter(option.id)}
                    className={`h-8 rounded-control px-2.5 text-xs font-semibold ${
                      logStatusFilter === option.id
                        ? "bg-[var(--module-accent)] text-white"
                        : "border border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <IntraSquadMatchList
              matches={logMatches}
              roster={roster}
              onEdit={openForm}
              onDelete={openDelete}
              onSelectPlayer={(playerId) => openPlayerDetail(playerId, "records")}
              showLogActions
            />
          </section>
        ) : null}

        {tab === "rankings" ? (
          <section className="flex min-w-0 w-full flex-col gap-2">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Rankings</h2>
              <p className="text-xs text-text-secondary">
                Provisional live ranking: Weighted Net, then Win %, then Wins, then name. Elo is shown as a
                companion metric and does not change this order.
              </p>
            </div>
            <RankingsTable
              rows={rankings}
              roster={roster}
              eloByPlayerId={eloRebuild.ratings}
              onSelectPlayer={(playerId) => openPlayerDetail(playerId, "rankings")}
            />
          </section>
        ) : null}

        {tab === "player-records" ? (
          <section className="flex min-w-0 w-full flex-col gap-2">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Player Records</h2>
              <p className="text-xs text-text-secondary">
                Derived from canonical matches. A completed win is +weight; a completed loss is −weight.
                Unfinished leads are +0.5 × weight and do not change W-L.
              </p>
            </div>
            <PlayerRecordsTable
              records={records}
              roster={roster}
              onSelectPlayer={(playerId) => openPlayerDetail(playerId, "records")}
            />
          </section>
        ) : null}

        {tab === "match-value" ? (
          <section className="flex min-w-0 w-full flex-col gap-2">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Match Value</h2>
              <p className="text-xs text-text-secondary">
                Quality of competitive evidence: full ±1.00, one-set ±0.60, unfinished from sets then
                current-set games — then × weight. Sorted by Match Value, then Elo, then full wins, then
                name.
              </p>
            </div>
            <MatchValueRankingsTable
              rows={matchValueRankings}
              roster={roster}
              onSelectPlayer={(playerId) => openPlayerDetail(playerId, "match-value")}
            />
          </section>
        ) : null}

        {tab === "elo" ? (
          <section className="flex min-w-0 w-full flex-col gap-2">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Elo Rankings</h2>
              <p className="text-xs text-text-secondary">
                Opponent-adjusted strength from 1500. Sorted by Elo, then players with matches, then name.
                Click a player for Elo history.
              </p>
            </div>
            <EloRankingsTable
              rows={eloRankings}
              roster={roster}
              onSelectPlayer={(playerId) => openPlayerDetail(playerId, "elo")}
            />
          </section>
        ) : null}
      </div>
    </ModulePageShell>
  );
}
