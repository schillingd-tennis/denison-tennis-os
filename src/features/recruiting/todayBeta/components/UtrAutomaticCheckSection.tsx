"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  fetchUtrAgentHealthFromBrowser,
  requestUtrAgentCheckFromBrowser,
} from "../utrAgentBrowserClient";
import {
  getUtrAgentRecruitRequestsAction,
  getUtrAgentStatusAction,
} from "../actions";
import { formatMonitoringTimestamp } from "../resultsCheckStatus";
import type { TodayBetaPlayerRow, UtrAgentBatchRunSummary } from "../types";
import type { UtrAgentRunSummary } from "../utrAgentRun";
import {
  filterRecruitsForPilot,
  type LiveRecruitRow,
} from "../utrAgentIncremental";
import { runIncrementalUtrAgentBatch } from "../utrAgentIncrementalBatch";
import {
  finalizeIncrementalBatchImport,
  importSingleRecruitToDenison,
} from "../utrAgentIncrementalImport";
import BatchProgressCard, { type BatchProgressState } from "./BatchProgressCard";
import BatchRunSummaryBar, {
  batchRunSummaryFromBatchMetrics,
  batchRunSummaryFromRunSummary,
  type BatchRunSummaryData,
} from "./BatchRunSummaryBar";
import RankBoardBatchTable, { type RankBoardBatchTableRow } from "./RankBoardBatchTable";
import RecentActivityCard from "./RecentActivityCard";
import UtrAutomaticCheckStrip from "./UtrAutomaticCheckStrip";
import { TB_RUN_GRID } from "./todayBetaDashboardStyles";

type RunMode = "isaac-only" | "all" | "two-player";

type Props = {
  players: TodayBetaPlayerRow[];
  lastBatchFromPage?: UtrAgentBatchRunSummary;
  onComplete: (message: string) => void;
  onViewMissingUtr?: () => void;
};

