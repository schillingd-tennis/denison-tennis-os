"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import ModulePageShell from "@/components/ModulePageShell";
import { formatDate } from "@/lib/formatting";
import { MATCHES_ROUTE, matchesEventPath } from "@/lib/module-routes";

import {
  eventDisplayTitle,
  formatOpponentLine,
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
          <ul className="divide-y divide-border">
            {view === "singles"
              ? singles.map((row) => (
                  <li key={row.id} className="grid gap-1 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_auto_auto]">
                    <Link href={matchesEventPath(row.event.id)} className="font-semibold hover:underline">
                      {eventDisplayTitle(row.event)}
                    </Link>
                    <span className="text-text-secondary">{formatOpponentLine(row)}</span>
                    <span className="tabular-nums">{row.scoreText ?? "—"}</span>
                    <span className="font-semibold">
                      {row.winnerSide === "denison" ? "W" : row.winnerSide === "opponent" ? "L" : "—"}
                    </span>
                    <p className="text-[11px] text-text-secondary md:col-span-4">
                      {formatDate(row.matchDate ?? row.event.startDate)} · {row.status}
                      {row.roundLabel ? ` · ${row.roundLabel}` : ""}
                    </p>
                  </li>
                ))
              : doubles.map((row) => (
                  <li key={row.id} className="grid gap-1 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_auto_auto]">
                    <Link href={matchesEventPath(row.event.id)} className="font-semibold hover:underline">
                      {eventDisplayTitle(row.event)}
                    </Link>
                    <span className="text-text-secondary">
                      Partner {playerNameFor(row.partnerId, roster)} · {formatOpponentLine(row)}
                    </span>
                    <span className="tabular-nums">{row.scoreText ?? "—"}</span>
                    <span className="font-semibold">
                      {row.winnerSide === "denison" ? "W" : row.winnerSide === "opponent" ? "L" : "—"}
                    </span>
                    <p className="text-[11px] text-text-secondary md:col-span-4">
                      {formatDate(row.matchDate ?? row.event.startDate)} · {row.status}
                      {row.roundLabel ? ` · ${row.roundLabel}` : ""}
                    </p>
                  </li>
                ))}
          </ul>
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
