"use client";

import { useMemo, useState } from "react";

import { formatPlayedAtLabel } from "../display";
import {
  buildHeadToHeadRecords,
  headToHeadPlayers,
  headToHeadRecordFor,
  uniqueHeadToHeadMatchupCount,
} from "../headToHead";
import { isUnfinishedMatch } from "../matchPlayers";
import { playerNameFor, playerResultsFromMatch } from "../records";
import type { IntraSquadMatch, RosterPlayer } from "../types";

function recordTone(wins: number, losses: number): string {
  if (wins > losses) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (losses > wins) return "border-red-200 bg-red-50 text-red-700";
  return "border-border bg-surface text-text-primary";
}

export default function HeadToHeadView({
  matches,
  roster,
}: {
  matches: IntraSquadMatch[];
  roster: RosterPlayer[];
}) {
  const records = useMemo(() => buildHeadToHeadRecords(matches), [matches]);
  const players = useMemo(() => headToHeadPlayers(records, roster), [records, roster]);
  const playersWithMatches = players.filter((player) => player.wins + player.losses + player.unfinished > 0);
  const [focusPlayerId, setFocusPlayerId] = useState("all");
  const visiblePlayers =
    focusPlayerId === "all"
      ? playersWithMatches
      : playersWithMatches.filter(
          (player) =>
            player.playerId === focusPlayerId ||
            headToHeadRecordFor(records, focusPlayerId, player.playerId),
        );
  const initialPair = visiblePlayers.length > 1 ? [visiblePlayers[0].playerId, visiblePlayers[1].playerId] : null;
  const [selectedPair, setSelectedPair] = useState<[string, string] | null>(null);
  const pair = selectedPair && visiblePlayers.some((player) => player.playerId === selectedPair[0])
    ? selectedPair
    : initialPair;
  const selected = pair ? headToHeadRecordFor(records, pair[0], pair[1]) : null;
  const completedCount = matches.filter((match) => !isUnfinishedMatch(match)).length;

  return (
    <section className="flex min-w-0 w-full flex-col gap-4" data-intra-squad-head-to-head="">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Head-to-Head</h2>
          <p className="text-xs text-text-secondary">
            Players are ranked by head-to-head win percentage, then wins. Select a matchup to see every result.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
          Focus player
          <select
            className="h-9 rounded-control border border-border bg-surface px-3 text-sm text-text-primary"
            value={focusPlayerId}
            onChange={(event) => {
              setFocusPlayerId(event.target.value);
              setSelectedPair(null);
            }}
          >
            <option value="all">All players</option>
            {playersWithMatches.map((player) => (
              <option key={player.playerId} value={player.playerId}>
                {playerNameFor(player.playerId, roster)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          ["Players", playersWithMatches.length],
          ["Matchups", uniqueHeadToHeadMatchupCount(matches)],
          ["Completed", completedCount],
          ["Unfinished", matches.length - completedCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-card border border-border bg-surface px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {visiblePlayers.length ? (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-app-background text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                <th className="sticky left-0 z-10 min-w-48 bg-app-background px-4 py-3">Player / Overall</th>
                {visiblePlayers.map((player) => (
                  <th key={player.playerId} className="min-w-28 px-2 py-3 text-center normal-case tracking-normal">
                    {playerNameFor(player.playerId, roster)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePlayers.map((player) => (
                <tr key={player.playerId} className="border-b border-border last:border-b-0">
                  <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left">
                    <span className="block font-semibold text-text-primary">
                      {playerNameFor(player.playerId, roster)}
                    </span>
                    <span className="text-xs font-normal tabular-nums text-text-secondary">
                      {player.wins}–{player.losses}
                      {player.winPct == null ? "" : ` · ${Math.round(player.winPct)}%`}
                    </span>
                  </th>
                  {visiblePlayers.map((opponent) => {
                    if (player.playerId === opponent.playerId) {
                      return <td key={opponent.playerId} className="px-2 py-3 text-center text-text-muted">—</td>;
                    }
                    const record = headToHeadRecordFor(records, player.playerId, opponent.playerId);
                    if (!record) {
                      return <td key={opponent.playerId} className="px-2 py-3 text-center text-text-muted">—</td>;
                    }
                    const active = pair?.[0] === player.playerId && pair?.[1] === opponent.playerId;
                    return (
                      <td key={opponent.playerId} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          aria-label={`${playerNameFor(player.playerId, roster)} versus ${playerNameFor(opponent.playerId, roster)}`}
                          onClick={() => setSelectedPair([player.playerId, opponent.playerId])}
                          className={`w-full rounded-control border px-2 py-2 font-semibold tabular-nums transition ${recordTone(record.wins, record.losses)} ${active ? "ring-2 ring-[var(--module-accent)] ring-offset-1" : "hover:border-[var(--module-accent)]"}`}
                        >
                          {record.wins}–{record.losses}
                          {record.unfinished ? (
                            <span className="mt-0.5 block text-[10px] font-medium opacity-75">
                              {record.unfinished} unfinished
                            </span>
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-text-secondary">
          Add intra-squad matches to build head-to-head records.
        </div>
      )}

      {selected && pair ? (
        <div className="rounded-card border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <h3 className="font-semibold text-text-primary">
                {playerNameFor(pair[0], roster)} vs. {playerNameFor(pair[1], roster)}
              </h3>
              <p className="text-xs text-text-secondary">
                {playerNameFor(pair[0], roster)} series record: {selected.wins}–{selected.losses}
                {selected.unfinished ? ` · ${selected.unfinished} unfinished` : ""}
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {selected.matches.map((match) => {
              const result = playerResultsFromMatch(match).find((row) => row.playerId === pair[0]);
              return (
                <div key={match.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[8rem_1fr_auto] sm:items-center">
                  <span className="text-xs text-text-secondary">{formatPlayedAtLabel(match.playedAt)}</span>
                  <span className="font-medium text-text-primary">
                    {result?.outcome === "W"
                      ? `${playerNameFor(pair[0], roster)} won`
                      : result?.outcome === "L"
                        ? `${playerNameFor(pair[1], roster)} won`
                        : `${playerNameFor(pair[0], roster)} ${result?.outcome ?? "unfinished"}`}
                  </span>
                  <span className="tabular-nums text-text-secondary">
                    {result?.perspectiveScoreText || match.scoreText} · Weight {match.weight}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
