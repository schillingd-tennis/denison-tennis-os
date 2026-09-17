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
  pairDisplayName,
} from "../display";
import { buildDoublesPairRecords, pairDoublesHistory } from "../records";
import type { MatchEvent, MatchResult, RosterPlayer } from "../types";

export default function MatchPairDetail({
  pairKey,
  events,
  results,
  roster,
}: {
  pairKey: string;
  events: MatchEvent[];
  results: MatchResult[];
  roster: RosterPlayer[];
}) {
  const record = buildDoublesPairRecords(results, events).find((r) => r.pairKey === pairKey);
  const history = pairDoublesHistory(results, events, pairKey);
  const [playerAId, playerBId] = pairKey.split(":") as [string, string];

  return (
    <ModulePageShell
      title={pairDisplayName(playerAId, playerBId, roster)}
      subtitle="Doubles partnership history (A/B = B/A)"
    >
      <Link
        href={matchesTabHref("doubles-teams")}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="rounded-card border border-border bg-surface p-4">
        <p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">Overall</p>
        <p className="mt-2 text-xl font-semibold tabular-nums">
          {record ? formatRecord(record) : "0–0"}
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          Dual {record ? formatRecord(record.dual) : "0–0"} · Tournament{" "}
          {record ? formatRecord(record.tournament) : "0–0"}
        </p>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-text-secondary">No matches for this partnership.</p>
      ) : (
        <section className="overflow-hidden rounded-card border border-border bg-surface">
          <ul className="divide-y divide-border">
            {history.map((row) => (
              <li key={row.id} className="grid gap-1 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_auto_auto]">
                <Link href={matchesEventPath(row.event.id)} className="font-semibold hover:underline">
                  {eventDisplayTitle(row.event)}
                </Link>
                <span className="text-text-secondary">{formatOpponentLine(row)}</span>
                <span className="tabular-nums">{row.scoreText ?? "—"}</span>
                <span className="font-semibold">
                  {row.winnerSide === "denison" ? "W" : row.winnerSide === "opponent" ? "L" : "—"}
                </span>
                <p className="md:col-span-4 text-[11px] text-text-secondary">
                  {formatDate(row.matchDate ?? row.event.startDate)} · {row.status}
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
