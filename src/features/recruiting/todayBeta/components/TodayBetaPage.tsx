"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import { useDrawerManager } from "@/components/workspace-drawer";
import ModulePageShell from "@/components/ModulePageShell";
import { formatDate } from "@/lib/formatting";
import { recruitingPersonPath } from "@/lib/module-routes";

import {
  dismissResultOpportunityAction,
  markRecruitResultsCheckedNoNewAction,
  parseTrnPasteAction,
  saveTodayBetaMatchResultsAction,
  snoozeCadenceOpportunityAction,
} from "../actions";
import type { ContactOpportunity } from "../contactOpportunityScore";
import {
  formatMonitoringStatusLabel,
  formatMonitoringTimestamp,
  formatUtrAgentLastBatchLabel,
} from "../resultsCheckStatus";
import { formatMatchSourceLabel } from "../utrMatchSource";
import { formatTournamentNameDisplay } from "../formatTournamentNameDisplay";
import { resolveTournamentUrl } from "../tournamentLink";
import {
  additionalRecentResults,
  resultOutcomeLabel,
  sortLatestResultRows,
} from "../latestResults";
import {
  formatLatestResultGradYear,
  formatLatestResultTrnRank,
  formatLatestResultUtr,
} from "../latestResultOpponentContext";
import type { MatchResultOutcome } from "../types";
import type {
  LatestResultEntry,
  LatestResultRow,
  ParsedMatchPreview,
  RecruitMatchResult,
  RecruitUpcomingTournament,
  ResultsMonitoringStatus,
  SaveMatchResultsOutcome,
  TodayBetaActivitySummary,
  TodayBetaPageData,
  TodayBetaPlayerRow,
} from "../types";
import MarkTextSentConfirm from "./MarkTextSentConfirm";
import UpcomingTournamentForm from "./UpcomingTournamentForm";
import UtrCaptureInstructions, { buildUtrResultsUrl } from "./UtrCaptureInstructions";
import UtrAutomaticCheckSection, { formatUtrAgentCheckCell } from "./UtrAutomaticCheckSection";
import UtrProfileForm from "./UtrProfileForm";

const INPUT_CLASS =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-primary";

const TABLE_HEAD_CLASS = "px-3 py-2 text-left text-xs font-semibold text-text-secondary";
const TABLE_CELL_CLASS = "px-3 py-2 text-sm text-text-primary align-top";

/** Shared Today Beta bordered section shell + header/content inset. */
const TODAY_BETA_SECTION_SHELL = "rounded-card border border-border bg-surface";
const TODAY_BETA_SECTION_PADDING = "px-4 pt-4 pb-3";

function TodayBetaSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${TODAY_BETA_SECTION_SHELL} ${TODAY_BETA_SECTION_PADDING} ${className ?? ""}`.trim()}>
      {children}
    </section>
  );
}

type MarkTextSentInput = {
  recruitPersonId: string;
  recruitName: string;
  messageText: string;
  matchResultId?: string | null;
  upcomingTournamentId?: string | null;
};

function formatLastImported(value?: string): string {
  if (!value) return "Never";
  return formatDate(value) ?? value;
}

function monitoringStatusTone(status: ResultsMonitoringStatus): string {
  switch (status) {
    case "NEEDS_CHECK":
      return "font-medium text-amber-700";
    case "CHECKED_TODAY":
      return "font-medium text-green-700";
    case "NEW_RESULTS_FOUND":
      return "font-medium text-[var(--module-accent)]";
  }
}

type MonitoringFilter = "all" | "needs_check" | "checked_today" | "missing_utr";
type ClassFilter = "all" | number;

function resultLabel(result: string): string {
  if (result === "WIN") return "WIN";
  if (result === "LOSS") return "LOSS";
  return "UNKNOWN";
}

function resultTone(result: string): string {
  if (result === "WIN") return "font-semibold text-green-700";
  if (result === "LOSS") return "font-semibold text-red-700";
  return "font-semibold text-text-secondary";
}

function formatLatestResultSummary(entry: LatestResultEntry | null | undefined): string {
  if (!entry) return "—";
  const outcome = resultOutcomeLabel(entry.result.result);
  const opponent = entry.opponent.opponentName || "Unknown";
  return `${outcome} vs ${opponent}`;
}

function formatCadencePriorityLabel(label: string | null): string {
  if (!label) return "Not set";
  if (label.startsWith("1 -")) return "Priority A";
  if (label.startsWith("2 -")) return "Priority B";
  return label;
}

function formatOpponentRank(ranking?: string): string {
  if (!ranking || ranking.trim().toUpperCase() === "UNKNOWN") return "Unknown";
  return `#${ranking.replace(/[^\d]/g, "")}`;
}

function formatDetectionStatusLabel(status: RecruitMatchResult["detectionStatus"]): string {
  return status === "NEW" ? "New result" : "Baseline";
}

function formatMatchDate(result: RecruitMatchResult): string {
  return (
    formatDate(result.tournamentDate) ??
    result.tournamentDateRaw ??
    result.tournamentDate ??
    "Unknown"
  );
}

function ActivitySummarySection({ summary }: { summary: TodayBetaActivitySummary }) {
  const checkedTodayLabel =
    summary.recruitsMonitored === 0
      ? "0 checked today"
      : `${summary.checkedTodayCount} / ${summary.recruitsMonitored} checked today`;

  return (
    <TodayBetaSection>
      <h2 className="text-sm font-semibold text-text-primary">Activity Summary</h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-text-secondary">Rank Board recruits</dt>
          <dd className="font-semibold text-text-primary">{summary.recruitsMonitored}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Checked today</dt>
          <dd className="font-semibold text-text-primary">{checkedTodayLabel}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">New results</dt>
          <dd className="font-semibold text-text-primary">{summary.newResultsCount}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Matches stored</dt>
          <dd className="font-semibold text-text-primary">{summary.matchesStored}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">UTR configured</dt>
          <dd className="font-semibold text-text-primary">{summary.utrConfiguredCount}</dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-text-secondary">Last monitoring activity</dt>
          <dd className="font-semibold text-text-primary">
            {summary.lastMonitoringActivityAt
              ? formatMonitoringTimestamp(summary.lastMonitoringActivityAt)
              : "Never"}
          </dd>
        </div>
        {summary.utrAgentLastBatch ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-text-secondary">UTR agent last run</dt>
            <dd className="font-semibold text-text-primary">
              {formatUtrAgentLastBatchLabel(summary.utrAgentLastBatch)}
            </dd>
          </div>
        ) : null}
      </dl>
    </TodayBetaSection>
  );
}

