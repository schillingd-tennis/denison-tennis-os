"use client";

import { useState } from "react";

import { formatPlayedAtLabel } from "../display";
import {
  ELO_STARTING_RATING,
  formatEloChangeFromStart,
  formatEloHistoryChange,
  formatEloRating,
  formatEloResultLabel,
  type EloRankingRow,
} from "../elo";
import {
  formatFullMatchRecord,
  formatMatchCompletenessLabel,
  formatMatchValue,
  formatMatchValueResultLabel,
  formatOneSetRecord,
  formatSetsRecord,
  formatSignedDiff,
  type MatchValueRankingRow,
} from "../matchValue";
import {
  formatResultCredit,
  formatUnfinishedRecord,
  formatWinLoss,
  playerNameFor,
  playerResultsFromMatch,
} from "../records";
import { formatMatchStatusLabel } from "../resultModel";
import type { IntraSquadMatch, PlayerRecord, ProvisionalRankingRow, RosterPlayer } from "../types";
import { formatWinPct } from "./IntraSquadSummaryCards";

export type IntraSquadPlayerDetailContext = "rankings" | "records" | "match-value" | "elo";

const CONTEXT_TABS: { id: IntraSquadPlayerDetailContext; label: string }[] = [
  { id: "rankings", label: "Overview" },
  { id: "records", label: "Results" },
  { id: "match-value", label: "Match Value" },
  { id: "elo", label: "Elo" },
];

export function playerDetailSubtitle(context: IntraSquadPlayerDetailContext): string {
  switch (context) {
    case "rankings":
      return "Ranking breakdown · Intra Squad";
    case "records":
      return "Player record · Intra Squad";
    case "match-value":
      return "Match Value breakdown · Intra Squad";
    case "elo":
      return "Elo breakdown · Intra Squad";
  }
}

