"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  getUtrAgentStatusAction,
  runUtrAutomaticCheckAction,
} from "../actions";
import type { TodayBetaPlayerRow, UtrAgentCheckStatus } from "../types";
import type { UtrAgentRunSummary } from "../utrAgentRun";
import { formatMonitoringTimestamp } from "../resultsCheckStatus";

type Props = {
  players: TodayBetaPlayerRow[];
  onComplete: (message: string) => void;
  onViewMissingUtr?: () => void;
};

function agentStatusTone(online: boolean): string {
  return online ? "text-green-700" : "text-red-700";
}

function utrAgentCheckTone(status?: UtrAgentCheckStatus): string {
  switch (status) {
    case "Checked":
      return "text-green-700";
    case "New Results":
      return "text-[var(--module-accent)]";
    case "Needs Review":
      return "text-amber-700";
    case "Auth Required":
      return "text-red-700";
    case "Failed":
      return "text-red-700";
    case "Not Configured":
      return "text-text-secondary";
    default:
      return "text-text-secondary";
  }
}

function formatAfterRunSummary(summary: UtrAgentRunSummary): string {
  const { totals } = summary;
  const duration = formatDurationMs(summary.startedAt, summary.finishedAt);
  return [
    `${totals.recruitsChecked} checked`,
    `${totals.matchesProcessed} recent matches processed`,
    `${totals.matchedExisting} matched existing`,
    `${totals.savedAsNew} NEW`,
    `${totals.needsReview} needs review`,
    `${totals.failed} failed`,
    duration ? `Runtime: ${duration}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatDurationMs(startedAt: string, finishedAt: string): string {
  const ms = Date.parse(finishedAt) - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const seconds = Math.round(ms / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

function formatRecruitRuntime(runtimeMs?: number): string {
  if (runtimeMs == null || !Number.isFinite(runtimeMs)) return "—";
  const seconds = Math.round(runtimeMs / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

function statusLabel(status: UtrAgentCheckStatus): string {
  switch (status) {
    case "Checked":
      return "CHECKED";
    case "New Results":
      return "NEW RESULTS";
    case "Needs Review":
      return "NEEDS REVIEW";
    case "Not Configured":
      return "NOT CONFIGURED";
    case "Auth Required":
      return "AUTH REQUIRED";
    case "Failed":
      return "FAILED";
  }
}

export default function UtrAutomaticCheckSection({
  players,
  onComplete,
  onViewMissingUtr,
}: Props) {
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
  const [batchCheckEnabled, setBatchCheckEnabled] = useState(false);
  const [rankBoardCount, setRankBoardCount] = useState(0);
  const [configuredCount, setConfiguredCount] = useState(0);
  const [missingUtrCount, setMissingUtrCount] = useState(0);
  const [runningMode, setRunningMode] = useState<"isaac-only" | "all" | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<UtrAgentRunSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebugActions, setShowDebugActions] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refreshAgentStatus = useCallback(() => {
    startTransition(async () => {
      const result = await getUtrAgentStatusAction();
      if (result.success) {
        setAgentOnline(result.data.online);
        setBatchCheckEnabled(result.data.batchCheckEnabled);
        setRankBoardCount(result.data.rankBoardCount);
        setConfiguredCount(result.data.configuredCount);
        setMissingUtrCount(result.data.missingUtrCount);
      } else {
        setAgentOnline(false);
      }
    });
  }, []);

  useEffect(() => {
    refreshAgentStatus();
  }, [refreshAgentStatus]);

  const readyPlayers = players.filter((player) => player.status === "Ready");
  const configuredPlayers = readyPlayers.filter((player) => player.utrPlayerId);
  const cohortRankBoard =
    rankBoardCount > 0 ? rankBoardCount : readyPlayers.length;
  const cohortConfigured =
    configuredCount > 0
      ? configuredCount
      : configuredPlayers.length;
  const cohortMissingUtr =
    missingUtrCount > 0
      ? missingUtrCount
      : Math.max(0, cohortRankBoard - cohortConfigured);
  const runQueue =
    runningMode === "isaac-only"
      ? configuredPlayers.filter((player) => player.displayName === "Isaac Lewis")
      : configuredPlayers;

  function runCheck(mode: "isaac-only" | "all") {
    setErrorMessage(null);
    setLastSummary(null);
    setRunningMode(mode);
    setProgressLabel(
      mode === "all"
        ? `Checking UTR Results — 0 / ${cohortConfigured} complete`
        : "Checking UTR results…",
    );

    startTransition(async () => {
      const result = await runUtrAutomaticCheckAction({ mode });
      setRunningMode(null);
      setProgressLabel(null);

      if (!result.success) {
        setErrorMessage(result.error);
        if (result.error.includes("login expired") || result.error.includes("AUTH_REQUIRED")) {
          setErrorMessage("UTR login expired — run npm run utr:login, log in, then retry.");
        }
        return;
      }

      setLastSummary(result.data);
      onComplete(formatAfterRunSummary(result.data));

      if (result.data.stopReason === "AUTH_REQUIRED") {
        setErrorMessage("UTR login expired — run npm run utr:login, log in, then retry.");
      }

      refreshAgentStatus();
    });
  }

  const busy = isPending || runningMode !== null;

  return (
    <section className="rounded-control border border-border/70 bg-surface px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">UTR Automatic Check</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Local Results Agent checks Rank Board recruits with configured UTR profiles.
          </p>
        </div>
        <div className="text-right text-sm">
          <p>
            Agent:{" "}
            <span className={agentStatusTone(Boolean(agentOnline))}>
              {agentOnline === null ? "…" : agentOnline ? "Online" : "Offline"}
            </span>
          </p>
          <p className="text-xs text-text-secondary">
            Rank Board recruits: {cohortRankBoard}
          </p>
          <p className="text-xs text-text-secondary">
            UTR configured: {cohortConfigured}
            {cohortMissingUtr > 0 ? ` · Not configured: ${cohortMissingUtr}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !agentOnline || !batchCheckEnabled || cohortConfigured === 0}
          className="inline-flex h-8 items-center rounded-control border border-[var(--module-accent)] bg-[var(--module-accent)]/10 px-3 text-xs font-semibold text-[var(--module-accent)] disabled:opacity-50"
          onClick={() => runCheck("all")}
        >
          Check {cohortConfigured} Recruit{cohortConfigured === 1 ? "" : "s"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="inline-flex h-8 items-center rounded-control border border-border px-3 text-xs font-semibold text-text-secondary"
          onClick={refreshAgentStatus}
        >
          Refresh Agent
        </button>
        {cohortMissingUtr > 0 && onViewMissingUtr ? (
          <button
            type="button"
            disabled={busy}
            className="inline-flex h-8 items-center rounded-control border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800"
            onClick={onViewMissingUtr}
          >
            View Missing UTR Profiles ({cohortMissingUtr})
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          className="inline-flex h-8 items-center rounded-control border border-border/60 px-2 text-[11px] font-medium text-text-secondary"
          onClick={() => setShowDebugActions((current) => !current)}
        >
          {showDebugActions ? "Hide debug" : "Debug"}
        </button>
      </div>

      {cohortMissingUtr > 0 ? (
        <p className="mt-2 text-xs text-amber-800">
          {cohortMissingUtr} Rank Board recruit{cohortMissingUtr === 1 ? "" : "s"} need UTR
          profiles before automatic checking can run.
        </p>
      ) : null}

      {showDebugActions ? (
        <div className="mt-2">
          <button
            type="button"
            disabled={busy || !agentOnline}
            className="inline-flex h-7 items-center rounded-control border border-border px-2 text-[11px] font-semibold text-text-secondary disabled:opacity-50"
            onClick={() => runCheck("isaac-only")}
          >
            Check Isaac Only
          </button>
        </div>
      ) : null}

      {busy && runQueue.length > 0 ? (
        <div className="mt-3 text-sm text-text-secondary">
          <p className="font-medium text-text-primary">{progressLabel}</p>
          <ul className="mt-2 space-y-1">
            {runQueue.map((player, index) => (
              <li key={player.recruitPersonId ?? player.displayName}>
                {index + 1} / {runQueue.length} {player.displayName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMessage}
        </p>
      ) : null}

      {lastSummary ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-text-primary">{formatAfterRunSummary(lastSummary)}</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-left text-text-secondary">
                  <th className="py-1 pr-3 font-medium">Recruit</th>
                  <th className="py-1 pr-3 font-medium">Status</th>
                  <th className="py-1 pr-3 font-medium">Processed</th>
                  <th className="py-1 pr-3 font-medium">Matched</th>
                  <th className="py-1 pr-3 font-medium">Baseline</th>
                  <th className="py-1 pr-3 font-medium">New</th>
                  <th className="py-1 pr-3 font-medium">Review</th>
                  <th className="py-1 font-medium">Runtime</th>
                </tr>
              </thead>
              <tbody>
                {lastSummary.recruitRows.map((row) => (
                  <tr key={row.recruitPersonId} className="border-b border-border/40">
                    <td className="py-1 pr-3 text-text-primary">{row.displayName}</td>
                    <td className={`py-1 pr-3 font-medium ${utrAgentCheckTone(row.status)}`}>
                      {statusLabel(row.status)}
                    </td>
                    <td className="py-1 pr-3 tabular-nums">{row.matchesProcessed}</td>
                    <td className="py-1 pr-3 tabular-nums">{row.matchedExisting}</td>
                    <td className="py-1 pr-3 tabular-nums">{row.baselineAdded}</td>
                    <td className="py-1 pr-3 tabular-nums">{row.savedAsNew}</td>
                    <td className="py-1 pr-3 tabular-nums">{row.needsReview}</td>
                    <td className="py-1 tabular-nums">{formatRecruitRuntime(row.runtimeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
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
