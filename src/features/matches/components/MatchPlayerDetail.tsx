"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import ModulePageShell from "@/components/ModulePageShell";
import { MATCHES_ROUTE } from "@/lib/module-routes";

import {
  formatRecord,
  matchesTabHref,
  playerNameFor,
} from "../display";
import {
  playerDoublesHistory,
  playerSinglesHistory,
  buildDoublesPlayerRecords,
  buildSinglesPlayerRecords,
} from "../records";
import type { MatchEvent, MatchResult, RosterPlayer } from "../types";
import PlayerResultRow from "./PlayerResultRow";

export default function MatchPlayerDetail({
  playerId,
  events,
  results,
  roster,
  view = "singles",
  backHref,
}: {
  playerId: string;
  events: MatchEvent[];
  results: MatchResult[];
  roster: RosterPlayer[];
  view?: "singles" | "doubles";
  backHref?: string;
}) {
  const singlesRecord = buildSinglesPlayerRecords(results, events).find((r) => r.playerId === playerId);
  const doublesRecord = buildDoublesPlayerRecords(results, events).find((r) => r.playerId === playerId);
  const singles = playerSinglesHistory(results, events, playerId);
  const doubles = playerDoublesHistory(results, events, playerId);
  const sortedDoubles = [...doubles].sort((left, right) => {
    const partnerCompare = playerNameFor(left.partnerId, roster).localeCompare(
      playerNameFor(right.partnerId, roster),
      undefined,
      { sensitivity: "base" },
    );
    if (partnerCompare !== 0) return partnerCompare;
    return (right.matchDate ?? right.event.startDate).localeCompare(
      left.matchDate ?? left.event.startDate,
    );
  });
  const back = backHref ?? (view === "doubles" ? matchesTabHref("doubles-players") : matchesTabHref("players"));

  return (
    <ModulePageShell title={playerNameFor(playerId, roster)} subtitle="Official individual results">
      <Link href={back} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">Singles</p>
          <p className="mt-2 text-xl font-semibold tabular-nums">
            {singlesRecord ? formatRecord(singlesRecord) : "0–0"}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Dual {singlesRecord ? formatRecord(singlesRecord.dual) : "0–0"} · Tournament{" "}
            {singlesRecord ? formatRecord(singlesRecord.tournament) : "0–0"}
          </p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">Doubles</p>
          <p className="mt-2 text-xl font-semibold tabular-nums">
            {doublesRecord ? formatRecord(doublesRecord) : "0–0"}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Dual {doublesRecord ? formatRecord(doublesRecord.dual) : "0–0"} · Tournament{" "}
            {doublesRecord ? formatRecord(doublesRecord.tournament) : "0–0"}
          </p>
        </div>
      </div>

      {(view === "singles" ? singles : doubles).length === 0 ? (
        <p className="text-sm text-text-secondary">No {view} results yet.</p>
      ) : (
        <section className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className={`${view === "doubles" ? "min-w-[940px]" : "min-w-[800px]"} w-full text-left text-sm`}>
              <thead className="border-b border-border bg-app-background/60 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Date</th>
                  {view === "doubles" ? <th scope="col" className="px-4 py-2.5">Partner</th> : null}
                  <th scope="col" className="px-4 py-2.5">Opponent Name</th>
                  <th scope="col" className="px-4 py-2.5">School</th>
                  <th scope="col" className="px-4 py-2.5">Win/Loss</th>
                  <th scope="col" className="px-4 py-2.5">Score</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(view === "singles" ? singles : sortedDoubles).map((row) => (
                  <PlayerResultRow
                    key={row.id}
                    row={row}
                    playerId={playerId}
                    roster={roster}
                    showPartnerColumn={view === "doubles"}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-4 py-2 text-[11px] text-text-secondary">
            <Link href={MATCHES_ROUTE} className="underline">
              Matches home
            </Link>
          </p>
        </section>
      )}
    </ModulePageShell>
  );
}
