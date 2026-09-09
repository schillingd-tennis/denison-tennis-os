"use client";

import {
  Brain,
  ClipboardList,
  FileStack,
  LayoutDashboard,
  NotebookPen,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";

import {
  AdaptiveWorkspace,
  type AdaptiveWorkspaceDefinition,
  WorkspaceSection,
} from "@/components/adaptive-workspace";
import { MobileWorkspaceSelector } from "@/components/mobile-workspace";
import {
  PersonWorkspaceDesktopSplit,
  PersonWorkspaceMobilePane,
  PersonWorkspaceShell,
} from "@/components/person-workspace-shell";
import { DrawerField } from "@/components/workspace-drawer";
import { EMPTY_VALUE, formatDate } from "@/lib/formatting";

import {
  archiveOpponentPlayerAction,
  loadPlayerWorkspaceAction,
  regeneratePlayerAiAction,
  restoreOpponentPlayerAction,
  reviewPlayerAiAction,
  saveManualPlayerReportAction,
} from "../actions";
import {
  countDistinctContributors,
  countLinkedDirectReports,
  latestLinkedReportDateLabel,
  linkedDirectReportsForPlayer,
  quickAiSourceSubtitle,
  selectPlayerAiEvidenceReports,
} from "../overviewMetrics";
import { canGeneratePlayerAi, isOpponentArchived } from "../playerLifecycle";
import {
  resolveScoutingTeamIdentity,
  scoutingTeamCanonicalLabel,
} from "../teamIdentity";
import type {
  ScoutingDirectReport,
  ScoutingOpponentPlayer,
  ScoutingPlayerReport,
} from "../types";
import {
  ScoutingAiReportCard,
  ScoutingDirectReportPreviewCard,
  ScoutingTeamMark,
} from "./ScoutingReportCards";

export type ScoutingPlayerWorkspaceId =
  | "overview"
  | "direct"
  | "ai"
  | "matchReports"
  | "notes";

type NavItem = {
  id: ScoutingPlayerWorkspaceId;
  title: string;
  icon: typeof LayoutDashboard;
  descriptor: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    title: "Overview",
    icon: LayoutDashboard,
    descriptor: "Identity, evidence counts, AI status",
  },
  {
    id: "direct",
    title: "Direct Report",
    icon: ClipboardList,
    descriptor: "Manually maintained player report",
  },
  {
    id: "ai",
    title: "AI Report",
    icon: Brain,
    descriptor: "Consolidated AI summary (separate)",
  },
  {
    id: "matchReports",
    title: "Match Reports",
    icon: FileStack,
    descriptor: "Linked individual scouting reports",
  },
  {
    id: "notes",
    title: "Notes",
    icon: NotebookPen,
    descriptor: "Player-level internal notes",
  },
];

const toneSurface: Record<
  ScoutingPlayerWorkspaceId,
  { icon: string; active: string; activeIcon: string }
> = {
  overview: {
    icon: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    active: "border-[var(--module-accent)] bg-[var(--module-tint)]",
    activeIcon: "bg-[var(--module-accent)]/15 text-[var(--module-accent)]",
  },
  direct: {
    icon: "bg-operations/10 text-operations",
    active: "border-operations bg-operations/[0.08]",
    activeIcon: "bg-operations/15 text-operations",
  },
  ai: {
    icon: "bg-research/10 text-research",
    active: "border-research bg-research/[0.08]",
    activeIcon: "bg-research/15 text-research",
  },
  matchReports: {
    icon: "bg-info/10 text-info",
    active: "border-info bg-info/[0.07]",
    activeIcon: "bg-info/15 text-info",
  },
  notes: {
    icon: "bg-knowledge/10 text-knowledge",
    active: "border-knowledge bg-knowledge/[0.07]",
    activeIcon: "bg-knowledge/15 text-knowledge",
  },
};