function NewResultsSection({ results }: { results: TodayBetaPageData["newResults"] }) {
  return (
    <TodayBetaSection className="border-[var(--module-accent)]/30">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-text-primary">New Results</h2>
        <span className="rounded-full bg-[var(--module-accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--module-accent)]">
          Newly detected
        </span>
      </div>
      <p className="mt-1 text-xs text-text-secondary">
        Results first discovered after baseline was established.
      </p>
      {results.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">No new results since the last update.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {results.map((result) => (
            <li
              key={result.id}
              className="rounded-control border-2 border-[var(--module-accent)]/25 bg-background px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-text-primary">{result.recruitName}</span>
                <span className={resultTone(result.result)}>{resultLabel(result.result)}</span>
                <span className="rounded-full border border-[var(--module-accent)]/30 px-2 py-0.5 text-xs font-medium text-[var(--module-accent)]">
                  NEW
                </span>
              </div>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-text-secondary">Opponent</dt>
                  <dd className="text-text-primary">{result.opponentName ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Opponent TRN ranking</dt>
                  <dd className="text-text-primary">{formatOpponentRank(result.opponentRanking)}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Score</dt>
                  <dd className="text-text-primary">{result.score ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Tournament</dt>
                  <dd className="text-text-primary">
                    {formatTournamentNameDisplay(result.tournamentName)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Round</dt>
                  <dd className="text-text-primary">{result.round ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Match / tournament date</dt>
                  <dd className="text-text-primary">{result.tournamentDateLabel}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-text-secondary">
                First detected {result.firstDetectedAtLabel}
              </p>
            </li>
          ))}
        </ul>
      )}
    </TodayBetaSection>
  );
}

const LATEST_RESULT_HEAD_CLASS =
  "px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary";
const LATEST_RESULT_CELL_CLASS =
  "px-3 py-1.5 text-sm text-text-primary align-middle whitespace-nowrap";

/** Primary recruit row — subtle tint only (group boundary is a bottom border on the last row). */
const LATEST_RESULT_PRIMARY_ROW_CLASS = "bg-app-background/60";
/** Toggle row belongs to the recruit above (not a new group). */
const LATEST_RESULT_TOGGLE_ROW_CLASS = "border-t border-border/40 bg-app-background/40";
/** Nested historical rows stay subordinate within the group. */
const LATEST_RESULT_NESTED_ROW_CLASS = "border-t border-border/40 bg-surface";
/** End-of-recruit-group divider — applied after Show/Hide + nested rows, not before them. */
const LATEST_RESULT_GROUP_END_ROW_CLASS = "border-b-2 border-border";

function latestResultGroupEndClass(isLastRowInGroup: boolean, isLastRecruitInTable: boolean): string {
  if (!isLastRowInGroup || isLastRecruitInTable) return "";
  return LATEST_RESULT_GROUP_END_ROW_CLASS;
}

function formatDetectionStatusCompact(status: RecruitMatchResult["detectionStatus"]): string {
  return status === "NEW" ? "New result" : "Baseline";
}

function detectionStatusToneClass(status: RecruitMatchResult["detectionStatus"]): string {
  if (status === "NEW") {
    return "rounded-full border border-[var(--module-accent)]/30 px-1.5 py-0.5 text-[11px] font-medium text-[var(--module-accent)]";
  }
  return "rounded-full border border-border px-1.5 py-0.5 text-[11px] font-medium text-text-secondary";
}

const LATEST_RESULT_RESULT_CELL_CLASS =
  "px-3 py-1.5 text-sm align-middle whitespace-nowrap";

function ResultOutcomeText({ result }: { result: MatchResultOutcome }) {
  if (result === "WIN") {
    return <span className="font-semibold text-red-700">{resultOutcomeLabel(result)}</span>;
  }
  if (result === "LOSS") {
    return <span className="font-semibold text-green-700">{resultOutcomeLabel(result)}</span>;
  }
  return <span className="font-semibold text-text-secondary">{resultOutcomeLabel(result)}</span>;
}

function LatestResultRecruitCell({
  recruitName,
  recruitUtr,
  nested = false,
}: {
  recruitName: string;
  recruitUtr: string | null;
  nested?: boolean;
}) {
  if (nested) {
    return null;
  }

  const utr = recruitUtr?.trim();

  return (
    <span className="inline-flex min-w-0 max-w-[11rem] items-baseline gap-1 truncate">
      <span className="truncate font-semibold text-text-primary">{recruitName}</span>
      {utr ? (
        <>
          <span className="shrink-0 text-text-secondary/50">·</span>
          <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--module-accent)]">
            {utr} UTR
          </span>
        </>
      ) : null}
    </span>
  );
}

function LatestResultTournamentCell({ result }: { result: RecruitMatchResult }) {
  const title = formatTournamentNameDisplay(result.tournamentName);
  const url = resolveTournamentUrl(result);

  if (!url) {
    return <span className="truncate">{title}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex min-w-0 max-w-full items-center gap-0.5 truncate text-text-primary hover:text-[var(--module-accent)]"
      title={title}
    >
      <span className="truncate">{title}</span>
      <span
        className="shrink-0 text-[10px] leading-none text-text-secondary group-hover:text-[var(--module-accent)]"
        aria-hidden="true"
      >
        ↗
      </span>
    </a>
  );
}

