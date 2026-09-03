"use client";

import { formatPlayedAtLabel } from "../display";
import { formatEloRating } from "../elo";
import {
  formatFullMatchRecord,
  formatMatchCompletenessLabel,
  formatMatchValue,
  formatMatchValueResultLabel,
  formatOneSetRecord,
  type MatchValueHistoryEvent,
  type MatchValueRankingRow,
} from "../matchValue";
import { formatUnfinishedRecord, playerNameFor } from "../records";
import type { RosterPlayer } from "../types";

export default function MatchValuePlayerDetail({
  row,
  roster,
}: {
  row: MatchValueRankingRow;
  roster: RosterPlayer[];
}) {
  return (
    <div className="flex flex-col gap-4 p-1">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">Match Value</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">
            {formatMatchValue(row.totalMatchValue, {
              emptyWhenZeroMatches: true,
              matchesPlayed: row.matchesPlayed,
            })}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">Elo</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">
            {formatEloRating(row.elo)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">Avg Weight</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">
            {row.averageWeight == null ? "—" : row.averageWeight.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">Full W-L</dt>
          <dd className="mt-0.5 tabular-nums text-text-primary">{formatFullMatchRecord(row)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">1-Set W-L</dt>
          <dd className="mt-0.5 tabular-nums text-text-primary">{formatOneSetRecord(row)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">UF</dt>
          <dd className="mt-0.5 tabular-nums text-text-primary">{formatUnfinishedRecord(row)}</dd>
        </div>
      </dl>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-text-primary">Match Value History</h3>
        {row.history.length === 0 ? (
          <p className="text-sm text-text-secondary">No matches yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border/80">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border/70 bg-background/40">
                  {["Date", "Opponent", "Result", "Score", "Type", "Weight", "Base Value", "Match Value"].map(
                    (label) => (
                      <th
                        key={label}
                        className="px-3 py-2 text-[11px] font-semibold tracking-wide text-text-secondary"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {[...row.history].reverse().map((event) => (
                  <HistoryRow key={`${event.matchId}-${event.playerId}`} event={event} roster={roster} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  event,
  roster,
}: {
  event: MatchValueHistoryEvent;
  roster: RosterPlayer[];
}) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
        {formatPlayedAtLabel(event.playedAt)}
      </td>
      <td className="px-3 py-2 text-sm text-text-primary">{playerNameFor(event.opponentId, roster)}</td>
      <td className="px-3 py-2 text-sm text-text-primary">{formatMatchValueResultLabel(event.outcome)}</td>
      <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{event.scoreText}</td>
      <td className="px-3 py-2 text-sm text-text-primary">
        {formatMatchCompletenessLabel(event.completeness)}
      </td>
      <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{event.weight}</td>
      <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatMatchValue(event.baseValue)}</td>
      <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatMatchValue(event.matchValue)}</td>
    </tr>
  );
}
