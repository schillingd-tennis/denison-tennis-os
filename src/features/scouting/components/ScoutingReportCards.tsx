"use client";

import { FileText, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import {
  WorkspaceSection,
  WorkspaceStack,
} from "@/components/adaptive-workspace";
import { DrawerField } from "@/components/workspace-drawer";
import ScheduleIdentityMark from "@/features/teamSchedule/components/ScheduleIdentityMark";
import { EMPTY_VALUE, formatDate } from "@/lib/formatting";

import {
  scoutingTeamCanonicalLabel,
  scoutingTeamIdentityOrFallback,
} from "../teamIdentity";
import type { DirectReportSource } from "../csvImport";
import type {
  ScoutingDirectReport,
  ScoutingFormSubmission,
  ScoutingPlayerReport,
  ScoutingTeamReport,
} from "../types";

const SOURCE_LABELS: Record<DirectReportSource, string> = {
  csv_import: "CSV Import",
  coach_entry: "Coach Entry",
  player_form: "Player Form",
};

export function scoutingReportSourceLabel(source: DirectReportSource | string): string {
  return SOURCE_LABELS[source as DirectReportSource] ?? source;
}

function TeamMark({ name, size = 24 }: { name: string; size?: number }) {
  const identity = scoutingTeamIdentityOrFallback(name);
  return (
    <span
      className="inline-flex shrink-0"
      role="img"
      aria-label={`${identity.label} logo`}
      title={identity.label}
    >
      <ScheduleIdentityMark identity={identity} size={size} />
    </span>
  );
}

function PreviewBody({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return <span className="text-text-secondary">{EMPTY_VALUE}</span>;
  const preview = trimmed.length > 180 ? `${trimmed.slice(0, 180).trimEnd()}…` : trimmed;
  return <span className="whitespace-pre-wrap">{preview}</span>;
}

function FullBody({ text, empty = "No notes." }: { text: string; empty?: string }) {
  const trimmed = text.trim();
  if (!trimmed) return <p className="text-sm text-text-secondary">{empty}</p>;
  return <pre className="whitespace-pre-wrap font-sans text-sm text-text-primary">{trimmed}</pre>;
}

export function ScoutingDirectReportPreviewCard({
  report,
  onOpen,
}: {
  report: ScoutingDirectReport;
  onOpen: (report: ScoutingDirectReport) => void;
}) {
  const teamLabel = scoutingTeamCanonicalLabel(report.teamDisplayName);
  return (
    <button
      type="button"
      data-scouting-report-card=""
      data-scouting-report-preview=""
      onClick={() => onOpen(report)}
      className="flex w-full flex-col rounded-card border border-[var(--module-border)] bg-surface px-3.5 py-3 text-left shadow-[0_4px_14px_rgba(17,24,39,0.03)] transition-colors hover:bg-[var(--module-tint)]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--module-accent)]/35"
    >
      <div className="flex items-start gap-2.5">
        <TeamMark name={report.teamDisplayName} size={28} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-text-primary">
              {report.opponentDisplayName || "Unnamed opponent"}
            </span>
            {report.isDoubles ? (
              <span className="rounded-control bg-[var(--module-tint)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--module-accent-text)]">
                Doubles
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-[11px] text-text-secondary">
            {teamLabel} ·{" "}
            {report.matchDate ? formatDate(report.matchDate) : report.matchDateRaw || EMPTY_VALUE} ·{" "}
            By {report.reportBy || "Unknown"} · {scoutingReportSourceLabel(report.source)} ·{" "}
            {report.isDoubles ? "Doubles" : "Singles"}
            {report.handedness ? ` · ${report.handedness}` : ""} · {report.importStatus}
          </span>
        </span>
        <span className="mt-0.5 shrink-0 text-[10px] font-medium text-[var(--module-accent-text)]">
          Open
        </span>
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-text-primary">
        <PreviewBody text={report.strengthsWeaknesses || report.scoutingReport} />
      </p>
    </button>
  );
}

export function ScoutingDirectReportCard({
  report,
  editable,
  editSlot,
  onOpenLinkedPlayer,
  opponentArchived = false,
}: {
  report: ScoutingDirectReport;
  editable?: boolean;
  editSlot?: ReactNode;
  onOpenLinkedPlayer?: (playerId: string) => void;
  opponentArchived?: boolean;
}) {
  const teamLabel = scoutingTeamCanonicalLabel(report.teamDisplayName);
  const hasImportedNarrative = Boolean(report.scoutingReport.trim() || report.strengthsWeaknesses.trim());

  return (
    <article
      data-scouting-report-card=""
      data-scouting-report-complete=""
      className="rounded-card border border-[var(--module-border)] bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--module-border)] px-5 py-4 max-md:px-4">
        <div className="flex min-w-0 items-start gap-3">
          <TeamMark name={report.teamDisplayName} size={40} />
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-wide text-text-secondary uppercase">
              Scouting Report Card
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary">
                {report.opponentDisplayName || "Unnamed opponent"}
              </h2>
              {opponentArchived ? (
                <span
                  data-scouting-archived-opponent-badge=""
                  className="rounded-control border border-border bg-app-background px-2 py-0.5 text-[11px] font-medium text-text-secondary"
                >
                  Archived Opponent
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-text-secondary">
              {teamLabel} ·{" "}
              {report.matchDate ? formatDate(report.matchDate) : report.matchDateRaw || EMPTY_VALUE} ·{" "}
              {report.isDoubles ? "Doubles" : "Singles"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              By {report.reportBy || EMPTY_VALUE} · {scoutingReportSourceLabel(report.source)} ·{" "}
              {report.importStatus}
              {report.handedness ? ` · ${report.handedness}` : ""}
            </p>
            {report.opponentPlayerId && onOpenLinkedPlayer ? (
              <button
                type="button"
                className="mt-2 min-h-11 text-sm font-medium text-[var(--module-accent-text)] hover:underline md:min-h-0"
                onClick={() => onOpenLinkedPlayer(report.opponentPlayerId!)}
              >
                Open opponent player
              </button>
            ) : null}
          </div>
        </div>
        {editable ? editSlot : null}
      </header>

      <div className="space-y-4 px-5 py-5 max-md:px-4">
        <WorkspaceStack>
          <WorkspaceSection title="Strengths / Weaknesses" tone="operations">
            <div className="mt-3">
              <FullBody text={report.strengthsWeaknesses} empty="No strengths/weaknesses recorded." />
            </div>
          </WorkspaceSection>
          <WorkspaceSection title="Original Imported Report" tone="module">
            <div className="mt-3">
              {hasImportedNarrative ? (
                <FullBody
                  text={report.scoutingReport || report.strengthsWeaknesses}
                  empty="No original narrative."
                />
              ) : (
                <p className="text-sm text-text-secondary">
                  CSV row had no separate Scouting Report column text; notes above are the source narrative.
                </p>
              )}
            </div>
          </WorkspaceSection>
          <WorkspaceSection title="Provenance" tone="neutral">
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DrawerField label="Source key">
                <p className="truncate text-sm text-text-primary" title={report.sourceKey}>
                  {report.sourceKey}
                </p>
              </DrawerField>
              <DrawerField label="Handedness (raw)">
                <p className="text-sm text-text-primary">{report.handednessRaw || EMPTY_VALUE}</p>
              </DrawerField>
              <DrawerField label="Match date (raw)">
                <p className="text-sm text-text-primary">{report.matchDateRaw || EMPTY_VALUE}</p>
              </DrawerField>
              <DrawerField label="Attachment refs">
                <p className="text-sm text-text-primary">
                  {report.attachmentRefs.length ? report.attachmentRefs.join(", ") : EMPTY_VALUE}
                </p>
              </DrawerField>
            </div>
          </WorkspaceSection>
        </WorkspaceStack>
      </div>
    </article>
  );
}

export function ScoutingAiReportCard({
  report,
  playerName,
  teamName,
  sourceReports,
  onOpenSource,
  actions,
}: {
  report: ScoutingPlayerReport;
  playerName: string;
  teamName: string;
  sourceReports: ScoutingDirectReport[];
  onOpenSource: (report: ScoutingDirectReport) => void;
  actions?: ReactNode;
}) {
  const teamLabel = scoutingTeamCanonicalLabel(teamName);
  const cited = sourceReports.filter((row) => report.citedDirectReportIds.includes(row.id));

  return (
    <article
      data-scouting-report-card=""
      data-scouting-ai-report-card=""
      className="rounded-card border border-[var(--module-border)] bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--module-border)] px-5 py-4 max-md:px-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-control bg-[var(--module-accent)]/10 text-[var(--module-accent)]">
            <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-wide text-text-secondary uppercase">
              AI Consolidated Report
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-text-primary">{playerName}</h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              {teamLabel} · {report.status}
              {report.stale ? " · stale" : ""}
              {report.generatedAt
                ? ` · ${formatDate(report.generatedAt.slice(0, 10))}`
                : ""}{" "}
              · {cited.length || report.citedDirectReportIds.length} sources
            </p>
          </div>
        </div>
        {actions}
      </header>
      <div className="space-y-4 px-5 py-5 max-md:px-4">
        <WorkspaceSection title="AI Summary" tone="research">
            <div className="mt-3">
            <FullBody text={report.body} empty="No AI summary yet." />
          </div>
        </WorkspaceSection>
        <WorkspaceSection title="Cited source reports" tone="neutral">
            <ul className="mt-3 space-y-2">
            {cited.length === 0 ? (
              <li className="text-sm text-text-secondary">No cited sources on this AI report.</li>
            ) : (
              cited.map((source) => (
                <li key={source.id}>
                  <ScoutingDirectReportPreviewCard report={source} onOpen={onOpenSource} />
                </li>
              ))
            )}
          </ul>
        </WorkspaceSection>
      </div>
    </article>
  );
}

export function ScoutingTeamReportCard({
  report,
  teamName,
  sourceReports,
  onOpenSource,
  onOpenPlayer,
  actions,
}: {
  report: ScoutingTeamReport;
  teamName: string;
  sourceReports: ScoutingDirectReport[];
  onOpenSource?: (report: ScoutingDirectReport) => void;
  onOpenPlayer?: (playerId: string) => void;
  actions?: ReactNode;
}) {
  const teamLabel = scoutingTeamCanonicalLabel(teamName);
  const cited = sourceReports.filter((row) => report.citedDirectReportIds.includes(row.id));
  const isAi = report.kind === "ai_generated";
  const citedPlayers = Array.from(
    new Map(
      cited
        .filter((row) => row.opponentPlayerId)
        .map((row) => [
          row.opponentPlayerId!,
          { id: row.opponentPlayerId!, name: row.opponentDisplayName },
        ]),
    ).values(),
  );

  return (
    <article
      data-scouting-report-card=""
      data-scouting-team-report-card=""
      className="rounded-card border border-[var(--module-border)] bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--module-border)] px-5 py-4 max-md:px-4">
        <div className="flex min-w-0 items-start gap-3">
          <TeamMark name={teamName} size={40} />
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-wide text-text-secondary uppercase">
              {isAi ? "AI Team Report Card" : "Team Report Card"}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-text-primary">{teamLabel}</h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              {isAi ? "AI consolidated" : "Manual"} · {report.status}
              {report.stale ? " · stale" : ""} · {cited.length || report.citedDirectReportIds.length}{" "}
              source reports
              {citedPlayers.length ? ` · ${citedPlayers.length} players` : ""}
            </p>
          </div>
        </div>
        {actions}
      </header>
      <div className="space-y-4 px-5 py-5 max-md:px-4">
        <WorkspaceSection
          title={isAi ? "AI Team Summary" : "Team Report"}
          tone={isAi ? "research" : "operations"}
        >
          <div className="mt-3">
            <FullBody text={report.body} empty="No team report body yet." />
          </div>
        </WorkspaceSection>
        {report.attachmentRefs.length ? (
          <WorkspaceSection title="Attachment references" tone="neutral">
            <p className="mt-3 text-sm text-text-primary">{report.attachmentRefs.join(", ")}</p>
          </WorkspaceSection>
        ) : null}
        {onOpenPlayer && citedPlayers.length ? (
          <WorkspaceSection title="Referenced players" tone="info">
            <ul className="mt-3 flex flex-wrap gap-2">
              {citedPlayers.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    onClick={() => onOpenPlayer(player.id)}
                    className="inline-flex min-h-11 items-center rounded-control border border-border px-3 text-sm font-medium text-[var(--module-accent-text)] hover:bg-[var(--module-tint)]/40 md:min-h-0"
                  >
                    {player.name || "Opponent player"}
                  </button>
                </li>
              ))}
            </ul>
          </WorkspaceSection>
        ) : null}
        {onOpenSource ? (
          <WorkspaceSection title="Source reports" tone="neutral">
            <ul className="mt-3 space-y-2">
              {cited.length === 0 ? (
                <li className="text-sm text-text-secondary">No cited match reports.</li>
              ) : (
                cited.map((source) => (
                  <li key={source.id}>
                    <ScoutingDirectReportPreviewCard report={source} onOpen={onOpenSource} />
                  </li>
                ))
              )}
            </ul>
          </WorkspaceSection>
        ) : null}
      </div>
    </article>
  );
}

export function ScoutingSubmissionPreviewCard({
  submission,
  onOpen,
}: {
  submission: ScoutingFormSubmission;
  onOpen: (submission: ScoutingFormSubmission) => void;
}) {
  return (
    <button
      type="button"
      data-scouting-report-card=""
      data-scouting-submission-preview=""
      onClick={() => onOpen(submission)}
      className="flex w-full flex-col rounded-card border border-[var(--module-border)] bg-surface px-3.5 py-3 text-left shadow-[0_4px_14px_rgba(17,24,39,0.03)] transition-colors hover:bg-[var(--module-tint)]/35"
    >
      <div className="flex items-start gap-2.5">
        {submission.teamDisplayName ? <TeamMark name={submission.teamDisplayName} size={28} /> : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text-primary">
            {submission.opponentDisplayName || "Form submission"}
          </span>
          <span className="mt-0.5 block text-[11px] text-text-secondary">
            {submission.teamDisplayName
              ? scoutingTeamCanonicalLabel(submission.teamDisplayName)
              : EMPTY_VALUE}{" "}
            · {formatDate(submission.createdAt.slice(0, 10))} · {submission.status}
          </span>
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-text-primary">
        <PreviewBody text={submission.strengthsWeaknesses || submission.scoutingReport} />
      </p>
    </button>
  );
}

export function ScoutingSubmissionCard({
  submission,
  statusControl,
}: {
  submission: ScoutingFormSubmission;
  statusControl?: ReactNode;
}) {
  return (
    <article
      data-scouting-report-card=""
      data-scouting-submission-card=""
      className="rounded-card border border-[var(--module-border)] bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--module-border)] px-5 py-4 max-md:px-4">
        <div className="flex min-w-0 items-start gap-3">
          {submission.teamDisplayName ? <TeamMark name={submission.teamDisplayName} size={40} /> : null}
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-wide text-text-secondary uppercase">
              Form Submission Card
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-text-primary">
              {submission.opponentDisplayName || "Unnamed opponent"}
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              {submission.teamDisplayName
                ? scoutingTeamCanonicalLabel(submission.teamDisplayName)
                : EMPTY_VALUE}{" "}
              · {formatDate(submission.createdAt.slice(0, 10))} · {submission.status}
            </p>
          </div>
        </div>
        {statusControl}
      </header>
      <div className="space-y-4 px-5 py-5 max-md:px-4">
        <WorkspaceSection title="Strengths / Weaknesses" tone="operations">
            <div className="mt-3">
            <FullBody text={submission.strengthsWeaknesses} />
          </div>
        </WorkspaceSection>
        <WorkspaceSection title="Scouting Report" tone="module">
            <div className="mt-3">
            <FullBody text={submission.scoutingReport} />
          </div>
        </WorkspaceSection>
        <WorkspaceSection title="Provenance" tone="neutral">
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DrawerField label="Report by">
              <p className="text-sm text-text-primary">{submission.reportBy || EMPTY_VALUE}</p>
            </DrawerField>
            <DrawerField label="Handedness">
              <p className="text-sm text-text-primary">{submission.handedness || EMPTY_VALUE}</p>
            </DrawerField>
            <DrawerField label="Doubles">
              <p className="text-sm text-text-primary">{submission.isDoubles ? "Yes" : "No"}</p>
            </DrawerField>
            <DrawerField label="Match date">
              <p className="text-sm text-text-primary">
                {submission.matchDate ? formatDate(submission.matchDate) : EMPTY_VALUE}
              </p>
            </DrawerField>
          </div>
        </WorkspaceSection>
      </div>
    </article>
  );
}

export { TeamMark as ScoutingTeamMark };
