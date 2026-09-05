/**
 * Canonical Recruiting table chrome — Rank View is the visual source of truth.
 * List and Rank must consume these tokens so they cannot drift.
 */
import { TEAM_DIRECTORY_META } from "@/features/people/directoryHierarchy";

/**
 * Shared column widths (px). Leading handle/rank exist on both modes so
 * Class→Actions X positions match when switching List ↔ Rank.
 * Rank Action sits before Actions so Call/Text/Email stay far-right.
 */
export const RECRUITING_TABLE_COLUMNS = {
  handle: 28,
  rank: 48,
  classYear: 72,
  pipeline: 140,
  priority: 132,
  tier: 56,
  interest: 110,
  outcome: 148,
  schoolChosen: 148,
  utr: 76,
  trn: 72,
  wtn: 76,
  rankAction: 60,
  contact: 116,
} as const;

/** @deprecated Prefer RECRUITING_TABLE_COLUMNS — kept for any external Rank imports. */
export const RECRUIT_RANK_COLUMNS = RECRUITING_TABLE_COLUMNS;

/**
 * Metrics View column widths only. Do not reuse for List / Rank / Commit —
 * those views keep RECRUITING_TABLE_COLUMNS unchanged.
 *
 * Recruit is a fixed width (not leftover flex) so Class starts farther left
 * and more metric columns fit before horizontal scroll.
 */
export const RECRUITING_METRICS_COLUMN_WIDTHS = {
  rank: 48,
  recruit: 228,
  classYear: 64,
  matchesPlayed: 120,
  utr: 62,
  wtn: 62,
  trn: 58,
  z: 74,
  compositeZ: 102,
  weightedScore: 120,
  reliability: 96,
  reliabilityScore: 136,
} as const;

const METRICS_W = RECRUITING_METRICS_COLUMN_WIDTHS;

export const RECRUITING_METRICS_TABLE_WIDTH =
  METRICS_W.rank +
  METRICS_W.recruit +
  METRICS_W.classYear +
  METRICS_W.matchesPlayed +
  METRICS_W.utr +
  METRICS_W.wtn +
  METRICS_W.trn +
  METRICS_W.z * 3 +
  METRICS_W.compositeZ +
  METRICS_W.weightedScore +
  METRICS_W.reliability +
  METRICS_W.reliabilityScore;

/** Sized to the Metrics colgroup so Recruit cannot absorb leftover viewport. */
export const RECRUITING_METRICS_TABLE_CLASS =
  "table-fixed border-collapse text-left";

/** Metrics numeric cells only — centered scan columns, not List/Rank/Commit metrics. */
export const RECRUITING_METRICS_METRIC =
  "text-center tabular-nums text-[13px] leading-none font-normal text-text-secondary";

export const RECRUITING_TABLE_AVATAR_SIZE = 32;

export const RECRUITING_TABLE = {
  table: "w-full min-w-[80rem] table-fixed border-collapse text-left",
  section: "overflow-x-auto rounded-card border border-black/[0.06] bg-surface",
  sectionBar:
    "flex items-center justify-between border-b border-black/[0.06] px-3 py-2",
  sectionLabel:
    "text-[11px] font-medium tracking-wide text-text-secondary",
  sectionCount: "text-xs tabular-nums text-text-secondary",
  th: "h-9 border-b border-black/[0.06] bg-app-background px-2 whitespace-nowrap text-xs font-medium tracking-wide text-text-secondary",
  td: "h-14 border-b border-black/[0.06] px-2 py-1.5 align-middle",
  rowHover: "transition-colors hover:bg-black/[0.015]",
  metric:
    "text-right tabular-nums text-[13px] leading-none font-normal text-text-secondary",
  /** Rank View primary Coach Rank (#1). */
  rankValue:
    "block text-[17px] leading-none font-bold tracking-tight tabular-nums text-text-primary",
  /** List View secondary Coach Rank — muted, does not compete with name. */
  rankMuted:
    "shrink-0 text-[12px] font-medium tabular-nums text-text-secondary/55",
  hometown: `truncate text-[12px] leading-tight ${TEAM_DIRECTORY_META}`,
  actionButton:
    "inline-flex h-[28px] shrink-0 items-center justify-center rounded px-2.5 text-[12px] font-medium leading-none text-[var(--module-accent)] ring-1 ring-[var(--module-accent)]/35 transition-colors hover:bg-[var(--module-tint)] disabled:opacity-50",
  removeActionButton:
    "inline-flex h-[28px] shrink-0 items-center justify-center rounded px-2.5 text-[12px] font-medium leading-none text-danger/75 ring-1 ring-danger/30 transition-colors hover:bg-danger/[0.06] disabled:opacity-50",
  classValue:
    "tabular-nums text-[13px] leading-none font-normal text-text-secondary",
} as const;

/** Contextual subtitle under permanent “Recruiting Board” heading. */
export function rankBoardClassContextLabel(
  activeFilterIds: readonly string[],
): string {
  const classFilters = activeFilterIds.filter((id) => id.startsWith("classYear:"));
  if (classFilters.length === 0) {
    return "Select a class to manage Coach Rank";
  }
  if (classFilters.length > 1) {
    return `${classFilters.length} Classes Selected`;
  }
  const raw = classFilters[0].slice("classYear:".length);
  if (raw === "none") {
    return "Select a class to manage Coach Rank";
  }
  return `${raw} Class`;
}

/** List View class-context subtitle under the Directory heading. */
export function listDirectoryClassContextLabel(
  activeFilterIds: readonly string[],
): string {
  const classFilters = activeFilterIds.filter((id) => id.startsWith("classYear:"));
  if (classFilters.length === 0) {
    return "All Classes";
  }
  if (classFilters.length > 1) {
    return `${classFilters.length} Classes Selected`;
  }
  const raw = classFilters[0].slice("classYear:".length);
  if (raw === "none") {
    return "All Classes";
  }
  return `${raw} Class`;
}

/** Commit View class-context subtitle under “Commit Board”. */
export function commitBoardClassContextLabel(
  activeFilterIds: readonly string[],
): string {
  return listDirectoryClassContextLabel(activeFilterIds);
}
