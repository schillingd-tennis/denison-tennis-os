import EmptyState from "@/components/EmptyState";
import { formatDate } from "@/lib/formatting";

import { isUnfinishedMatch, opponentPlayerId, primaryPlayerId } from "../matchPlayers";
import { formatMatchValue, matchValueForMatch } from "../matchValue";
import { formatResultCredit, playerNameFor } from "../records";
import { formatMatchStatusLabel, outcomesForMatchStatus } from "../resultModel";
import type { IntraSquadMatch, RosterPlayer } from "../types";
import IntraSquadPlayerName from "./IntraSquadPlayerName";
import MatchRowActions from "./MatchRowActions";

export default function IntraSquadMatchList({
  matches,
  roster,
  onEdit,
  onDelete,
  onSelectPlayer,
  showLogActions = false,
  emptyTitle = "No matches yet",
  emptyDescription = "Use Quick Match Entry to record the first intra-squad result.",
  stackedOnMobile = true,
  nested = false,
}: {
  matches: IntraSquadMatch[];
  roster: RosterPlayer[];
  onEdit?: (match: IntraSquadMatch) => void;
  onDelete?: (match: IntraSquadMatch) => void;
  onSelectPlayer?: (playerId: string) => void;
  showLogActions?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  stackedOnMobile?: boolean;
  nested?: boolean;
}) {
  if (matches.length === 0) {
    return <EmptyState compact title={emptyTitle} description={emptyDescription} />;
  }

  const headers = [
    "Date",
    "Player / Leader",
    "Opponent",
    "Score",
    "Status",
    "Weight",
    "Result / Credit",
    "Match Value",
  ];
  if (onDelete || showLogActions) headers.push("Actions");

  return (
    <>
      <ul className={stackedOnMobile ? "flex flex-col gap-2 md:hidden" : "hidden"}>
        {matches.map((match) => {
          const unfinished = isUnfinishedMatch(match);
          const outcomes = outcomesForMatchStatus(unfinished ? "unfinished" : "completed");
          const value = matchValueForMatch(match);
          const primaryId = primaryPlayerId(match);
          const opponentId = opponentPlayerId(match);
          return (
            <li
              key={match.id}
              data-intra-squad-match-status={match.status}
              className="flex items-stretch gap-1 rounded-card border border-border/80 bg-surface"
            >
              <div
                role={onEdit ? "button" : undefined}
                tabIndex={onEdit ? 0 : undefined}
                onClick={() => onEdit?.(match)}
                onKeyDown={(event) => {
                  if (!onEdit) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onEdit(match);
                  }
                }}
                className={`min-w-0 flex-1 px-3 py-2.5 text-left ${onEdit ? "cursor-pointer" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">
                    <IntraSquadPlayerName
                      onClick={onSelectPlayer && primaryId ? () => onSelectPlayer(primaryId) : undefined}
                    >
                      {playerNameFor(primaryId, roster)}
                    </IntraSquadPlayerName>
                    <span className="font-normal text-text-secondary">
                      {unfinished ? " leading " : " def. "}
                    </span>
                    <IntraSquadPlayerName
                      onClick={onSelectPlayer && opponentId ? () => onSelectPlayer(opponentId) : undefined}
                    >
                      {playerNameFor(opponentId, roster)}
                    </IntraSquadPlayerName>
                  </p>
                  <p className="shrink-0 text-[11px] text-text-secondary">{formatDate(match.playedAt)}</p>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {match.scoreText} · {formatMatchStatusLabel(match.status)} · Weight {match.weight} ·{" "}
                  {formatResultCredit(outcomes.primary, match.weight)} · MV{" "}
                  {formatMatchValue(value.primary.matchValue)}
                </p>
              </div>
              <div className="flex items-start pr-1.5 pt-1.5">
                <MatchRowActions
                  match={match}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  showEdit={showLogActions}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className={`overflow-x-auto ${nested ? "" : "rounded-card border border-border/80 bg-surface"} ${stackedOnMobile ? "hidden md:block" : ""}`}
      >
        <table className="w-full min-w-[48rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border/70 bg-background/40">
              {headers.map((label) => (
                <th
                  key={label}
                  className={`px-3 py-2 text-[11px] font-semibold tracking-wide text-text-secondary ${
                    label === "Actions" ? "text-right" : ""
                  }`}
                >
                  {label === "Actions" ? (
                    showLogActions ? (
                      label
                    ) : (
                      <span className="sr-only">{label}</span>
                    )
                  ) : (
                    label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => {
              const unfinished = isUnfinishedMatch(match);
              const outcomes = outcomesForMatchStatus(unfinished ? "unfinished" : "completed");
              const value = matchValueForMatch(match);
              const primaryId = primaryPlayerId(match);
              const opponentId = opponentPlayerId(match);
              return (
                <tr
                  key={match.id}
                  data-intra-squad-match-status={match.status}
                  className={`border-b border-border/40 last:border-0 ${onEdit ? "cursor-pointer hover:bg-black/[0.02]" : ""}`}
                  onClick={() => onEdit?.(match)}
                >
                  <td className="px-3 py-2 text-sm text-text-primary">{formatDate(match.playedAt)}</td>
                  <td className="px-3 py-2 text-sm">
                    <IntraSquadPlayerName
                      onClick={onSelectPlayer && primaryId ? () => onSelectPlayer(primaryId) : undefined}
                    >
                      {playerNameFor(primaryId, roster)}
                    </IntraSquadPlayerName>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <IntraSquadPlayerName
                      onClick={onSelectPlayer && opponentId ? () => onSelectPlayer(opponentId) : undefined}
                    >
                      {playerNameFor(opponentId, roster)}
                    </IntraSquadPlayerName>
                  </td>
                  <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{match.scoreText}</td>
                  <td className="px-3 py-2 text-sm text-text-primary">
                    {formatMatchStatusLabel(match.status)}
                  </td>
                  <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{match.weight}</td>
                  <td className={`px-3 py-2 text-sm ${unfinished ? "text-text-primary" : "text-emerald-800"}`}>
                    {formatResultCredit(outcomes.primary, match.weight)}
                  </td>
                  <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
                    {formatMatchValue(value.primary.matchValue)}
                  </td>
                  {onDelete || showLogActions ? (
                    <td className="px-2 py-2 text-right">
                      <MatchRowActions
                        match={match}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        showEdit={showLogActions}
                      />
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
