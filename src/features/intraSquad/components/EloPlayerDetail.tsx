"use client";

import { formatPlayedAtLabel } from "../display";
import {
  formatEloChangeFromStart,
  formatEloHistoryChange,
  formatEloRating,
  formatEloResultLabel,
  type EloHistoryEvent,
  type EloRankingRow,
} from "../elo";
import { formatUnfinishedRecord, formatWinLoss, playerNameFor } from "../records";
import type { RosterPlayer } from "../types";

export default function EloPlayerDetail({
  row,
  roster,
}: {
  row: EloRankingRow;
  roster: RosterPlayer[];
}) {
  return (
    <div className="flex flex-col gap-4 p-1">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">Current Elo</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">
            {formatEloRating(row.rating)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">Rank</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">{row.rank}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">Change</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">
            {formatEloChangeFromStart(row.changeFromStart, row.matchesPlayed)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">W-L</dt>
          <dd className="mt-0.5 tabular-nums text-text-primary">{formatWinLoss(row)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">UF</dt>
          <dd className="mt-0.5 tabular-nums text-text-primary">{formatUnfinishedRecord(row)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">Matches</dt>
          <dd className="mt-0.5 tabular-nums text-text-primary">{row.matchesPlayed}</dd>
        </div>
      </dl>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-text-primary">Elo History</h3>
        {row.history.length === 0 ? (
          <p className="text-sm text-text-secondary">No matches yet. Starting rating is 1500.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border/80">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border/70 bg-background/40">
                  {["Date", "Opponent", "Result", "Weight", "Elo Before", "Change", "Elo After"].map(
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
                  <EloHistoryRow key={`${event.matchId}-${event.playerId}`} event={event} roster={roster} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EloHistoryRow({
  event,
  roster,
}: {
  event: EloHistoryEvent;
  roster: RosterPlayer[];
}) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
        {formatPlayedAtLabel(event.playedAt)}
      </td>
      <td className="px-3 py-2 text-sm text-text-primary">
        {playerNameFor(event.opponentId, roster)}
      </td>
      <td className="px-3 py-2 text-sm text-text-primary">{formatEloResultLabel(event.outcome)}</td>
      <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{event.weight}</td>
      <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
        {formatEloRating(event.ratingBefore)}
      </td>
      <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
        {formatEloHistoryChange(event.ratingChange)}
      </td>
      <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
        {formatEloRating(event.ratingAfter)}
      </td>
    </tr>
  );
}
