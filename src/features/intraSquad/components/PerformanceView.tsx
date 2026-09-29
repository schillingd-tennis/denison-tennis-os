"use client";

import { useMemo, useState } from "react";

import { formatDate } from "@/lib/formatting";

import { computePerformanceSummary, type PerformanceConfidence } from "../performance";
import { playerNameFor } from "../records";
import { findRosterPlayer, rosterPlayerFullName } from "../roster";
import type { IntraSquadMatch, RosterPlayer } from "../types";
import styles from "./intraSquadDashboard.module.css";

function confidenceTone(confidence: PerformanceConfidence): string {
  if (confidence === "High") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (confidence === "Moderate") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-border bg-app-background text-text-secondary";
}

function signed(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1);
}

function score(value: number): string {
  return value.toFixed(1);
}

function fullPlayerName(playerId: string, roster: readonly RosterPlayer[]): string {
  const player = findRosterPlayer(roster, playerId);
  return player ? rosterPlayerFullName(player) : playerNameFor(playerId, roster);
}

export default function PerformanceView({
  matches,
  roster,
}: {
  matches: IntraSquadMatch[];
  roster: RosterPlayer[];
}) {
  const summary = useMemo(() => computePerformanceSummary(matches, roster), [matches, roster]);
  const active = summary.standings.filter((row) => row.matches.length > 0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const selected = active.find((row) => row.playerId === selectedPlayerId) ?? active[0] ?? null;
  const latest = selected?.matches[0] ?? null;

  return (
    <section className="flex min-w-0 w-full flex-col gap-4" data-intra-squad-performance="">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Performance Dashboard</h2>
        <p className="text-xs text-text-secondary">
          Intra-Squad Performance Score (IPS) balances results, diminishing match importance, match completion,
          and a small pre-match Elo opponent adjustment.
        </p>
      </div>

      <section aria-label="Performance summary" className={styles.metricsCard}>
        {[
          ["Team IPS average", summary.teamIps == null ? "—" : score(summary.teamIps), "Evidence-weighted"],
          ["Completed equivalents", score(summary.completedEquivalents), "Team matches"],
          ["Quality wins", String(Math.round(summary.qualityWins)), "Wins above Elo expectation"],
          ["Confidence", summary.confidence, "Based on evidence volume"],
        ].map(([label, value, detail]) => (
          <article key={label} className={styles.metric}>
            <p className="text-base leading-none font-semibold tabular-nums tracking-tight text-text-primary">{value}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-text-secondary">{label}</p>
            <p className="mt-1 text-[10px] text-text-secondary">{detail}</p>
          </article>
        ))}
      </section>

      {active.length ? (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-text-primary">IPS Leaderboard</h3>
            <p className="text-xs text-text-secondary">Select a player to update the dashboard breakdown below.</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-app-background text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                <th className="w-16 px-4 py-3">Rank</th>
                <th className="px-3 py-3">Player</th>
                <th className="px-3 py-3 text-right">IPS</th>
                <th className="px-3 py-3 text-right">Adjusted win %</th>
                <th className="px-3 py-3 text-right">Vs expected</th>
                <th className="px-3 py-3 text-right">Quality wins</th>
                <th className="px-4 py-3 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {active.map((row) => {
                const isSelected = selected?.playerId === row.playerId;
                return (
                  <tr
                    key={row.playerId}
                    onClick={() => setSelectedPlayerId(row.playerId)}
                    className={`cursor-pointer border-b border-border last:border-b-0 ${isSelected ? "bg-emerald-50/70" : "hover:bg-app-background"}`}
                  >
                    <td className="px-4 py-3 font-semibold tabular-nums text-text-secondary">{row.rank}</td>
                    <td className="px-3 py-3">
                      <span className="block font-semibold text-text-primary">{fullPlayerName(row.playerId, roster)}</span>
                      <span className="text-xs text-text-secondary">{score(row.completedEquivalents)} completed equivalents</span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-text-primary">{score(row.ips)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-text-primary">{Math.round(row.adjustedWinPct)}%</td>
                    <td className={`px-3 py-3 text-right font-semibold tabular-nums ${row.versusExpected >= 0 ? "text-emerald-700" : "text-red-700"}`}>{signed(row.versusExpected)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-text-primary">{row.qualityWins}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${confidenceTone(row.confidence)}`}>{row.confidence}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-text-secondary">
          Add intra-squad matches to calculate performance scores.
        </div>
      )}

      {selected ? (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-card border border-border bg-surface p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Player breakdown</p>
                <h3 className="text-lg font-semibold text-text-primary">{fullPlayerName(selected.playerId, roster)}</h3>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums text-text-primary">{score(selected.ips)}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">IPS</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Result quality", `${Math.round(selected.resultQuality)}%`],
                ["Match importance", `${selected.averageImportance.toFixed(2)}×`],
                ["Completion", `${Math.round(selected.completionQuality)}%`],
                ["Opponent strength", `${Math.round(selected.opponentStrength)}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-control bg-app-background px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-text-primary">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-border bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Latest evidence</p>
            {latest ? (
              <div className="mt-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">
                      {latest.outcome === "W" ? "Win" : latest.outcome === "L" ? "Loss" : latest.outcome === "leading" ? "Unfinished lead" : "Unfinished trail"}
                      {" vs. "}{fullPlayerName(latest.opponentId, roster)}
                    </p>
                    <p className="text-xs text-text-secondary">{formatDate(latest.playedAt)} · {latest.scoreText}</p>
                  </div>
                  <span className={`shrink-0 font-semibold tabular-nums ${latest.versusExpected >= 0 ? "text-emerald-700" : "text-red-700"}`}>{signed(latest.versusExpected * 100)} vs expected</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-control bg-app-background p-2"><p className="text-[10px] uppercase text-text-secondary">Importance</p><p className="font-semibold">{latest.importance.toFixed(1)}×</p></div>
                  <div className="rounded-control bg-app-background p-2"><p className="text-[10px] uppercase text-text-secondary">Completion</p><p className="font-semibold">{Math.round(latest.completion * 100)}%</p></div>
                  <div className="rounded-control bg-app-background p-2"><p className="text-[10px] uppercase text-text-secondary">Opponent Elo</p><p className="font-semibold">{Math.round(latest.opponentRating)}</p></div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <details className="rounded-card border border-border bg-surface px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-text-primary">How IPS is calculated</summary>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-text-secondary sm:grid-cols-2">
          <p><strong className="text-text-primary">Importance:</strong> Match 1 = 1.0×, Match 2 = 1.5×, Match 3 = 2.0×.</p>
          <p><strong className="text-text-primary">Completion:</strong> Full match = 100%, one-set match = 45%, unfinished = 20–65% based on progress.</p>
          <p><strong className="text-text-primary">Opponent:</strong> Pre-match Elo changes expectation slightly; outperforming expectation lifts IPS.</p>
          <p><strong className="text-text-primary">Confidence:</strong> Building, Moderate, or High reflects completed-equivalent evidence, not player quality.</p>
        </div>
      </details>
    </section>
  );
}
