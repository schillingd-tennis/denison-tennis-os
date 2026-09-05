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
import { formatTierCompact } from "../../tier";
import {
  formatMonitoringStatusLabel,
  formatMonitoringTimestamp,
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
  TodayBetaPageData,
  TodayBetaPlayerRow,
} from "../types";
import MarkTextSentConfirm from "./MarkTextSentConfirm";
import TodayBetaAgentStatusChip from "./TodayBetaAgentStatusChip";
import TodayBetaKpiCards from "./TodayBetaKpiCards";
import UpcomingTournamentForm from "./UpcomingTournamentForm";
import UtrCaptureInstructions from "./UtrCaptureInstructions";
import UtrAutomaticCheckSection, { formatUtrAgentCheckCell } from "./UtrAutomaticCheckSection";
import UtrProfileForm from "./UtrProfileForm";
import {
  TB_BTN_PRIMARY,
  TB_BTN_SECONDARY,
  TB_PANEL,
  TB_PANEL_BODY,
  TB_SECTION_SUBTITLE,
  TB_SECTION_TITLE,
} from "./todayBetaDashboardStyles";

const INPUT_CLASS =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-primary";

const TABLE_HEAD_CLASS = "px-3 py-2 text-left text-xs font-semibold text-text-secondary";
const TABLE_CELL_CLASS = "px-3 py-2 text-sm text-text-primary align-top";

/** Shared Today Beta dashboard section shell. */
const TODAY_BETA_SECTION_SHELL = TB_PANEL;
const TODAY_BETA_SECTION_PADDING = TB_PANEL_BODY;

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