export default function IntraSquadPlayerDetail({
  playerId,
  context,
  matches,
  roster,
  record,
  rankingRow,
  matchValueRow,
  eloRow,
}: {
  playerId: string;
  context: IntraSquadPlayerDetailContext;
  matches: IntraSquadMatch[];
  roster: RosterPlayer[];
  record: PlayerRecord | null;
  rankingRow: ProvisionalRankingRow | null;
  matchValueRow: MatchValueRankingRow | null;
  eloRow: EloRankingRow | null;
}) {
  const [active, setActive] = useState<IntraSquadPlayerDetailContext>(context);
  const playerMatches = matches.filter((match) => {
    const [a, b] = playerResultsFromMatch(match);
    return a.playerId === playerId || b.playerId === playerId;
  });

  return (
    <div className="flex flex-col gap-4 p-1" data-intra-squad-player-detail={active}>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Player detail views">
        {CONTEXT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            data-intra-squad-player-detail-tab={tab.id}
            onClick={() => setActive(tab.id)}
            className={`h-8 rounded-control px-2.5 text-xs font-semibold ${
              active === tab.id
                ? "bg-[var(--module-accent)] text-white"
                : "border border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "rankings" ? (
        <RankingsBreakdown
          playerId={playerId}
          roster={roster}
          record={record}
          rankingRow={rankingRow}
          matches={playerMatches}
        />
      ) : null}
      {active === "records" ? (
        <RecordsBreakdown
          playerId={playerId}
          roster={roster}
          record={record}
          rankingRow={rankingRow}
          matchValueRow={matchValueRow}
          eloRow={eloRow}
          matches={playerMatches}
        />
      ) : null}
      {active === "match-value" ? (
        <MatchValueBreakdown
          playerId={playerId}
          roster={roster}
          rankingRow={rankingRow}
          matchValueRow={matchValueRow}
          eloRow={eloRow}
        />
      ) : null}
      {active === "elo" ? <EloBreakdown row={eloRow} roster={roster} record={record} /> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wide text-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-sm tabular-nums text-text-primary">{value}</dd>
    </div>
  );
}

function RankingsBreakdown({
  playerId,
  roster,
  record,
  rankingRow,
  matches,
}: {
  playerId: string;
  roster: RosterPlayer[];
  record: PlayerRecord | null;
  rankingRow: ProvisionalRankingRow | null;
  matches: IntraSquadMatch[];
}) {
  const credits = matches.flatMap((match) => {
    const results = playerResultsFromMatch(match);
    return results.filter((row) => row.playerId === playerId);
  });
  const creditSum = credits.reduce((sum, row) => sum + row.weightedValue, 0);

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Stat label="Rank" value={rankingRow?.rank ?? "—"} />
        <Stat
          label="Weighted Points"
          value={
            record
              ? record.weightedNet > 0
                ? `+${record.weightedNet}`
                : String(record.weightedNet)
              : "—"
          }
        />
        <Stat label="W-L" value={record ? formatWinLoss(record) : "0–0"} />
        <Stat label="Win %" value={formatWinPct(record?.winPct ?? null)} />
        <Stat label="UF" value={record ? formatUnfinishedRecord(record) : "0–0"} />
        <Stat label="Matches" value={record?.matchesPlayed ?? 0} />
      </dl>
      <HistoryTable
        title="Weighted Points History"
        empty="No results yet."
        headers={["Date", "Opponent", "Result", "Status", "Score", "Weight", "Weighted Credit"]}
        rows={[...credits].reverse().map((row) => [
          formatPlayedAtLabel(row.playedAt),
          playerNameFor(row.opponentId, roster),
          formatMatchValueResultLabel(row.outcome),
          formatMatchStatusLabel(row.status),
          row.perspectiveScoreText || row.scoreText,
          String(row.weight),
          formatResultCredit(row.outcome, row.weight),
        ])}
      />
      <p className="text-xs text-text-secondary">
        Credit sum: {creditSum > 0 ? `+${creditSum}` : String(creditSum)}
      </p>
    </div>
  );
}

function RecordsBreakdown({
  playerId,
  roster,
  record,
  rankingRow,
  matchValueRow,
  eloRow,
  matches,
}: {
  playerId: string;
  roster: RosterPlayer[];
  record: PlayerRecord | null;
  rankingRow: ProvisionalRankingRow | null;
  matchValueRow: MatchValueRankingRow | null;
  eloRow: EloRankingRow | null;
  matches: IntraSquadMatch[];
}) {
  const setPct =
    matchValueRow && matchValueRow.setsWon + matchValueRow.setsLost > 0
      ? ((matchValueRow.setsWon / (matchValueRow.setsWon + matchValueRow.setsLost)) * 100).toFixed(0) +
        "%"
      : "—";
  const gamePct =
    matchValueRow && matchValueRow.gamesWon + matchValueRow.gamesLost > 0
      ? ((matchValueRow.gamesWon / (matchValueRow.gamesWon + matchValueRow.gamesLost)) * 100).toFixed(0) +
        "%"
      : "—";

  const rows = matches.flatMap((match) => {
    const results = playerResultsFromMatch(match);
    return results
      .filter((row) => row.playerId === playerId)
      .map((row) => [
        formatPlayedAtLabel(row.playedAt),
        playerNameFor(row.opponentId, roster),
        formatMatchValueResultLabel(row.outcome),
        formatMatchStatusLabel(row.status),
        row.perspectiveScoreText || row.scoreText,
        String(row.weight),
        formatResultCredit(row.outcome, row.weight),
      ]);
  });

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Stat label="Matches" value={record?.matchesPlayed ?? 0} />
        <Stat label="W-L" value={record ? formatWinLoss(record) : "0–0"} />
        <Stat label="Win %" value={formatWinPct(record?.winPct ?? null)} />
        <Stat label="UF" value={record ? formatUnfinishedRecord(record) : "0–0"} />
        <Stat label="Sets W-L" value={matchValueRow ? formatSetsRecord(matchValueRow) : "0–0"} />
        <Stat label="Set %" value={setPct} />
        <Stat
          label="Games W-L"
          value={
            matchValueRow ? `${matchValueRow.gamesWon}–${matchValueRow.gamesLost}` : "0–0"
          }
        />
        <Stat label="Game %" value={gamePct} />
        <Stat
          label="Weighted Pts"
          value={
            rankingRow
              ? rankingRow.weightedNet > 0
                ? `+${rankingRow.weightedNet}`
                : String(rankingRow.weightedNet)
              : "—"
          }
        />
        <Stat
          label="Match Value"
          value={
            matchValueRow
              ? formatMatchValue(matchValueRow.totalMatchValue, {
                  emptyWhenZeroMatches: true,
                  matchesPlayed: matchValueRow.matchesPlayed,
                })
              : "—"
          }
        />
        <Stat label="Elo" value={eloRow ? formatEloRating(eloRow.rating) : String(ELO_STARTING_RATING)} />
      </dl>
      <HistoryTable
        title="Complete Results"
        empty="No results yet."
        headers={["Date", "Opponent", "Result", "Status", "Score", "Weight", "Credit"]}
        rows={[...rows].reverse()}
      />
    </div>
  );
}

function MatchValueBreakdown({
  playerId,
  roster,
  rankingRow,
  matchValueRow,
  eloRow,
}: {
  playerId: string;
  roster: RosterPlayer[];
  rankingRow: ProvisionalRankingRow | null;
  matchValueRow: MatchValueRankingRow | null;
  eloRow: EloRankingRow | null;
}) {
  const history = matchValueRow?.history ?? [];
  const sum = history.reduce((total, row) => total + row.matchValue, 0);

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Stat
          label="Match Value"
          value={
            matchValueRow
              ? formatMatchValue(matchValueRow.totalMatchValue, {
                  emptyWhenZeroMatches: true,
                  matchesPlayed: matchValueRow.matchesPlayed,
                })
              : "—"
          }
        />
        <Stat label="MV Rank" value={matchValueRow?.rank ?? "—"} />
        <Stat label="Elo" value={eloRow ? formatEloRating(eloRow.rating) : String(ELO_STARTING_RATING)} />
        <Stat
          label="Weighted Pts"
          value={
            rankingRow
              ? rankingRow.weightedNet > 0
                ? `+${rankingRow.weightedNet}`
                : String(rankingRow.weightedNet)
              : "—"
          }
        />
        <Stat label="Full W-L" value={matchValueRow ? formatFullMatchRecord(matchValueRow) : "0–0"} />
        <Stat label="1-Set W-L" value={matchValueRow ? formatOneSetRecord(matchValueRow) : "0–0"} />
        <Stat
          label="UF"
          value={matchValueRow ? formatUnfinishedRecord(matchValueRow) : "0–0"}
        />
        <Stat label="Sets W-L" value={matchValueRow ? formatSetsRecord(matchValueRow) : "0–0"} />
        <Stat label="Set Diff" value={matchValueRow ? formatSignedDiff(matchValueRow.setDiff) : "0"} />
        <Stat
          label="Games W-L"
          value={
            matchValueRow ? `${matchValueRow.gamesWon}–${matchValueRow.gamesLost}` : "0–0"
          }
        />
        <Stat label="Game Diff" value={matchValueRow ? formatSignedDiff(matchValueRow.gameDiff) : "0"} />
        <Stat
          label="Avg Weight"
          value={matchValueRow?.averageWeight == null ? "—" : matchValueRow.averageWeight.toFixed(2)}
        />
      </dl>
      <HistoryTable
        title="Match Value History"
        empty="No matches yet."
        headers={[
          "Date",
          "Opponent",
          "Status",
          "Score",
          "Weight",
          "Sets W-L",
          "Games W-L",
          "Base Value",
          "Final Match Value",
        ]}
        rows={[...history].reverse().map((event) => [
          formatPlayedAtLabel(event.playedAt),
          playerNameFor(event.opponentId, roster),
          formatMatchCompletenessLabel(event.completeness),
          event.scoreText,
          String(event.weight),
          `${event.setsWon}–${event.setsLost}`,
          `${event.gamesWon}–${event.gamesLost}`,
          formatMatchValue(event.baseValue),
          formatMatchValue(event.matchValue),
        ])}
      />
      <p className="text-xs text-text-secondary" data-intra-squad-mv-sum="">
        Match Value sum: {formatMatchValue(sum)}
        {playerId ? "" : ""}
      </p>
    </div>
  );
}

function EloBreakdown({
  row,
  roster,
  record,
}: {
  row: EloRankingRow | null;
  roster: RosterPlayer[];
  record: PlayerRecord | null;
}) {
  if (!row) {
    return <p className="text-sm text-text-secondary">No Elo history yet. Starting rating is 1500.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Stat label="Current Elo" value={formatEloRating(row.rating)} />
        <Stat label="Elo Rank" value={row.rank} />
        <Stat
          label="Change"
          value={formatEloChangeFromStart(row.changeFromStart, row.matchesPlayed)}
        />
        <Stat label="W-L" value={record ? formatWinLoss(record) : formatWinLoss(row)} />
        <Stat label="UF" value={record ? formatUnfinishedRecord(record) : formatUnfinishedRecord(row)} />
        <Stat label="Matches" value={row.matchesPlayed} />
      </dl>
      <HistoryTable
        title="Elo History"
        empty="No matches yet. Starting rating is 1500."
        headers={["Date", "Opponent", "Result", "Weight", "Elo Before", "Expected", "Actual", "Change", "Elo After"]}
        rows={[...row.history].reverse().map((event) => [
          formatPlayedAtLabel(event.playedAt),
          playerNameFor(event.opponentId, roster),
          formatEloResultLabel(event.outcome),
          String(event.weight),
          formatEloRating(event.ratingBefore),
          event.expectedResult.toFixed(3),
          event.actualResult.toFixed(2),
          formatEloHistoryChange(event.ratingChange),
          formatEloRating(event.ratingAfter),
        ])}
      />
    </div>
  );
}

function HistoryTable({
  title,
  empty,
  headers,
  rows,
}: {
  title: string;
  empty: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text-primary">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">{empty}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((row, index) => (
              <li
                key={`${title}-m-${index}`}
                className="rounded-card border border-border/70 bg-background/40 px-3 py-2 text-sm"
              >
                {headers.slice(0, 5).map((header, headerIndex) => (
                  <p key={header} className="text-text-primary">
                    <span className="text-xs text-text-secondary">{header}: </span>
                    {row[headerIndex]}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-card border border-border/80 md:block">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border/70 bg-background/40">
                  {headers.map((label) => (
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
                {rows.map((row, index) => (
                  <tr key={`${title}-d-${index}`} className="border-b border-border/40 last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={`${index}-${cellIndex}`} className="px-3 py-2 text-sm tabular-nums text-text-primary">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