function LatestResultDataCells({
  entry,
  recruitName,
  nested = false,
}: {
  entry: LatestResultEntry;
  recruitName: string;
  nested?: boolean;
}) {
  const { result, opponent } = entry;

  return (
    <>
      <td className={LATEST_RESULT_CELL_CLASS}>
        <LatestResultRecruitCell
          recruitName={recruitName}
          recruitUtr={opponent.recruitUtr}
          nested={nested}
        />
      </td>
      <td className={`${LATEST_RESULT_CELL_CLASS} font-medium text-text-primary`}>
        {opponent.matchDateLabel}
      </td>
      <td className={LATEST_RESULT_RESULT_CELL_CLASS}>
        <ResultOutcomeText result={result.result} />
      </td>
      <td className={`${LATEST_RESULT_CELL_CLASS} max-w-[9rem] truncate`}>
        {opponent.opponentName}
      </td>
      <td className={LATEST_RESULT_CELL_CLASS}>
        {formatLatestResultTrnRank(opponent.opponentTrnRank)}
      </td>
      <td className={LATEST_RESULT_CELL_CLASS}>
        {formatLatestResultGradYear(opponent.opponentGradYear)}
      </td>
      <td className={LATEST_RESULT_CELL_CLASS}>
        {formatLatestResultUtr(opponent.opponentUtr)}
      </td>
      <td className={LATEST_RESULT_CELL_CLASS}>{result.score ?? "—"}</td>
      <td
        className={`${LATEST_RESULT_CELL_CLASS} max-w-[11rem] truncate`}
        title={formatTournamentNameDisplay(result.tournamentName)}
      >
        <LatestResultTournamentCell result={result} />
      </td>
      <td className={LATEST_RESULT_CELL_CLASS}>{result.round ?? "—"}</td>
      <td className={LATEST_RESULT_CELL_CLASS}>
        <span className="rounded-full border border-border px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
          {formatMatchSourceLabel(result)}
        </span>
      </td>
      <td className={LATEST_RESULT_CELL_CLASS}>
        <span className={detectionStatusToneClass(result.detectionStatus)}>
          {formatDetectionStatusCompact(result.detectionStatus)}
        </span>
      </td>
    </>
  );
}

