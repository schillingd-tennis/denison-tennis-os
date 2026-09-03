import EmptyState from "@/components/EmptyState";

import { ELO_STARTING_RATING, formatEloRating } from "../elo";
import { formatMatchValue } from "../matchValue";
import { formatWinLoss, playerNameFor } from "../records";
import type { ProvisionalRankingRow, RosterPlayer } from "../types";
import IntraSquadPlayerName from "./IntraSquadPlayerName";
import styles from "./intraSquadDashboard.module.css";

export default function LiveRankingsPreview({
  rows,
  roster,
  eloByPlayerId,
  matchValueByPlayerId,
  onSelectPlayer,
}: {
  rows: ProvisionalRankingRow[];
  roster: RosterPlayer[];
  eloByPlayerId: ReadonlyMap<string, number>;
  matchValueByPlayerId: ReadonlyMap<string, number>;
  onSelectPlayer?: (playerId: string) => void;
}) {
  return (
    <section data-intra-squad-section="rankings-preview" className={styles.card}>
      <span aria-hidden="true" className={styles.cardAccent} />
      <div className={styles.cardBody}>
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-text-primary">Top 5</h2>
          <p className="text-xs text-text-secondary">Live Rankings</p>
        </div>
        {rows.length === 0 ? (
          <EmptyState compact title="No rankings yet" description="Add an intra-squad match to see the live ranking preview." />
        ) : (
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left">
              <thead>
                <tr className="border-y border-border/60 bg-background/40">
                  {["Rank", "Player", "W-L", "Weighted Pts", "Match Value", "Elo"].map((label) => (
                    <th
                      key={label}
                      className="px-3 py-2 text-[11px] font-semibold tracking-wide text-text-secondary"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.playerId} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{row.rank}</td>
                    <td className="px-3 py-2 text-sm">
                      <IntraSquadPlayerName
                        onClick={onSelectPlayer ? () => onSelectPlayer(row.playerId) : undefined}
                      >
                        {playerNameFor(row.playerId, roster)}
                      </IntraSquadPlayerName>
                    </td>
                    <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatWinLoss(row)}</td>
                    <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
                      {row.weightedNet > 0 ? `+${row.weightedNet}` : String(row.weightedNet)}
                    </td>
                    <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
                      {formatMatchValue(matchValueByPlayerId.get(row.playerId) ?? 0)}
                    </td>
                    <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
                      {formatEloRating(eloByPlayerId.get(row.playerId) ?? ELO_STARTING_RATING)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