function formatAfterRunSummary(summary: UtrAgentRunSummary): string {
  const { totals } = summary;
  const ms = Date.parse(summary.finishedAt) - Date.parse(summary.startedAt);
  const seconds = Number.isFinite(ms) ? Math.round(ms / 1000) : 0;
  const duration =
    seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
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

export default function UtrAutomaticCheckSection({
  players,
  lastBatchFromPage,
  onComplete,
  onViewMissingUtr,
}: Props) {
  const router = useRouter();
  const batchTableRef = useRef<HTMLElement | null>(null);
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
  const [batchCheckEnabled, setBatchCheckEnabled] = useState(false);
  const [rankBoardCount, setRankBoardCount] = useState(0);
  const [configuredCount, setConfiguredCount] = useState(0);
  const [missingUtrCount, setMissingUtrCount] = useState(0);
  const [runningMode, setRunningMode] = useState<RunMode | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgressState | null>(null);
  const [liveRecruitRows, setLiveRecruitRows] = useState<LiveRecruitRow[]>([]);
  const [lastSummary, setLastSummary] = useState<UtrAgentRunSummary | null>(null);
  const [showRunDetails, setShowRunDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebugActions, setShowDebugActions] = useState(false);
  const [isPending, startTransition] = useTransition();
  const batchRunningRef = useRef(false);

  const refreshAgentStatus = useCallback(() => {
    startTransition(async () => {
      const [health, cohortResult] = await Promise.all([
        fetchUtrAgentHealthFromBrowser(),
        getUtrAgentStatusAction(),
      ]);
      setAgentOnline(health.online);
      if (cohortResult.success) {
        setBatchCheckEnabled(cohortResult.data.batchCheckEnabled);
        setRankBoardCount(cohortResult.data.rankBoardCount);
        setConfiguredCount(cohortResult.data.configuredCount);
        setMissingUtrCount(cohortResult.data.missingUtrCount);
      }
    });
  }, []);

  useEffect(() => {
    refreshAgentStatus();
  }, [refreshAgentStatus]);

  useEffect(() => {
    if (!runningMode) return undefined;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [runningMode]);

  const readyPlayers = players.filter((player) => player.status === "Ready");
  const configuredPlayers = readyPlayers.filter((player) => player.utrPlayerId);
  const cohortConfigured =
    configuredCount > 0 ? configuredCount : configuredPlayers.length;
  const cohortMissingUtr =
    missingUtrCount > 0
      ? missingUtrCount
      : Math.max(0, (rankBoardCount > 0 ? rankBoardCount : readyPlayers.length) - cohortConfigured);

  const isRunning = Boolean(batchProgress?.inProgress || runningMode);

  const idleSummary: BatchRunSummaryData | null = useMemo(() => {
    if (isRunning) return null;
    if (lastSummary) return batchRunSummaryFromRunSummary(lastSummary);
    if (lastBatchFromPage) return batchRunSummaryFromBatchMetrics(lastBatchFromPage);
    return null;
  }, [isRunning, lastBatchFromPage, lastSummary]);

  const tableRows: RankBoardBatchTableRow[] = useMemo(() => {
    const sourceRows =
      liveRecruitRows.length > 0
        ? liveRecruitRows
        : lastSummary?.recruitRows.map((row) => ({ ...row, liveStatus: row.status })) ?? [];

    if (sourceRows.length === 0) return [];

    const lastCheckedByPersonId = new Map(
      players.map((player) => [
        player.recruitPersonId ?? player.displayName,
        player.utrAgentCheckAt ?? player.utrLastCheckedAt ?? player.lastCheckedAt,
      ]),
    );

    return sourceRows.map((row) => ({
      ...row,
      lastCheckedAt: lastCheckedByPersonId.get(row.recruitPersonId),
    }));
  }, [lastSummary, liveRecruitRows, players]);

  function scrollToBatchTable() {
    setShowRunDetails(true);
    window.requestAnimationFrame(() => {
      batchTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function runIncrementalCheck(mode: RunMode) {
    if (batchRunningRef.current) return;
    batchRunningRef.current = true;
    setErrorMessage(null);
    setLastSummary(null);
    setLiveRecruitRows([]);
    setBatchProgress(null);
    setShowRunDetails(false);
    setRunningMode(mode);

    try {
      const recruitsResult = await getUtrAgentRecruitRequestsAction();
      if (!recruitsResult.success) {
        setErrorMessage(recruitsResult.error);
        return;
      }

      const recruitRequests = filterRecruitsForPilot(recruitsResult.data, mode);
      if (recruitRequests.length === 0) {
        setErrorMessage("No recruits matched this check mode.");
        return;
      }

      const runId = crypto.randomUUID();
      const startedAt = new Date().toISOString();
      const configured = recruitRequests.filter((recruit) => Boolean(recruit.utrPlayerId)).length;
      setBatchProgress({
        completed: 0,
        total: recruitRequests.length,
        currentName: recruitRequests[0]?.displayName,
        startedAt,
        inProgress: true,
        totals: {
          completed: 0,
          savedAsBaseline: 0,
          savedAsNew: 0,
          needsReview: 0,
          failed: 0,
        },
      });

      const result = await runIncrementalUtrAgentBatch({
        recruitRequests,
        runId,
        startedAt,
        cohortSize: recruitRequests.length,
        configured,
        checkOneRecruit: async (recruit) =>
          requestUtrAgentCheckFromBrowser({
            mode: "all",
            recruits: [recruit],
          }),
        importOneRecruit: (agentResult) => importSingleRecruitToDenison({ agentResult }),
        finalizeBatch: finalizeIncrementalBatchImport,
        onProgress: (progress) => {
          setLiveRecruitRows(progress.liveRows);
          setBatchProgress({
            completed: progress.completed,
            total: progress.total,
            currentName: progress.currentName,
            startedAt,
            inProgress: true,
            totals: {
              completed: progress.totals.recruitsChecked,
              savedAsBaseline: progress.totals.savedAsBaseline,
              savedAsNew: progress.totals.savedAsNew,
              needsReview: progress.totals.needsReview,
              failed: progress.totals.failed,
            },
          });
          router.refresh?.();
        },
      });

      setBatchProgress(null);
      setLiveRecruitRows(
        result.recruitRows.map((row) => ({
          ...row,
          liveStatus: row.status,
        })),
      );

      if (result.summary) {
        setLastSummary(result.summary);
        onComplete(formatAfterRunSummary(result.summary));
      }

      if (result.stopReason === "AUTH_REQUIRED") {
        setErrorMessage("UTR login expired — run npm run utr:login, log in, then retry.");
      }

      refreshAgentStatus();
      router.refresh?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "UTR automatic check failed.";
      if (message === "AGENT_OFFLINE") {
        setErrorMessage(
          "UTR Results Agent is offline. Run npm run utr:agent on this Mac, then refresh.",
        );
      } else if (message === "AGENT_BUSY") {
        setErrorMessage("UTR Results Agent is busy with another check.");
      } else if (message === "AGENT_FORBIDDEN") {
        setErrorMessage(
          "Browser origin not allowed by the local agent. Use Denison OS on localhost or denison-tennis-os.vercel.app.",
        );
      } else {
        setErrorMessage(message);
      }
    } finally {
      batchRunningRef.current = false;
      setRunningMode(null);
      setBatchProgress(null);
    }
  }

  const busy = isPending || runningMode !== null;

  return (
    <div className="flex flex-col gap-3">
      <UtrAutomaticCheckStrip
        agentOnline={agentOnline}
        cohortConfigured={cohortConfigured}
        busy={busy}
        batchCheckEnabled={batchCheckEnabled}
        showDebugActions={showDebugActions}
        onRunAll={() => runIncrementalCheck("all")}
        onRefresh={refreshAgentStatus}
        onToggleDebug={() => setShowDebugActions((current) => !current)}
        onRunIsaacOnly={() => runIncrementalCheck("isaac-only")}
        onRunTwoPlayer={() => runIncrementalCheck("two-player")}
      />

      {cohortMissingUtr > 0 && onViewMissingUtr ? (
        <p className="text-xs text-amber-800">
          {cohortMissingUtr} Rank Board recruit{cohortMissingUtr === 1 ? "" : "s"} need UTR profiles.{" "}
          <button type="button" className="font-semibold underline" onClick={onViewMissingUtr}>
            View missing profiles
          </button>
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMessage}
        </p>
      ) : null}

      {isRunning && batchProgress ? (
        <div className={TB_RUN_GRID}>
          <BatchProgressCard progress={batchProgress} />
          <RecentActivityCard rows={liveRecruitRows} onViewAll={scrollToBatchTable} />
        </div>
      ) : null}

      {!isRunning && idleSummary ? (
        <BatchRunSummaryBar
          summary={idleSummary}
          detailsOpen={showRunDetails}
          onViewDetails={
            tableRows.length > 0
              ? () => {
                  setShowRunDetails((current) => !current);
                  if (!showRunDetails) {
                    window.requestAnimationFrame(() => {
                      batchTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  }
                }
              : undefined
          }
        />
      ) : null}

      {showRunDetails && tableRows.length > 0 ? (
        <RankBoardBatchTable rows={tableRows} tableRef={batchTableRef} />
      ) : null}
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