function LatestResultFeedRow({
  row,
  isLastRecruitInTable,
}: {
  row: LatestResultRow;
  isLastRecruitInTable: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { latestResult } = row;
  const moreRecent = additionalRecentResults(row);
  const moreRecentCount = moreRecent.length;
  const hasToggle = moreRecentCount > 0;
  const hasNested = expanded && moreRecentCount > 0;

  if (!latestResult) {
    return (
      <tr
        className={`${LATEST_RESULT_PRIMARY_ROW_CLASS} ${latestResultGroupEndClass(true, isLastRecruitInTable)}`.trim()}
      >
        <td className={LATEST_RESULT_CELL_CLASS} colSpan={12}>
          <span className="font-semibold text-text-primary">{row.recruitName}</span>
          <span className="ml-3 text-text-secondary">No stored results yet.</span>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr
        className={`${LATEST_RESULT_PRIMARY_ROW_CLASS} ${latestResultGroupEndClass(!hasToggle, isLastRecruitInTable)}`.trim()}
      >
        <LatestResultDataCells entry={latestResult} recruitName={row.recruitName} />
      </tr>
      {hasToggle ? (
        <tr
          className={`${LATEST_RESULT_TOGGLE_ROW_CLASS} ${latestResultGroupEndClass(!hasNested, isLastRecruitInTable)}`.trim()}
        >
          <td className="px-3 py-1 text-xs" colSpan={12}>
            <button
              type="button"
              className="font-semibold text-[var(--module-accent)]"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded
                ? "Hide recent results"
                : `Show ${moreRecentCount} more recent`}
            </button>
          </td>
        </tr>
      ) : null}
      {hasNested
        ? moreRecent.map((entry, index) => (
            <tr
              key={entry.result.id}
              className={`${LATEST_RESULT_NESTED_ROW_CLASS} ${latestResultGroupEndClass(index === moreRecent.length - 1, isLastRecruitInTable)}`.trim()}
            >
              <LatestResultDataCells entry={entry} recruitName={row.recruitName} nested />
            </tr>
          ))
        : null}
    </>
  );
}

function LatestResultsSection({ rows }: { rows: LatestResultRow[] }) {
  const sortedRows = useMemo(() => sortLatestResultRows(rows), [rows]);

  return (
    <TodayBetaSection>
      <h2 className="text-sm font-semibold text-text-primary">Latest Results</h2>
      <p className="mt-1 text-xs text-text-secondary">
        Recent stored results across monitored recruits, sorted by match date.
      </p>
      <div className="mt-3 overflow-x-auto rounded-control border border-border/80">
        <table className="min-w-full border-collapse">
          <thead className="bg-background">
            <tr>
              {[
                "Recruit",
                "Match Date",
                "Result",
                "Opponent",
                "TRN Rank",
                "Grad Year",
                "Opponent UTR",
                "Score",
                "Tournament",
                "Round",
                "Source",
                "Detection status",
              ].map((heading) => (
                <th key={heading} className={LATEST_RESULT_HEAD_CLASS}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => (
              <LatestResultFeedRow
                key={row.recruitPersonId}
                row={row}
                isLastRecruitInTable={index === sortedRows.length - 1}
              />
            ))}
          </tbody>
        </table>
      </div>
    </TodayBetaSection>
  );
}

function ResultBasedContactCard({
  opportunity,
  onWorkflowComplete,
  openMarkTextSentConfirm,
}: {
  opportunity: ContactOpportunity;
  onWorkflowComplete: (message: string) => void;
  openMarkTextSentConfirm: (input: MarkTextSentInput) => void;
}) {
  const originalText = opportunity.suggestedText ?? "";
  const [draftText, setDraftText] = useState(originalText);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { matchResult } = opportunity;
  const hasCadence = opportunity.opportunityTypes.includes("CADENCE");

  async function handleCopy() {
    if (!draftText.trim()) return;
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleMarkTextSent() {
    openMarkTextSentConfirm({
      recruitPersonId: opportunity.recruitPersonId,
      recruitName: opportunity.recruitName,
      messageText: draftText,
      matchResultId: opportunity.matchResult?.id ?? null,
      upcomingTournamentId: opportunity.upcomingTournament?.id ?? null,
    });
  }

  function handleDismissResult() {
    const matchResultId = opportunity.matchResult?.id;
    if (!matchResultId) return;
    startTransition(async () => {
      const result = await dismissResultOpportunityAction({
        recruitPersonId: opportunity.recruitPersonId,
        matchResultId,
      });
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      onWorkflowComplete("Result opportunity dismissed");
    });
  }

  return (
    <li className="rounded-control border border-border/80 bg-background px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-text-primary">{opportunity.recruitName}</p>
        {matchResult ? (
          <span className={resultTone(matchResult.result)}>{resultLabel(matchResult.result)}</span>
        ) : null}
      </div>

      {matchResult ? (
        <div className="mt-2 text-sm text-text-primary">
          <p>
            vs {matchResult.opponentName ?? "Unknown opponent"} (
            {formatOpponentRank(matchResult.opponentRanking)})
          </p>
          <p className="text-text-secondary">
            {[matchResult.score, matchResult.tournamentName, matchResult.round]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ) : null}

      {opportunity.factors.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Why this surfaced
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-text-primary">
            {opportunity.factors.map((factor) => (
              <li key={factor.key}>{factor.reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasCadence ? (
        <p className="mt-2 text-xs text-text-secondary">
          Also overdue for relationship follow-up (cadence score {opportunity.cadenceScore ?? "—"}).
        </p>
      ) : null}

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Suggested Text
        </p>
        {opportunity.suggestedText != null ? (
          <textarea
            className={`${INPUT_CLASS} mt-2 min-h-[72px] resize-y`}
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
          />
        ) : (
          <p className="mt-2 text-sm text-text-secondary">No suggested message</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-control border border-border px-3 text-sm font-semibold text-text-primary disabled:opacity-50"
          onClick={() => void handleCopy()}
          disabled={!draftText.trim()}
        >
          {copied ? "Copied" : "Copy Text"}
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-control bg-[var(--module-accent)] px-3 text-sm font-semibold text-white disabled:opacity-50"
          onClick={handleMarkTextSent}
          disabled={!draftText.trim() || isPending}
        >
          Mark Text Sent
        </button>
        <Link
          href={recruitingPersonPath(opportunity.recruitPersonId)}
          className="inline-flex h-9 items-center rounded-control border border-border px-3 text-sm font-semibold text-text-primary hover:bg-surface"
        >
          View Recruit
        </Link>
        {matchResult?.id ? (
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-control border border-border px-3 text-sm font-semibold text-text-primary disabled:opacity-50"
            onClick={handleDismissResult}
            disabled={isPending}
          >
            Dismiss
          </button>
        ) : null}
      </div>

      {actionError ? (
        <p className="mt-2 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}
    </li>
  );
}

function RelationshipFollowUpRow({
  opportunity,
  onWorkflowComplete,
  openMarkTextSentConfirm,
}: {
  opportunity: ContactOpportunity;
  onWorkflowComplete: (message: string) => void;
  openMarkTextSentConfirm: (input: MarkTextSentInput) => void;
}) {
  const suggested = opportunity.suggestedText ?? "";
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const cadenceReason =
    opportunity.daysSinceLastContact == null
      ? "No text/call logged"
      : `${opportunity.daysSinceLastContact} days since last contact`;

  async function handleCopy() {
    if (!suggested.trim()) return;
    try {
      await navigator.clipboard.writeText(suggested);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleSnooze() {
    startTransition(async () => {
      const result = await snoozeCadenceOpportunityAction({
        recruitPersonId: opportunity.recruitPersonId,
      });
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      onWorkflowComplete("Cadence snoozed for 3 days");
    });
  }

  return (
    <li className="rounded-control border border-border/60 bg-background px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-text-primary">{opportunity.recruitName}</p>
          <p className="text-text-secondary">
            {formatCadencePriorityLabel(opportunity.recruitPriorityLabel)} · {cadenceReason}
          </p>
          {suggested ? (
            <p className="mt-1 text-text-primary">
              Suggested: <span className="text-text-secondary">&ldquo;{suggested}&rdquo;</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-control border border-border px-2 text-xs font-semibold text-text-primary disabled:opacity-50"
            onClick={() => void handleCopy()}
            disabled={!suggested.trim()}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-control bg-[var(--module-accent)] px-2 text-xs font-semibold text-white disabled:opacity-50"
            disabled={!suggested.trim() || isPending}
            onClick={() =>
              openMarkTextSentConfirm({
                recruitPersonId: opportunity.recruitPersonId,
                recruitName: opportunity.recruitName,
                messageText: suggested,
                matchResultId: null,
                upcomingTournamentId: null,
              })
            }
          >
            Mark Text Sent
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-control border border-border px-2 text-xs font-semibold text-text-primary disabled:opacity-50"
            onClick={handleSnooze}
            disabled={isPending}
          >
            Snooze
          </button>
        </div>
      </div>
      {actionError ? (
        <p className="mt-2 text-xs text-red-700">{actionError}</p>
      ) : null}
    </li>
  );
}

function latestStoredResultLabel(
  player: TodayBetaPlayerRow,
  latestRows: LatestResultRow[],
): string {
  const row = latestRows.find((entry) => entry.recruitPersonId === player.recruitPersonId);
  const latest = row?.latestResult;
  if (!latest) return "—";
  const opponent = latest.opponent.opponentName;
  const score = latest.result.score ?? "—";
  return `${opponent} (${score})`;
}

function UtrQueueActions({
  player,
  highlighted,
  onChecked,
  onAddUtrProfile,
  onCaptureHelp,
  onNext,
}: {
  player: TodayBetaPlayerRow;
  highlighted: boolean;
  onChecked: () => void;
  onAddUtrProfile: () => void;
  onCaptureHelp: () => void;
  onNext?: () => void;
}) {
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCheckedNoNew() {
    if (!player.recruitPersonId) return;
    setActionError(null);
    startTransition(async () => {
      const result = await markRecruitResultsCheckedNoNewAction({
        recruitPersonId: player.recruitPersonId!,
        source: "UTR",
      });
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      setConfirmChecked(false);
      onChecked();
      router.refresh();
    });
  }

  if (player.status !== "Ready") {
    return <span className="text-text-secondary">—</span>;
  }

  const resultsUrl = buildUtrResultsUrl(player);

  return (
    <div
      className={`flex flex-col gap-2 ${highlighted ? "rounded-control border border-[var(--module-accent)]/40 bg-[var(--module-accent)]/5 p-2" : ""}`}
    >
      {!player.utrPlayerId ? (
        <button
          type="button"
          className="inline-flex h-8 w-fit items-center rounded-control border border-border px-2 text-xs font-semibold text-text-primary"
          onClick={onAddUtrProfile}
        >
          Add UTR Profile
        </button>
      ) : (
        <>
          {resultsUrl ? (
            <a
              href={resultsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-fit items-center rounded-control border border-border px-2 text-xs font-semibold text-[var(--module-accent)] hover:underline"
            >
              Open UTR Results
            </a>
          ) : null}
          <button
            type="button"
            className="inline-flex h-8 w-fit items-center rounded-control border border-border px-2 text-xs font-semibold text-text-primary"
            onClick={onCaptureHelp}
          >
            Capture UTR Results
          </button>
        </>
      )}
      {confirmChecked ? (
        <div className="rounded-control border border-border/80 bg-background p-2">
          <p className="text-xs text-text-secondary">Mark UTR as reviewed with no new matches?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-7 items-center rounded-control bg-[var(--module-accent)] px-2 text-xs font-semibold text-white disabled:opacity-50"
              onClick={handleCheckedNoNew}
              disabled={isPending}
            >
              Confirm
            </button>
            <button
              type="button"
              className="inline-flex h-7 items-center rounded-control border border-border px-2 text-xs font-semibold text-text-primary"
              onClick={() => setConfirmChecked(false)}
              disabled={isPending}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex h-8 w-fit items-center rounded-control border border-border px-2 text-xs font-semibold text-text-primary disabled:opacity-50"
          onClick={() => setConfirmChecked(true)}
          disabled={isPending || !player.utrPlayerId}
        >
          Checked — No New Results
        </button>
      )}
      {onNext ? (
        <button
          type="button"
          className="inline-flex h-8 w-fit items-center rounded-control border border-[var(--module-accent)] px-2 text-xs font-semibold text-[var(--module-accent)]"
          onClick={onNext}
        >
          Next Recruit
        </button>
      ) : null}
      {actionError ? <p className="text-xs text-red-700">{actionError}</p> : null}
    </div>
  );
}

function MonitoringPlayerActions({
  player,
  onImport,
  onChecked,
}: {
  player: TodayBetaPlayerRow;
  onImport: () => void;
  onChecked: () => void;
}) {
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCheckedNoNew() {
    if (!player.recruitPersonId) return;
    setActionError(null);
    startTransition(async () => {
      const result = await markRecruitResultsCheckedNoNewAction({
        recruitPersonId: player.recruitPersonId!,
      });
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      setConfirmChecked(false);
      onChecked();
      router.refresh();
    });
  }

  if (player.status !== "Ready") {
    return <span className="text-text-secondary">—</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      <a
        href={player.trnProfileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 w-fit items-center rounded-control border border-border px-2 text-xs font-semibold text-[var(--module-accent)] hover:underline"
      >
        Open TRN
      </a>
      <button
        type="button"
        className="inline-flex h-8 w-fit items-center rounded-control border border-border px-2 text-xs font-semibold text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onImport}
      >
        Import Results
      </button>
      {confirmChecked ? (
        <div className="rounded-control border border-border/80 bg-background p-2">
          <p className="text-xs text-text-secondary">Mark as reviewed with no new matches?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-7 items-center rounded-control bg-[var(--module-accent)] px-2 text-xs font-semibold text-white disabled:opacity-50"
              onClick={handleCheckedNoNew}
              disabled={isPending}
            >
              Confirm
            </button>
            <button
              type="button"
              className="inline-flex h-7 items-center rounded-control border border-border px-2 text-xs font-semibold text-text-primary"
              onClick={() => setConfirmChecked(false)}
              disabled={isPending}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex h-8 w-fit items-center rounded-control border border-border px-2 text-xs font-semibold text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setConfirmChecked(true)}
          disabled={isPending}
        >
          Checked — No New Results
        </button>
      )}
      {actionError ? <p className="text-xs text-red-700">{actionError}</p> : null}
    </div>
  );
}

function ImportResultsDrawerContent({
  player,
  onClose,
}: {
  player: TodayBetaPlayerRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [previews, setPreviews] = useState<ParsedMatchPreview[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveSummary, setSaveSummary] = useState<SaveMatchResultsOutcome | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSave = previews.length > 0 && player.recruitPersonId && !saveSummary;

  function updatePreview(key: string, patch: Partial<ParsedMatchPreview>) {
    setPreviews((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function handleParse() {
    setParseError(null);
    setSaveSummary(null);
    setSaveError(null);
    startTransition(async () => {
      const result = await parseTrnPasteAction(rawText);
      if (!result.success) {
        setParseError(result.error);
        setPreviews([]);
        return;
      }
      setPreviews(result.data);
    });
  }

  const saveLabel = player.baselineEstablished ? "Save Results" : "Establish Baseline";

  function handleSave() {
    if (!player.recruitPersonId) return;
    setSaveError(null);
    startTransition(async () => {
      const result = await saveTodayBetaMatchResultsAction({
        recruitPersonId: player.recruitPersonId!,
        sourceUrl: player.trnProfileUrl,
        rows: previews.map((row) => ({
          tournamentName: row.tournamentName,
          tournamentDate: row.tournamentDate,
          round: row.round,
          opponentName: row.opponentName,
          opponentRanking: row.opponentRanking,
          score: row.score,
          result: row.result,
        })),
      });

      if (!result.success) {
        setSaveError(result.error);
        return;
      }

      setSaveSummary(result.data);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Paste match activity copied from the authenticated TennisRecruiting.net page for{" "}
        <span className="font-medium text-text-primary">{player.displayName}</span>.
      </p>

      {player.baselineEstablished ? (
        <p className="rounded-control border border-border/80 bg-background px-3 py-2 text-sm text-text-secondary">
          Baseline established. Only matches not already stored will be saved as newly detected
          results.
        </p>
      ) : (
        <p className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          First import establishes the historical baseline. These matches will not appear as new
          results.
        </p>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Pasted TRN activity
        </span>
        <textarea
          className={`${INPUT_CLASS} min-h-[160px] font-mono text-xs`}
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Paste copied match rows from TennisRecruiting.net..."
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-control bg-[var(--module-accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
          onClick={handleParse}
          disabled={isPending || rawText.trim().length === 0}
        >
          Parse pasted text
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-control border border-border px-4 text-sm font-semibold text-text-primary"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>

      {parseError ? (
        <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {parseError}
        </p>
      ) : null}

      {canSave ? (
        <button
          type="button"
          className="inline-flex h-10 w-fit items-center rounded-control bg-[var(--module-accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
          onClick={handleSave}
          disabled={isPending}
        >
          {saveLabel}
        </button>
      ) : null}

      {saveError ? (
        <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {saveError}
        </p>
      ) : null}

      {saveSummary ? (
        <div className="rounded-control border border-border bg-background px-3 py-3 text-sm text-text-primary">
          <p>{saveSummary.found} results found</p>
          <p>{saveSummary.saved} new results saved</p>
          <p>{saveSummary.duplicatesIgnored} duplicates ignored</p>
          {"crossSourceMatched" in saveSummary ? (
            <p>{saveSummary.crossSourceMatched} cross-source matches</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function TodayBetaPage({ data }: { data: TodayBetaPageData }) {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);
  const [monitoringFilter, setMonitoringFilter] = useState<MonitoringFilter>("all");
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [utrQueueFocusId, setUtrQueueFocusId] = useState<string | null>(null);
  const monitoringSectionRef = useRef<HTMLElement | null>(null);

  const latestResultByRecruit = useMemo(() => {
    const map = new Map<string, LatestResultEntry | null>();
    for (const row of data.latestResults) {
      map.set(row.recruitPersonId, row.latestResult);
    }
    return map;
  }, [data.latestResults]);

  const classYears = useMemo(() => {
    const years = new Set<number>();
    for (const player of data.players) {
      if (player.recruitClassYear != null) years.add(player.recruitClassYear);
    }
    return [...years].sort((a, b) => a - b);
  }, [data.players]);

  const latestResultsByRecruit = useMemo(
    () => sortLatestResultRows(data.latestResults),
    [data.latestResults],
  );

  const readyPlayers = useMemo(
    () => data.players.filter((player) => player.status === "Ready"),
    [data.players],
  );

  const nextNeedsCheckPlayer = useMemo(() => {
    return readyPlayers.find(
      (player) =>
        player.monitoringStatus === "NEEDS_CHECK" &&
        player.recruitPersonId !== utrQueueFocusId,
    );
  }, [readyPlayers, utrQueueFocusId]);

  function focusNextNeedsCheck(currentPersonId?: string) {
    const queue = readyPlayers.filter((player) => player.monitoringStatus === "NEEDS_CHECK");
    if (queue.length === 0) {
      setUtrQueueFocusId(null);
      return;
    }
    const currentIndex = queue.findIndex((player) => player.recruitPersonId === currentPersonId);
    const next = queue[currentIndex + 1] ?? queue[0];
    setUtrQueueFocusId(next?.recruitPersonId ?? null);
  }

  const resultBasedContacts = useMemo(
    () => data.contactOpportunities.filter((o) => o.opportunityTypes.includes("RESULT")),
    [data.contactOpportunities],
  );

  const relationshipFollowUp = useMemo(
    () =>
      data.contactOpportunities.filter(
        (o) => o.opportunityTypes.includes("CADENCE") && !o.opportunityTypes.includes("RESULT"),
      ),
    [data.contactOpportunities],
  );

  const filteredPlayers = useMemo(() => {
    let rows = data.players;
    if (classFilter !== "all") {
      rows = rows.filter((player) => player.recruitClassYear === classFilter);
    }
    if (monitoringFilter === "needs_check") {
      return rows.filter((player) => player.monitoringStatus === "NEEDS_CHECK");
    }
    if (monitoringFilter === "checked_today") {
      return rows.filter(
        (player) =>
          player.monitoringStatus === "CHECKED_TODAY" ||
          player.monitoringStatus === "NEW_RESULTS_FOUND",
      );
    }
    if (monitoringFilter === "missing_utr") {
      return rows.filter((player) => player.status === "Ready" && !player.utrPlayerId);
    }
    return rows;
  }, [data.players, monitoringFilter, classFilter]);

  function focusMissingUtrProfiles() {
    setMonitoringFilter("missing_utr");
    setClassFilter("all");
    monitoringSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const allCheckedToday =
    data.activitySummary.recruitsMonitored > 0 &&
    data.activitySummary.checkedTodayCount === data.activitySummary.recruitsMonitored;

  function handleWorkflowComplete(message: string) {
    setWorkflowMessage(message);
    router.refresh();
    window.setTimeout(() => setWorkflowMessage(null), 4000);
  }

  function openMarkTextSentConfirm(input: MarkTextSentInput) {
    openDrawer({
      id: `mark-text-sent-${input.recruitPersonId}`,
      title: "Mark Text Sent",
      subtitle: input.recruitName,
      hideFooter: true,
      content: (
        <MarkTextSentConfirm
          recruitPersonId={input.recruitPersonId}
          recruitName={input.recruitName}
          messageText={input.messageText}
          matchResultId={input.matchResultId}
          upcomingTournamentId={input.upcomingTournamentId}
          onCancel={() => closeDrawer()}
          onSuccess={() => {
            closeDrawer();
            handleWorkflowComplete("Text logged");
          }}
        />
      ),
    });
  }

  function openTournamentForm(player: TodayBetaPlayerRow, tournament?: RecruitUpcomingTournament) {
    if (!player.recruitPersonId) return;
    openDrawer({
      id: tournament ? `edit-tournament-${tournament.id}` : `add-tournament-${player.recruitPersonId}`,
      title: tournament ? "Edit Tournament" : "Add Tournament",
      subtitle: player.displayName,
      hideFooter: true,
      content: (
        <UpcomingTournamentForm
          recruitPersonId={player.recruitPersonId}
          recruitName={player.displayName}
          tournament={tournament}
          onClose={() => closeDrawer()}
        />
      ),
    });
  }

  function openUtrProfileForm(player: TodayBetaPlayerRow) {
    if (!player.recruitPersonId) return;
    openDrawer({
      id: `utr-profile-${player.recruitPersonId}`,
      title: "Add UTR Profile",
      subtitle: player.displayName,
      hideFooter: true,
      content: (
        <UtrProfileForm
          recruitPersonId={player.recruitPersonId}
          recruitName={player.displayName}
          onSaved={() => {
            handleWorkflowComplete("UTR profile saved");
            router.refresh();
          }}
          onClose={() => closeDrawer()}
        />
      ),
    });
  }

  function openUtrCaptureHelp(player: TodayBetaPlayerRow) {
    openDrawer({
      id: `utr-capture-${player.recruitPersonId ?? player.displayName}`,
      title: "Capture UTR Results",
      subtitle: player.displayName,
      hideFooter: true,
      content: <UtrCaptureInstructions player={player} />,
    });
  }

  function openImportDrawer(player: TodayBetaPlayerRow) {
    openDrawer({
      id: `today-beta-import-${player.trnPlayerId}`,
      title: "Import Results",
      subtitle: player.displayName,
      hideFooter: true,
      content: <ImportResultsDrawerContent player={player} onClose={() => closeDrawer()} />,
    });
  }

  return (
    <ModulePageShell
      title="Today Beta"
      subtitle="Monitor recent recruit tennis activity, new results, and who deserves contact."
    >
      <div className="flex flex-col gap-4">
        {workflowMessage ? (
          <p className="rounded-control border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            {workflowMessage}
          </p>
        ) : null}

        <ActivitySummarySection summary={data.activitySummary} />

        <UtrAutomaticCheckSection
          players={data.players}
          onComplete={(message) => handleWorkflowComplete(message)}
          onViewMissingUtr={focusMissingUtrProfiles}
        />

        <NewResultsSection results={data.newResults} />

        <LatestResultsSection rows={data.latestResults} />

        <TodayBetaSection>
          <h2 className="text-sm font-semibold text-text-primary">Result-Based Contact</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Recruits with a new or notable match result worth acting on.
          </p>
          {resultBasedContacts.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">
              No result-driven contact opportunities right now.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {resultBasedContacts.map((opportunity) => (
                <ResultBasedContactCard
                  key={opportunity.recruitPersonId}
                  opportunity={opportunity}
                  onWorkflowComplete={handleWorkflowComplete}
                  openMarkTextSentConfirm={openMarkTextSentConfirm}
                />
              ))}
            </ul>
          )}
        </TodayBetaSection>

        <TodayBetaSection>
          <h2 className="text-sm font-semibold text-text-primary">Relationship Follow-Up</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Cadence reminders for priority recruits overdue on text or call contact.
          </p>
          {relationshipFollowUp.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">No cadence follow-ups due right now.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {relationshipFollowUp.map((opportunity) => (
                <RelationshipFollowUpRow
                  key={opportunity.recruitPersonId}
                  opportunity={opportunity}
                  onWorkflowComplete={handleWorkflowComplete}
                  openMarkTextSentConfirm={openMarkTextSentConfirm}
                />
              ))}
            </ul>
          )}
        </TodayBetaSection>

        <TodayBetaSection>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">UTR Check Queue</h2>
              <p className="mt-1 text-xs text-text-secondary">
                Rank Board recruits with configured UTR profiles. TRN paste import remains
                available below as fallback.
              </p>
            </div>
            <p className="text-sm font-semibold text-text-primary">
              {data.activitySummary.checkedTodayCount} / {data.activitySummary.recruitsMonitored}{" "}
              checked today
            </p>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-border/70">
                  {["Recruit", "UTR", "Last Checked", "Latest Stored Result", "Status", "Actions"].map(
                    (heading) => (
                      <th key={heading} className={TABLE_HEAD_CLASS}>
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.players.map((player) => (
                  <tr
                    key={`utr-queue-${player.trnPlayerId}`}
                    className={`border-t border-border/70 ${player.recruitPersonId && player.recruitPersonId === utrQueueFocusId ? "bg-[var(--module-accent)]/5" : ""}`}
                  >
                    <td className={TABLE_CELL_CLASS}>
                      <p className="font-medium text-text-primary">{player.displayName}</p>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      {player.utrPlayerId ? (
                        <a
                          href={player.utrProfileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[var(--module-accent)] hover:underline"
                        >
                          {player.utrPlayerId}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      {formatMonitoringTimestamp(player.utrLastCheckedAt ?? player.lastCheckedAt)}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      {latestStoredResultLabel(player, latestResultsByRecruit)}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={monitoringStatusTone(player.monitoringStatus)}>
                        {formatMonitoringStatusLabel(player.monitoringStatus)}
                      </span>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <UtrQueueActions
                        player={player}
                        highlighted={player.recruitPersonId === utrQueueFocusId}
                        onAddUtrProfile={() => openUtrProfileForm(player)}
                        onCaptureHelp={() => openUtrCaptureHelp(player)}
                        onChecked={() => {
                          handleWorkflowComplete("Marked UTR checked — no new results");
                          focusNextNeedsCheck(player.recruitPersonId);
                        }}
                        onNext={
                          player.recruitPersonId === utrQueueFocusId && nextNeedsCheckPlayer
                            ? () => setUtrQueueFocusId(nextNeedsCheckPlayer.recruitPersonId ?? null)
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TodayBetaSection>

        <section
          ref={monitoringSectionRef}
          className={`${TODAY_BETA_SECTION_SHELL} overflow-x-auto`}
        >
          <div className={`${TODAY_BETA_SECTION_PADDING} border-b border-border/70`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Monitoring / Import</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Rank Board recruits only. TRN paste import and UTR browser-assisted capture.
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-text-primary">Results check progress</p>
                {allCheckedToday ? (
                  <p className="text-green-700">
                    {data.activitySummary.checkedTodayCount} / {data.activitySummary.recruitsMonitored}{" "}
                    checked today
                  </p>
                ) : (
                  <p className="text-text-secondary">
                    {data.activitySummary.checkedTodayCount} / {data.activitySummary.recruitsMonitored}{" "}
                    checked today
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["needs_check", "Needs Check"],
                  ["checked_today", "Checked Today"],
                  ["missing_utr", "Missing UTR"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`inline-flex h-8 items-center rounded-control border px-3 text-xs font-semibold ${
                    monitoringFilter === value
                      ? "border-[var(--module-accent)] bg-[var(--module-accent)]/10 text-[var(--module-accent)]"
                      : "border-border text-text-primary"
                  }`}
                  onClick={() => setMonitoringFilter(value)}
                >
                  {label}
                </button>
              ))}
              {classYears.length > 0 ? (
                <span className="mx-1 self-center text-xs text-text-secondary">Class</span>
              ) : null}
              <button
                type="button"
                className={`inline-flex h-8 items-center rounded-control border px-3 text-xs font-semibold ${
                  classFilter === "all"
                    ? "border-[var(--module-accent)] bg-[var(--module-accent)]/10 text-[var(--module-accent)]"
                    : "border-border text-text-primary"
                }`}
                onClick={() => setClassFilter("all")}
              >
                All Classes
              </button>
              {classYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  className={`inline-flex h-8 items-center rounded-control border px-3 text-xs font-semibold ${
                    classFilter === year
                      ? "border-[var(--module-accent)] bg-[var(--module-accent)]/10 text-[var(--module-accent)]"
                      : "border-border text-text-primary"
                  }`}
                  onClick={() => setClassFilter(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          <table className="min-w-full border-collapse">
            <thead className="bg-background">
              <tr>
                {[
                  "Recruit",
                  "Class",
                  "Rank",
                  "UTR",
                  "Last Checked",
                  "Latest Result",
                  "UTR Auto",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className={TABLE_HEAD_CLASS}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => (
                <tr
                  key={player.recruitPersonId ?? player.trnPlayerId ?? player.displayName}
                  className="border-t border-border/70"
                >
                  <td className={TABLE_CELL_CLASS}>
                    <p className="font-medium text-text-primary">{player.displayName}</p>
                    {player.status === "Ready" && player.upcomingTournaments.length > 0 ? (
                      <div className="mt-2 space-y-1 text-xs text-text-secondary">
                        {player.upcomingTournaments.map((tournament) => (
                          <div key={tournament.id}>
                            <span>{tournament.tournamentName}</span>
                            <button
                              type="button"
                              className="ml-2 font-semibold text-[var(--module-accent)]"
                              onClick={() => openTournamentForm(player, tournament)}
                            >
                              Edit
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {player.status === "Ready" ? (
                      <button
                        type="button"
                        className="mt-2 inline-flex h-7 items-center rounded-control border border-border px-2 text-xs font-semibold text-text-primary"
                        onClick={() => openTournamentForm(player)}
                      >
                        Add Tournament
                      </button>
                    ) : null}
                    {player.matchError ? (
                      <p className="mt-1 text-xs text-red-700">{player.matchError}</p>
                    ) : null}
                  </td>
                  <td className={TABLE_CELL_CLASS}>
                    {player.recruitClassYear ?? "—"}
                  </td>
                  <td className={TABLE_CELL_CLASS}>
                    {player.coachRank != null ? `#${player.coachRank}` : "—"}
                  </td>
                  <td className={TABLE_CELL_CLASS}>
                    {player.utrPlayerId ? (
                      <a
                        href={player.utrResultsUrl ?? player.utrProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[var(--module-accent)] hover:underline"
                      >
                        {player.utrPlayerId}
                      </a>
                    ) : player.status === "Ready" ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[var(--module-accent)]"
                        onClick={() => openUtrProfileForm(player)}
                      >
                        Add UTR Profile
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={TABLE_CELL_CLASS}>
                    {formatMonitoringTimestamp(player.lastCheckedAt)}
                  </td>
                  <td className={`${TABLE_CELL_CLASS} text-xs`}>
                    {formatLatestResultSummary(
                      player.recruitPersonId
                        ? latestResultByRecruit.get(player.recruitPersonId)
                        : null,
                    )}
                  </td>
                  <td className={`${TABLE_CELL_CLASS} text-xs`}>
                    {formatUtrAgentCheckCell(player)}
                  </td>
                  <td className={TABLE_CELL_CLASS}>
                    <span className={monitoringStatusTone(player.monitoringStatus)}>
                      {formatMonitoringStatusLabel(player.monitoringStatus)}
                    </span>
                  </td>
                  <td className={TABLE_CELL_CLASS}>
                    <MonitoringPlayerActions
                      player={player}
                      onImport={() => openImportDrawer(player)}
                      onChecked={() =>
                        handleWorkflowComplete("Marked checked — no new results")
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {readyPlayers.length > 0 ? (
            <p className="border-t border-border/70 px-4 py-2 text-xs text-text-secondary">
              {readyPlayers.length} Rank Board recruit{readyPlayers.length === 1 ? "" : "s"} ·{" "}
              {data.activitySummary.utrConfiguredCount} UTR configured ·{" "}
              {data.activitySummary.missingUtrCount} missing UTR
            </p>
          ) : null}
        </section>
      </div>
    </ModulePageShell>
  );
}
