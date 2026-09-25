"use client";

import { formatMonitoringTimestamp } from "../resultsCheckStatus";
import type { TodayBetaPlayerRow, UtrAgentBatchRunSummary } from "../types";
import BatchRunSummaryBar, { batchRunSummaryFromBatchMetrics } from "./BatchRunSummaryBar";
import UtrBackgroundStatus from "./UtrBackgroundStatus";

type Props = {
  players: TodayBetaPlayerRow[];
  lastBatchFromPage?: UtrAgentBatchRunSummary;
  onComplete: (message: string) => void;
  onViewMissingUtr?: () => void;
};

/**
 * Hosted status and controls for the outbound UTR worker.
 * The browser no longer contacts the machine-local service or performs acquisition itself.
 */
export default function UtrAutomaticCheckSection({
  players,
  lastBatchFromPage,
  onViewMissingUtr,
}: Props) {
  const readyPlayers = players.filter((player) => player.status === "Ready");
  const missingUtrCount = readyPlayers.filter((player) => !player.utrPlayerId).length;
  const lastSummary = lastBatchFromPage
    ? batchRunSummaryFromBatchMetrics(lastBatchFromPage)
    : null;

  return (
    <div className="flex flex-col gap-3">
      <UtrBackgroundStatus />

      {missingUtrCount > 0 && onViewMissingUtr ? (
        <p className="text-xs text-amber-800">
          {missingUtrCount} Rank Board recruit{missingUtrCount === 1 ? "" : "s"} need UTR
          profiles.{" "}
          <button type="button" className="font-semibold underline" onClick={onViewMissingUtr}>
            View missing profiles
          </button>
        </p>
      ) : null}

      {lastSummary ? <BatchRunSummaryBar summary={lastSummary} detailsOpen={false} /> : null}
    </div>
  );
}

export function formatUtrAgentCheckCell(player: TodayBetaPlayerRow): string {
  if (!player.utrPlayerId) return "Not Configured";
  if (!player.utrAgentCheckStatus) return "—";
  const at = player.utrAgentCheckAt
    ? formatMonitoringTimestamp(player.utrAgentCheckAt)
    : "";
  return at ? `${player.utrAgentCheckStatus} · ${at}` : player.utrAgentCheckStatus;
}