function NewResultsSection({ results }: { results: TodayBetaPageData["newResults"] }) {
  return (
    <TodayBetaSection className="border-[var(--module-accent)]/20">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={TB_SECTION_TITLE}>New Results</h2>
        {results.length > 0 ? (
          <span className="rounded-full bg-[var(--module-accent)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--module-accent)]">
            {results.length} newly detected
          </span>
        ) : null}
      </div>
      <p className={TB_SECTION_SUBTITLE}>
        Results first discovered after baseline was established.
      </p>
      {results.length === 0 ? (
        <p className="mt-3 rounded-control border border-border/60 bg-background/50 px-3 py-2 text-sm text-text-secondary">
          No new results since the last update.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {results.map((result) => (
            <li
              key={result.id}
              className="rounded-control border border-[var(--module-accent)]/25 bg-[var(--module-accent)]/[0.03] px-3 py-2.5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-semibold text-text-primary">{result.recruitName}</span>
                <span className={resultTone(result.result)}>{resultLabel(result.result)}</span>
                <span className="rounded-full border border-[var(--module-accent)]/30 px-2 py-0.5 text-[11px] font-semibold text-[var(--module-accent)]">
                  NEW
                </span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                vs {result.opponentName ?? "Unknown"} · {result.score ?? "—"} ·{" "}
                {formatTournamentNameDisplay(result.tournamentName)} · {result.tournamentDateLabel}
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
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
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary bg-background/80";
const LATEST_RESULT_CELL_CLASS =
  "px-3 py-1.5 text-sm text-text-primary align-middle whitespace-nowrap";

/** Primary recruit row — subtle tint only (group boundary is a bottom border on the last row). */
const LATEST_RESULT_PRIMARY_ROW_CLASS =
  "bg-app-background/70 transition-colors hover:bg-app-background/90";
/** Toggle row belongs to the recruit above (not a new group). */
const LATEST_RESULT_TOGGLE_ROW_CLASS = "border-t border-border/40 bg-app-background/40";
/** Nested historical rows stay subordinate within the group. */
const LATEST_RESULT_NESTED_ROW_CLASS =
  "border-t border-border/40 bg-surface transition-colors hover:bg-background/50";
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
      <h2 className={TB_SECTION_TITLE}>Latest Results</h2>
      <p className={TB_SECTION_SUBTITLE}>
        Recent stored results across Rank Board recruits, sorted by match date.
      </p>
      <div className="mt-3 overflow-x-auto rounded-control border border-border/70 shadow-sm">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-border/70">
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
    <li className="rounded-control border border-[var(--module-accent)]/15 bg-background px-3 py-2.5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">{opportunity.recruitName}</p>
            {opportunity.recruitTier != null ? (
              <span
                className="text-[11px] font-semibold tabular-nums text-text-secondary"
                title={`Tier ${opportunity.recruitTier}`}
              >
                {formatTierCompact(opportunity.recruitTier)}
              </span>
            ) : null}
            {matchResult ? (
              <span className={resultTone(matchResult.result)}>{resultLabel(matchResult.result)}</span>
            ) : null}
          </div>

          {matchResult ? (
            <p className="mt-1 text-xs text-text-secondary">
              vs {matchResult.opponentName ?? "Unknown opponent"} (
              {formatOpponentRank(matchResult.opponentRanking)}) ·{" "}
              {[matchResult.score, matchResult.tournamentName, matchResult.round]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}

          {opportunity.factors.length > 0 ? (
            <p className="mt-1 text-xs text-text-primary">
              <span className="font-medium text-text-secondary">Why: </span>
              {opportunity.factors.map((factor) => factor.reason).join(" · ")}
            </p>
          ) : null}

          {hasCadence ? (
            <p className="mt-1 text-[11px] text-text-secondary">
              Also overdue for cadence follow-up (score {opportunity.cadenceScore ?? "—"}).
            </p>
          ) : null}

          <div className="mt-2">
            {opportunity.suggestedText != null ? (
              <textarea
                className={`${INPUT_CLASS} min-h-[56px] resize-y text-xs`}
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
              />
            ) : (
              <p className="text-xs text-text-secondary">No suggested message</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-stretch">
          <button
            type="button"
            className={TB_BTN_SECONDARY}
            onClick={() => void handleCopy()}
            disabled={!draftText.trim()}
          >
            {copied ? "Copied" : "Copy Text"}
          </button>
          <button
            type="button"
            className={TB_BTN_PRIMARY}
            onClick={handleMarkTextSent}
            disabled={!draftText.trim() || isPending}
          >
            Mark Text Sent
          </button>
          <Link
            href={recruitingPersonPath(opportunity.recruitPersonId)}
            className={`${TB_BTN_SECONDARY} justify-center`}
          >
            View Recruit
          </Link>
          {matchResult?.id ? (
            <button
              type="button"
              className={TB_BTN_SECONDARY}
              onClick={handleDismissResult}
              disabled={isPending}
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <p className="mt-2 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
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
    <li className="rounded-control border border-border/60 bg-background/60 px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 text-sm">
          <p className="flex min-w-0 items-baseline gap-1.5 font-semibold text-text-primary">
            <span className="min-w-0 truncate">{opportunity.recruitName}</span>
            {opportunity.recruitTier != null ? (
              <span
                className="shrink-0 text-[11px] font-semibold tabular-nums text-text-secondary"
                title={`Tier ${opportunity.recruitTier}`}
              >
                {formatTierCompact(opportunity.recruitTier)}
              </span>
            ) : null}
          </p>
          <p className="text-xs text-text-secondary">
            {formatCadencePriorityLabel(opportunity.recruitPriorityLabel)} · {cadenceReason}
          </p>
          {suggested ? (
            <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
              Suggested: &ldquo;{suggested}&rdquo;
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className={TB_BTN_SECONDARY}
            onClick={() => void handleCopy()}
            disabled={!suggested.trim()}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            className={TB_BTN_PRIMARY}
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
            className={TB_BTN_SECONDARY}
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

function MonitoringPlayerActions({
  player,
  onImport,
  onChecked,
  onCaptureHelp,
}: {
  player: TodayBetaPlayerRow;
  onImport: () => void;
  onChecked: () => void;
  onCaptureHelp?: () => void;
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
      {player.utrPlayerId && onCaptureHelp ? (
        <button
          type="button"
          className="inline-flex h-8 w-fit items-center rounded-control border border-border px-2 text-xs font-semibold text-text-primary"
          onClick={onCaptureHelp}
        >
          Capture UTR Results
        </button>
      ) : null}
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

  const readyPlayers = useMemo(
    () => data.players.filter((player) => player.status === "Ready"),
    [data.players],
  );

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
      actions={<TodayBetaAgentStatusChip />}
    >
      <div className="flex flex-col gap-3">
        {workflowMessage ? (
          <p className="rounded-control border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 shadow-sm">
            {workflowMessage}
          </p>
        ) : null}

        <TodayBetaKpiCards summary={data.activitySummary} />

        <UtrAutomaticCheckSection
          players={data.players}
          lastBatchFromPage={data.activitySummary.utrAgentLastBatch}
          onComplete={(message) => handleWorkflowComplete(message)}
          onViewMissingUtr={focusMissingUtrProfiles}
        />

        <LatestResultsSection rows={data.latestResults} />

        <NewResultsSection results={data.newResults} />

        <TodayBetaSection>
          <h2 className={TB_SECTION_TITLE}>Result-Based Contact</h2>
          <p className={TB_SECTION_SUBTITLE}>
            Recruits with a new or notable match result worth acting on.
          </p>
          {resultBasedContacts.length === 0 ? (
            <p className="mt-3 rounded-control border border-border/60 bg-background/50 px-3 py-2 text-sm text-text-secondary">
              No result-driven contact opportunities right now.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
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
          <h2 className={TB_SECTION_TITLE}>Relationship Follow-Up</h2>
          <p className={TB_SECTION_SUBTITLE}>
            Cadence reminders for priority recruits overdue on text or call contact.
          </p>
          {relationshipFollowUp.length === 0 ? (
            <p className="mt-3 rounded-control border border-border/60 bg-background/50 px-3 py-2 text-sm text-text-secondary">
              No cadence follow-ups due right now.
            </p>
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

        <section
          ref={monitoringSectionRef}
          className={`${TODAY_BETA_SECTION_SHELL} overflow-x-auto opacity-95`}
        >
          <div className={`${TODAY_BETA_SECTION_PADDING} border-b border-border/70`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className={TB_SECTION_TITLE}>Monitoring / Import</h2>
                <p className={TB_SECTION_SUBTITLE}>
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
                    <p className="flex min-w-0 items-baseline gap-1.5 font-medium text-text-primary">
                      <span className="min-w-0 truncate">{player.displayName}</span>
                      {player.tier != null ? (
                        <span
                          className="shrink-0 text-[11px] font-semibold tabular-nums text-text-secondary"
                          title={`Tier ${player.tier}`}
                        >
                          {formatTierCompact(player.tier)}
                        </span>
                      ) : null}
                    </p>
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
                      onCaptureHelp={() => openUtrCaptureHelp(player)}
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