function ScoutingPlayerNav({
  items,
  activeId,
  onSelect,
}: {
  items: NavItem[];
  activeId: string;
  onSelect: (id: ScoutingPlayerWorkspaceId) => void;
}) {
  return (
    <ul className="divide-y divide-border/35" role="listbox" aria-label="Scouting player workspaces">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeId;
        const tone = toneSurface[item.id];
        return (
          <li key={item.id} role="option" aria-selected={active}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={`group flex min-h-11 w-full cursor-pointer items-center gap-3 border-l-[3px] px-3 py-2 text-left transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--module-accent)]/35 md:min-h-0 ${
                active ? tone.active : "border-transparent hover:bg-app-background"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${
                  active ? tone.activeIcon : tone.icon
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium tracking-tight text-text-primary">
                  {item.title}
                </span>
                <span className="mt-px block truncate text-[12px] leading-snug text-text-secondary">
                  {item.descriptor}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function ScoutingPlayerCard({
  player,
  reports,
  initialWorkspace = "overview",
  onOpenReport,
  headerActions,
  onArchived,
  onRestored,
}: {
  player: ScoutingOpponentPlayer;
  reports: ScoutingDirectReport[];
  initialWorkspace?: ScoutingPlayerWorkspaceId;
  onOpenReport: (report: ScoutingDirectReport) => void;
  headerActions?: ReactNode;
  onArchived?: (playerId: string) => void;
  onRestored?: (playerId: string) => void;
}) {
  const [workspaceId, setWorkspaceId] = useState<ScoutingPlayerWorkspaceId>(initialWorkspace);
  const [manualReport, setManualReport] = useState<ScoutingPlayerReport | null>(null);
  const [aiReport, setAiReport] = useState<ScoutingPlayerReport | null>(null);
  const [manualBody, setManualBody] = useState("");
  const [message, setMessage] = useState<string>();
  const [aiError, setAiError] = useState<string>();
  const [showSources, setShowSources] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [lifecycleOverride, setLifecycleOverride] = useState<{
    archivedAt: string | null;
    archivedBy: string | null;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [playerSyncKey, setPlayerSyncKey] = useState(`${player.id}:${initialWorkspace}`);
  const nextPlayerSyncKey = `${player.id}:${initialWorkspace}`;
  if (playerSyncKey !== nextPlayerSyncKey) {
    setPlayerSyncKey(nextPlayerSyncKey);
    setWorkspaceId(initialWorkspace);
    setShowSources(false);
    setAiError(undefined);
    setConfirmArchive(false);
    setLifecycleOverride(null);
  }

  const effectivePlayer: ScoutingOpponentPlayer = lifecycleOverride
    ? {
        ...player,
        archivedAt: lifecycleOverride.archivedAt,
        archivedBy: lifecycleOverride.archivedBy,
      }
    : player;
  const archived = isOpponentArchived(effectivePlayer);
  const allowAiGenerate = canGeneratePlayerAi(effectivePlayer);

  const playerReports = useMemo(
    () => linkedDirectReportsForPlayer(reports, player.id),
    [player.id, reports],
  );

  const reportCount = countLinkedDirectReports(reports, player.id);
  const latestLabel = latestLinkedReportDateLabel(reports, player.id);
  const contributorCount = countDistinctContributors(reports, player.id);
  const evidenceReports = useMemo(
    () =>
      selectPlayerAiEvidenceReports({
        playerId: player.id,
        directReports: reports,
        priorAiReport: aiReport,
      }),
    [aiReport, player.id, reports],
  );

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const result = await loadPlayerWorkspaceAction(player.id);
      if (cancelled || !result.success) return;
      setManualReport(result.workspace.manualReport);
      setAiReport(result.workspace.aiReport);
      setManualBody(result.workspace.manualReport?.body ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [player.id]);

  const teamLabel = scoutingTeamCanonicalLabel(player.teamDisplayName);
  const identity = resolveScoutingTeamIdentity(player.teamDisplayName);
  const singles = playerReports.filter((report) => !report.isDoubles).length;
  const doubles = playerReports.filter((report) => report.isDoubles).length;
  const aiStale = Boolean(player.aiStale || aiReport?.stale);
  const aiStatusLabel = !aiReport
    ? "None"
    : aiStale
      ? "Stale"
      : aiReport.status === "reviewed"
        ? "Reviewed"
        : "Draft";
  const quickSubtitle = quickAiSourceSubtitle(reportCount, contributorCount);
  const quickBullets = aiReport?.quickSummaryBullets ?? [];

  function runAiGeneration() {
    if (pending || reportCount === 0 || !allowAiGenerate) return;
    setAiError(undefined);
    startTransition(async () => {
      const result = await regeneratePlayerAiAction(player.id);
      if (result.success) {
        setAiReport(result.report);
        setMessage("AI summary generated (draft — review required).");
      } else {
        setAiError(result.message);
        setMessage(result.message);
      }
    });
  }

  function confirmArchiveOpponent() {
    if (pending) return;
    startTransition(async () => {
      const result = await archiveOpponentPlayerAction(player.id);
      if (result.success) {
        setConfirmArchive(false);
        setLifecycleOverride({
          archivedAt: result.player.archivedAt,
          archivedBy: result.player.archivedBy,
        });
        const linkNote =
          result.deactivatedFormLinkCount > 0
            ? ` Deactivated ${result.deactivatedFormLinkCount} form link${result.deactivatedFormLinkCount === 1 ? "" : "s"}.`
            : "";
        setMessage(`Opponent archived.${linkNote}`);
        onArchived?.(player.id);
      } else {
        setMessage(result.message);
      }
    });
  }

  function restoreOpponent() {
    if (pending) return;
    startTransition(async () => {
      const result = await restoreOpponentPlayerAction(player.id);
      if (result.success) {
        setLifecycleOverride({ archivedAt: null, archivedBy: null });
        setMessage("Opponent restored to Active.");
        onRestored?.(player.id);
      } else {
        setMessage(result.message);
      }
    });
  }

  const adaptiveWorkspaces: AdaptiveWorkspaceDefinition[] = [
    {
      id: "overview",
      title: "Overview",
      subtitle: "Opponent identity and evidence summary",
      content: (
        <div className="space-y-4" data-scouting-player-overview="">
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            data-scouting-overview-summary-cards=""
            role="group"
            aria-label="Opponent scouting summary"
          >
            <OverviewSummaryCard
              label="Reports"
              value={String(reportCount)}
              hint="Linked direct reports"
            />
            <OverviewSummaryCard
              label="Latest Report"
              value={latestLabel}
              hint="Most recent match date"
            />
            <OverviewSummaryCard
              label="Contributors"
              value={String(contributorCount)}
              hint="Different report authors"
            />
          </div>

          <section
            className="rounded-card border border-[var(--module-border)] bg-surface px-4 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
            data-scouting-quick-ai=""
            aria-labelledby="scouting-quick-ai-title"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  id="scouting-quick-ai-title"
                  className="text-sm font-semibold tracking-tight text-text-primary"
                >
                  Quick AI Scouting Report
                </h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Generated from all direct reports for this opponent
                </p>
                <p className="mt-1 text-xs text-text-secondary" data-scouting-quick-ai-evidence="">
                  {quickSubtitle}
                  {aiReport?.generatedAt
                    ? ` · Generated ${formatDate(aiReport.generatedAt.slice(0, 10))}`
                    : ""}
                  {aiReport ? ` · Status ${aiStatusLabel}` : ""}
                  {reportCount > 0 ? ` · ${evidenceReports.length} sources` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {reportCount > 0 && aiReport ? (
                  <>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-control border border-border px-3 text-xs font-semibold md:min-h-9"
                      onClick={() => setShowSources((open) => !open)}
                      aria-expanded={showSources}
                    >
                      View Sources
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-control border border-border px-3 text-xs font-semibold md:min-h-9"
                      onClick={() => setWorkspaceId("ai")}
                      data-scouting-open-full-ai=""
                    >
                      Open Full AI Report
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {reportCount === 0 ? (
              <p className="mt-3 text-sm text-text-secondary" data-scouting-quick-ai-empty="">
                No scouting reports are linked to this opponent yet. Add a scouting report to
                generate a player summary.
              </p>
            ) : !aiReport ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-text-secondary">
                  {archived
                    ? "Existing AI summaries stay readable while archived. Restore this opponent to generate a new summary."
                    : "No AI summary yet. Generate from linked match reports only — review required."}
                </p>
                {allowAiGenerate ? (
                  <button
                    type="button"
                    disabled={pending}
                    className="inline-flex min-h-11 items-center gap-1 rounded-control border border-border px-3 text-sm font-semibold md:min-h-9"
                    onClick={runAiGeneration}
                    aria-busy={pending}
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    {pending ? "Generating…" : "Generate AI Summary"}
                  </button>
                ) : null}
                {pending ? (
                  <p className="text-xs text-text-secondary" role="status" aria-live="polite">
                    Generating AI summary…
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {aiStale ? (
                  <p className="text-xs text-text-secondary" role="status">
                    Newer reports are available — this summary is stale.
                  </p>
                ) : null}
                {quickBullets.length > 0 ? (
                  <ul className="list-disc space-y-1.5 pl-5 text-sm text-text-primary">
                    {quickBullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-secondary">
                    Full AI report is available; quick bullets were not stored for this generation.
                    Update to refresh Overview bullets.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {aiStale && allowAiGenerate ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="inline-flex min-h-11 items-center gap-1 rounded-control border border-border px-3 text-xs font-semibold md:min-h-9"
                      onClick={runAiGeneration}
                      aria-busy={pending}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                      {pending ? "Updating…" : "Update AI Summary"}
                    </button>
                  ) : null}
                  {aiError && allowAiGenerate ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="inline-flex min-h-11 items-center gap-1 rounded-control border border-border px-3 text-xs font-semibold md:min-h-9"
                      onClick={runAiGeneration}
                      aria-busy={pending}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                      Retry
                    </button>
                  ) : null}
                </div>
                {archived ? (
                  <p className="text-xs text-text-secondary">
                    Restore this opponent to update or regenerate the AI summary.
                  </p>
                ) : null}
                {aiError ? (
                  <p className="text-sm text-danger" role="alert">
                    {aiError}
                  </p>
                ) : null}
                {pending ? (
                  <p className="text-xs text-text-secondary" role="status" aria-live="polite">
                    Generating AI summary…
                  </p>
                ) : null}
              </div>
            )}

            {showSources && evidenceReports.length > 0 ? (
              <ul className="mt-4 space-y-2" data-scouting-quick-ai-sources="">
                {evidenceReports.map((report) => (
                  <li key={report.id}>
                    <ScoutingDirectReportPreviewCard report={report} onOpen={onOpenReport} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <WorkspaceSection title="Evidence mix" tone="operations">
            <p className="mt-3 text-sm text-text-primary">
              {singles} singles · {doubles} doubles · Lineup position {EMPTY_VALUE}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {identity?.slug ? `School identity · ${identity.slug}` : "No school identity slug"}
            </p>
          </WorkspaceSection>
          <WorkspaceSection title="Recent match reports" tone="info">
            <ul className="mt-3 space-y-2">
              {playerReports.slice(0, 3).map((report) => (
                <li key={report.id}>
                  <ScoutingDirectReportPreviewCard report={report} onOpen={onOpenReport} />
                </li>
              ))}
              {playerReports.length === 0 ? (
                <li className="text-sm text-text-secondary">No linked match reports.</li>
              ) : null}
            </ul>
          </WorkspaceSection>
        </div>
      ),
    },
    {
      id: "direct",
      title: "Direct Report",
      subtitle: "Manually maintained top-level player report",
      content: (
        <div className="space-y-3" data-scouting-direct-ai-split="" data-scouting-direct-workspace="">
          <DrawerField label="Direct scouting report">
            <textarea
              className="min-h-48 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm"
              value={manualBody}
              onChange={(event) => setManualBody(event.target.value)}
            />
          </DrawerField>
          <button
            type="button"
            disabled={pending}
            className="inline-flex h-11 items-center rounded-control border border-border px-3 text-sm font-semibold md:h-9"
            onClick={() =>
              startTransition(async () => {
                const result = await saveManualPlayerReportAction(player.id, manualBody);
                if (result.success) {
                  setManualReport(result.report);
                  setMessage("Direct report saved.");
                } else setMessage(result.message);
              })
            }
          >
            Save Direct Report
          </button>
          {manualReport ? (
            <p className="text-xs text-text-secondary">
              Status {manualReport.status}
              {manualReport.reviewedAt ? ` · reviewed ${formatDate(manualReport.reviewedAt.slice(0, 10))}` : ""}
            </p>
          ) : (
            <p className="text-sm text-text-secondary">No direct consolidated report yet.</p>
          )}
        </div>
      ),
    },
    {
      id: "ai",
      title: "AI Report",
      subtitle: "Separate AI consolidated report — review required",
      content: (
        <div className="space-y-3" data-scouting-ai-workspace="">
          {aiReport ? (
            <ScoutingAiReportCard
              report={aiReport}
              playerName={player.displayName}
              teamName={player.teamDisplayName}
              sourceReports={playerReports}
              onOpenSource={onOpenReport}
              actions={
                <div className="flex flex-wrap gap-2">
                  {allowAiGenerate ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="inline-flex h-11 items-center gap-1 rounded-control border border-border px-2.5 text-xs font-semibold md:h-9"
                      onClick={runAiGeneration}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate AI
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    className="inline-flex h-11 items-center gap-1 rounded-control border border-border px-2.5 text-xs font-semibold md:h-9"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await reviewPlayerAiAction(aiReport.id);
                        if (result.success) {
                          setAiReport(result.report);
                          setMessage("AI summary marked reviewed.");
                        } else setMessage(result.message);
                      })
                    }
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Mark reviewed
                  </button>
                </div>
              }
            />
          ) : (
            <div className="rounded-card border border-border p-4">
              <p className="text-sm text-text-secondary">
                {archived
                  ? "Existing AI summaries stay readable while archived. Restore this opponent to generate a new summary."
                  : "No AI summary yet. Generate from linked match reports only — review required."}
              </p>
              {allowAiGenerate ? (
                <button
                  type="button"
                  disabled={pending || reportCount === 0}
                  className="mt-3 inline-flex h-11 items-center gap-1 rounded-control border border-border px-3 text-sm font-semibold md:h-9"
                  onClick={runAiGeneration}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Generate AI Report
                </button>
              ) : null}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "matchReports",
      title: "Match Reports",
      subtitle: "Every linked individual report as cards",
      content: (
        <ul className="space-y-2" data-scouting-match-reports-section="">
          {playerReports.map((report) => (
            <li key={report.id}>
              <ScoutingDirectReportPreviewCard report={report} onOpen={onOpenReport} />
            </li>
          ))}
          {playerReports.length === 0 ? (
            <li className="text-sm text-text-secondary">No linked direct reports for this player.</li>
          ) : null}
        </ul>
      ),
    },
    {
      id: "notes",
      title: "Notes",
      subtitle: "Player-level internal notes",
      content: (
        <div data-scouting-notes-workspace="">
          <p className="text-sm text-text-secondary">
            Player-level notes are not in the approved scouting schema yet. Use Direct Report for
            durable player commentary.
          </p>
        </div>
      ),
    },
  ];

  const resolvedId = NAV_ITEMS.some((item) => item.id === workspaceId) ? workspaceId : "overview";

  return (
    <div data-scouting-player-workspace="" data-scouting-player-card="" className="space-y-4">
      <section
        className="rounded-card border border-[var(--module-border)] bg-surface px-5 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)] max-md:px-4"
        aria-label="Scouting player header"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ScoutingTeamMark name={player.teamDisplayName} size={48} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-text-primary">
                  {player.displayName}
                </h2>
                {archived ? (
                  <span
                    data-scouting-archived-status=""
                    className="rounded-control border border-border bg-app-background px-2 py-0.5 text-[11px] font-medium text-text-secondary"
                  >
                    Archived
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-text-secondary">
                {teamLabel} · {player.handedness || "Hand unknown"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {reportCount} direct ·{" "}
                {latestLabel !== EMPTY_VALUE ? `Latest ${latestLabel}` : "No dated reports"} ·{" "}
                {singles} singles / {doubles} doubles · AI {aiStatusLabel}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {headerActions}
            {archived ? (
              <button
                type="button"
                data-scouting-restore-opponent=""
                disabled={pending}
                className="inline-flex min-h-11 items-center rounded-control border border-border px-3 text-xs font-semibold text-text-primary md:min-h-9"
                onClick={restoreOpponent}
              >
                Restore Opponent
              </button>
            ) : (
              <button
                type="button"
                data-scouting-archive-opponent=""
                disabled={pending}
                className="inline-flex min-h-11 items-center rounded-control border border-border px-3 text-xs font-medium text-text-secondary md:min-h-9"
                onClick={() => setConfirmArchive(true)}
              >
                Archive Opponent
              </button>
            )}
          </div>
        </div>
        {confirmArchive ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="scouting-archive-confirm-title"
            data-scouting-archive-confirm=""
            className="mt-4 rounded-control border border-border bg-app-background px-4 py-3"
          >
            <p
              id="scouting-archive-confirm-title"
              className="text-sm font-semibold text-text-primary"
            >
              Archive {player.displayName}?
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              This opponent will be removed from active Scouting views. Their reports and scouting
              history will be preserved.
            </p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-control border border-border px-3 text-xs font-semibold md:min-h-9"
                onClick={() => setConfirmArchive(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                data-scouting-archive-confirm-button=""
                disabled={pending}
                className="inline-flex min-h-11 items-center rounded-control border border-border bg-surface px-3 text-xs font-semibold text-text-primary md:min-h-9"
                onClick={confirmArchiveOpponent}
              >
                {pending ? "Archiving…" : "Archive Opponent"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <PersonWorkspaceShell
        mobile={
          <PersonWorkspaceMobilePane>
            <MobileWorkspaceSelector
              items={NAV_ITEMS.map((item) => ({
                id: item.id,
                title: item.title,
                icon: item.icon,
                lines: item.descriptor ? [item.descriptor] : [],
              }))}
              activeId={resolvedId}
              onSelect={(id) => setWorkspaceId(id as ScoutingPlayerWorkspaceId)}
            />
            <AdaptiveWorkspace activeId={resolvedId} workspaces={adaptiveWorkspaces} />
          </PersonWorkspaceMobilePane>
        }
        desktop={
          <PersonWorkspaceDesktopSplit
            nav={
              <ScoutingPlayerNav
                items={NAV_ITEMS}
                activeId={resolvedId}
                onSelect={setWorkspaceId}
              />
            }
            content={
              <AdaptiveWorkspace framed={false} activeId={resolvedId} workspaces={adaptiveWorkspaces} />
            }
          />
        }
      />

      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
    </div>
  );
}

function OverviewSummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-control border border-[var(--module-accent)]/15 bg-[var(--module-tint)]/70 px-3 py-2.5">
      <p className="truncate text-[17px] leading-none font-semibold tracking-tight text-[var(--module-accent)]">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-medium tracking-wide text-text-secondary uppercase">
        {label}
      </p>
      {hint ? <p className="mt-1 truncate text-[11px] text-text-secondary">{hint}</p> : null}
    </div>
  );
}
