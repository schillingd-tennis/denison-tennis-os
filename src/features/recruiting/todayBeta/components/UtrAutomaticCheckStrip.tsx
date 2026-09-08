"use client";

import { RefreshCw, ShieldCheck } from "lucide-react";

import { EMPTY_VALUE, formatDate, formatTime } from "@/lib/formatting";

import { UTR_AGENT_BASE_URL } from "../utrAgentConfig";
import { TB_BTN_PRIMARY, TB_BTN_SECONDARY, TB_STRIP, TB_SECTION_SUBTITLE, TB_SECTION_TITLE } from "./todayBetaDashboardStyles";

type Props = {
  agentOnline: boolean | null;
  /** true = authenticated, false = expired/auth failure, null = unknown */
  sessionAuthenticated?: boolean | null;
  lastStatusCheckedAt?: string | null;
  agentStartedAt?: string | null;
  statusErrorSummary?: string | null;
  cohortConfigured: number;
  busy: boolean;
  batchCheckEnabled: boolean;
  showDebugActions: boolean;
  onRunAll: () => void;
  onRefresh: () => void;
  onToggleDebug: () => void;
  onRunIsaacOnly: () => void;
  onRunTwoPlayer: () => void;
};

function formatStatusTimestamp(iso: string | null | undefined): string {
  if (!iso) return EMPTY_VALUE;
  const date = formatDate(iso);
  const time = formatTime(iso);
  if (date === EMPTY_VALUE && time === EMPTY_VALUE) return EMPTY_VALUE;
  if (date === EMPTY_VALUE) return time;
  if (time === EMPTY_VALUE) return date;
  return `${date} ${time}`;
}

export default function UtrAutomaticCheckStrip({
  agentOnline,
  sessionAuthenticated = null,
  lastStatusCheckedAt = null,
  agentStartedAt = null,
  statusErrorSummary = null,
  cohortConfigured,
  busy,
  batchCheckEnabled,
  showDebugActions,
  onRunAll,
  onRefresh,
  onToggleDebug,
  onRunIsaacOnly,
  onRunTwoPlayer,
}: Props) {
  return (
    <section className={TB_STRIP}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className={TB_SECTION_TITLE}>UTR Automatic Check</h2>
          <p className={TB_SECTION_SUBTITLE}>
            Local Results Agent checks Rank Board recruits with configured UTR profiles.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !agentOnline || !batchCheckEnabled || cohortConfigured === 0}
              className={TB_BTN_PRIMARY}
              onClick={onRunAll}
            >
              Check {cohortConfigured} Recruit{cohortConfigured === 1 ? "" : "s"}
            </button>
            <button type="button" disabled={busy} className={TB_BTN_SECONDARY} onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh Status
            </button>
            {showDebugActions ? (
              <>
                <button
                  type="button"
                  disabled={busy || !agentOnline || !batchCheckEnabled}
                  className={TB_BTN_SECONDARY}
                  onClick={onRunTwoPlayer}
                >
                  Check Isaac + Finn
                </button>
                <button
                  type="button"
                  disabled={busy || !agentOnline}
                  className={TB_BTN_SECONDARY}
                  onClick={onRunIsaacOnly}
                >
                  Check Isaac Only
                </button>
              </>
            ) : null}
            <button type="button" disabled={busy} className={TB_BTN_SECONDARY} onClick={onToggleDebug}>
              {showDebugActions ? "Hide Debug" : "Debug"}
            </button>
          </div>
        </div>

        <div
          className={`shrink-0 rounded-control border px-3 py-2 lg:min-w-[13rem] ${
            sessionAuthenticated === false
              ? "border-amber-200 bg-amber-50/80"
              : agentOnline
                ? "border-green-200 bg-green-50/80"
                : agentOnline === false
                  ? "border-red-200 bg-red-50/80"
                  : "border-border bg-background"
          }`}
        >
          {/* Row 1: Agent connectivity */}
          <div className="flex items-start gap-2">
            <ShieldCheck
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                agentOnline ? "text-green-700" : agentOnline === false ? "text-red-700" : "text-text-secondary"
              }`}
              aria-hidden
            />
            <div>
              <p className="text-xs font-semibold text-text-primary">
                {agentOnline
                  ? "Agent Online"
                  : agentOnline === false
                    ? "Agent Offline"
                    : "Checking agent…"}
              </p>
              <p className="text-[11px] text-text-secondary">{UTR_AGENT_BASE_URL}</p>
              {lastStatusCheckedAt ? (
                <p className="text-[11px] text-text-secondary">
                  Last status check: {formatStatusTimestamp(lastStatusCheckedAt)}
                </p>
              ) : null}
              {agentOnline && agentStartedAt ? (
                <p className="text-[11px] text-text-secondary">
                  Agent started: {formatStatusTimestamp(agentStartedAt)}
                </p>
              ) : null}
              {agentOnline === false && statusErrorSummary ? (
                <p className="mt-1 text-[11px] text-red-800">{statusErrorSummary}</p>
              ) : null}
            </div>
          </div>
          {/* Row 2: UTR session state — only when meaningful */}
          {agentOnline && sessionAuthenticated !== null ? (
            <div className="mt-1.5 border-t border-black/[0.06] pt-1.5">
              <p
                className={`text-[11px] font-semibold ${
                  sessionAuthenticated ? "text-green-700" : "text-amber-700"
                }`}
              >
                UTR Session: {sessionAuthenticated ? "Authenticated" : "Expired — re-login required"}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
