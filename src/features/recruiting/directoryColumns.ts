/**
 * Recruiting directory columns (BP-045).
 * Mix of Person identity, Recruit Profile classification, and computed analytics.
 */
import type { ColumnDef } from "@/components/data-table/types";
import type { FoundSetColumn } from "@/components/found-set";
import { getDisplayFirstName, getDisplayName, getHometown } from "@/features/people/utils";
import { EMPTY_VALUE, formatDisplay, formatUtr, formatWtn } from "@/lib/formatting";

import type { RecruitDirectoryRow } from "./directory";

export type RecruitDirectoryColumnId =
  | "name"
  | "recruitClassYear"
  | "pipelineStage"
  | "priority"
  | "interest"
  | "outcome"
  | "utr"
  | "trnRank"
  | "wtn";

export type RecruitCommitColumnId =
  | "name"
  | "recruitClassYear"
  | "pipelineStage"
  | "priority"
  | "outcome"
  | "schoolChosen"
  | "utr"
  | "trnRank"
  | "wtn";

function nameSortKey(row: RecruitDirectoryRow): string {
  const last = row.person.lastName?.trim() || "";
  const first = getDisplayFirstName(row.person).trim();
  return `${last}\u0000${first}`;
}

/**
 * Name-cell secondary line for mobile / found-set summary.
 * Class lives in its own table column — identity line is hometown only.
 */
export function recruitListSummaryLine(row: RecruitDirectoryRow): string {
  return getHometown(row.person) || "";
}

export const RECRUITING_DIRECTORY_TABLE_COLUMNS: ColumnDef<
  RecruitDirectoryRow,
  RecruitDirectoryColumnId
>[] = [
  {
    id: "name",
    title: "Recruit",
    sortable: true,
    sortType: "text",
    accessor: nameSortKey,
    defaultSort: "asc",
  },
  {
    id: "recruitClassYear",
    title: "Class",
    sortable: true,
    sortType: "number",
    accessor: (row) => row.profile.recruitClassYear,
    defaultSort: "asc",
  },
  {
    id: "pipelineStage",
    title: "Pipeline",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.profile.pipelineStage?.label,
    defaultSort: "asc",
  },
  {
    id: "priority",
    title: "Priority",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.profile.priority?.label,
    defaultSort: "asc",
  },
  {
    id: "interest",
    title: "Interest",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.profile.interest?.label,
    defaultSort: "asc",
  },
  {
    id: "outcome",
    title: "Outcome",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.profile.outcome?.label,
    defaultSort: "asc",
  },
  {
    id: "utr",
    title: "UTR",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.person.utr,
    defaultSort: "desc",
  },
  {
    id: "trnRank",
    title: "TRN",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.person.trnRank,
    defaultSort: "asc",
  },
  {
    id: "wtn",
    title: "WTN",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.person.wtn,
    defaultSort: "asc",
  },
];

export const RECRUITING_COMMIT_TABLE_COLUMNS: ColumnDef<
  RecruitDirectoryRow,
  RecruitCommitColumnId
>[] = [
  {
    id: "name",
    title: "Recruit",
    sortable: true,
    sortType: "text",
    accessor: nameSortKey,
    defaultSort: "asc",
  },
  {
    id: "recruitClassYear",
    title: "Class",
    sortable: true,
    sortType: "number",
    accessor: (row) => row.profile.recruitClassYear,
    defaultSort: "asc",
  },
  {
    id: "pipelineStage",
    title: "Pipeline",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.profile.pipelineStage?.label,
    defaultSort: "asc",
  },
  {
    id: "priority",
    title: "Priority",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.profile.priority?.label,
    defaultSort: "asc",
  },
  {
    id: "outcome",
    title: "Outcome",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.profile.outcome?.label,
    defaultSort: "asc",
  },
  {
    id: "schoolChosen",
    title: "School Chosen",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.profile.schoolChosen,
    defaultSort: "asc",
  },
  {
    id: "utr",
    title: "UTR",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.person.utr,
    defaultSort: "desc",
  },
  {
    id: "trnRank",
    title: "TRN",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.person.trnRank,
    defaultSort: "asc",
  },
  {
    id: "wtn",
    title: "WTN",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.person.wtn,
    defaultSort: "asc",
  },
];

export const RECRUITING_COMMIT_FOUND_SET_COLUMNS: FoundSetColumn<RecruitDirectoryRow>[] = [
  { id: "name", title: "Name", accessor: (row) => getDisplayName(row.person) },
  {
    id: "hometown",
    title: "Hometown",
    accessor: (row) => recruitListSummaryLine(row) || EMPTY_VALUE,
  },
  {
    id: "recruitClassYear",
    title: "Class",
    accessor: (row) =>
      row.profile.recruitClassYear !== undefined
        ? String(row.profile.recruitClassYear)
        : EMPTY_VALUE,
  },
  {
    id: "pipelineStage",
    title: "Pipeline",
    accessor: (row) => row.profile.pipelineStage?.label ?? EMPTY_VALUE,
  },
  {
    id: "priority",
    title: "Priority",
    accessor: (row) => row.profile.priority?.label ?? EMPTY_VALUE,
  },
  {
    id: "outcome",
    title: "Outcome",
    accessor: (row) => row.profile.outcome?.label ?? EMPTY_VALUE,
  },
  {
    id: "schoolChosen",
    title: "School Chosen",
    accessor: (row) => row.profile.schoolChosen ?? EMPTY_VALUE,
  },
  { id: "utr", title: "UTR", accessor: (row) => formatUtr(row.person.utr) },
  {
    id: "trnRank",
    title: "TRN",
    accessor: (row) => formatDisplay(row.person.trnRank),
  },
  { id: "wtn", title: "WTN", accessor: (row) => formatWtn(row.person.wtn) },
];

export const RECRUITING_FOUND_SET_COLUMNS: FoundSetColumn<RecruitDirectoryRow>[] = [
  { id: "name", title: "Name", accessor: (row) => getDisplayName(row.person) },
  {
    id: "hometown",
    title: "Hometown",
    accessor: (row) => recruitListSummaryLine(row) || EMPTY_VALUE,
  },
  {
    id: "recruitClassYear",
    title: "Class",
    accessor: (row) =>
      row.profile.recruitClassYear !== undefined
        ? String(row.profile.recruitClassYear)
        : EMPTY_VALUE,
  },
  {
    id: "pipelineStage",
    title: "Pipeline",
    accessor: (row) => row.profile.pipelineStage?.label ?? EMPTY_VALUE,
  },
  {
    id: "priority",
    title: "Priority",
    accessor: (row) => row.profile.priority?.label ?? EMPTY_VALUE,
  },
  {
    id: "interest",
    title: "Interest",
    accessor: (row) => row.profile.interest?.label ?? EMPTY_VALUE,
  },
  {
    id: "outcome",
    title: "Outcome",
    accessor: (row) => row.profile.outcome?.label ?? EMPTY_VALUE,
  },
  { id: "utr", title: "UTR", accessor: (row) => formatUtr(row.person.utr) },
  {
    id: "trnRank",
    title: "TRN",
    accessor: (row) => formatDisplay(row.person.trnRank),
  },
  { id: "wtn", title: "WTN", accessor: (row) => formatWtn(row.person.wtn) },
];

export type RecruitMetricsColumnId =
  | "name"
  | "recruitClassYear"
  | "utr"
  | "wtn"
  | "trnRank"
  | "utrZ"
  | "wtnZ"
  | "trZ"
  | "compositeZ"
  | "weightedScore"
  | "reliability"
  | "reliabilityScore"
  | "matchesPlayed";

export const RECRUITING_METRICS_TABLE_COLUMNS: ColumnDef<
  RecruitDirectoryRow,
  RecruitMetricsColumnId
>[] = [
  {
    id: "name",
    title: "Recruit",
    sortable: true,
    sortType: "text",
    accessor: nameSortKey,
    defaultSort: "asc",
  },
  {
    id: "recruitClassYear",
    title: "Class",
    sortable: true,
    sortType: "number",
    accessor: (row) => row.profile.recruitClassYear,
    defaultSort: "asc",
  },
  {
    id: "matchesPlayed",
    title: "Matches Played",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.person.utrMatchesPlayed,
    defaultSort: "desc",
  },
  {
    id: "utr",
    title: "UTR",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.person.utr,
    defaultSort: "desc",
  },
  {
    id: "wtn",
    title: "WTN",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.person.wtn,
    defaultSort: "desc",
  },
  {
    id: "trnRank",
    title: "TRN",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.person.trnRank,
    defaultSort: "desc",
  },
  {
    id: "utrZ",
    title: "UTR Z",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.analytics.utrZ,
    defaultSort: "desc",
  },
  {
    id: "wtnZ",
    title: "WTN Z",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.analytics.wtnZ,
    defaultSort: "desc",
  },
  {
    id: "trZ",
    title: "TRN Z",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.analytics.trZ,
    defaultSort: "desc",
  },
  {
    id: "compositeZ",
    title: "Composite Z",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.analytics.compositeZ,
    defaultSort: "desc",
  },
  {
    id: "weightedScore",
    title: "Weighted Score",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.analytics.weightedScore,
    defaultSort: "desc",
  },
  {
    id: "reliability",
    title: "Reliability",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.analytics.reliability,
    defaultSort: "desc",
  },
  {
    id: "reliabilityScore",
    title: "Reliability Score",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.analytics.reliabilityScore,
    defaultSort: "desc",
  },
];

/** 1-based position in the current Metrics sort. Not Coach Rank. */
export function metricsDisplayRank(sortedIndex: number): number {
  return sortedIndex + 1;
}

function formatAnalyticsMetric(value: number | undefined): string {
  if (value === undefined) return EMPTY_VALUE;
  return String(value);
}

/** Same 2-decimal score display as the Recruit Analytics workspace. */
export function formatMetricsScore(value: number | undefined): string {
  if (value === undefined) return EMPTY_VALUE;
  return value.toFixed(2);
}

/** Same percentage display as the Recruit Analytics workspace. */
export function formatMetricsReliability(value: number | undefined): string {
  if (value === undefined) return EMPTY_VALUE;
  return `${Math.round(value * 100)}%`;
}

/** Same integer display as the Recruit Analytics workspace Matches Played field. */
export function formatMetricsMatchesPlayed(value: number | undefined): string {
  if (value === undefined) return EMPTY_VALUE;
  return String(value);
}

export const RECRUITING_METRICS_FOUND_SET_COLUMNS: FoundSetColumn<RecruitDirectoryRow>[] = [
  { id: "name", title: "Name", accessor: (row) => getDisplayName(row.person) },
  {
    id: "hometown",
    title: "Hometown",
    accessor: (row) => recruitListSummaryLine(row) || EMPTY_VALUE,
  },
  {
    id: "recruitClassYear",
    title: "Class",
    accessor: (row) =>
      row.profile.recruitClassYear !== undefined
        ? String(row.profile.recruitClassYear)
        : EMPTY_VALUE,
  },
  {
    id: "matchesPlayed",
    title: "Matches Played",
    accessor: (row) => formatMetricsMatchesPlayed(row.person.utrMatchesPlayed),
  },
  { id: "utr", title: "UTR", accessor: (row) => formatUtr(row.person.utr) },
  { id: "wtn", title: "WTN", accessor: (row) => formatWtn(row.person.wtn) },
  {
    id: "trnRank",
    title: "TRN",
    accessor: (row) => formatDisplay(row.person.trnRank),
  },
  {
    id: "utrZ",
    title: "UTR Z",
    accessor: (row) => formatAnalyticsMetric(row.analytics.utrZ),
  },
  {
    id: "wtnZ",
    title: "WTN Z",
    accessor: (row) => formatAnalyticsMetric(row.analytics.wtnZ),
  },
  {
    id: "trZ",
    title: "TRN Z",
    accessor: (row) => formatAnalyticsMetric(row.analytics.trZ),
  },
  {
    id: "compositeZ",
    title: "Composite Z",
    accessor: (row) => formatAnalyticsMetric(row.analytics.compositeZ),
  },
  {
    id: "weightedScore",
    title: "Weighted Score",
    accessor: (row) => formatMetricsScore(row.analytics.weightedScore),
  },
  {
    id: "reliability",
    title: "Reliability",
    accessor: (row) => formatMetricsReliability(row.analytics.reliability),
  },
  {
    id: "reliabilityScore",
    title: "Reliability Score",
    accessor: (row) => formatMetricsScore(row.analytics.reliabilityScore),
  },
];

export const RECRUITING_FOUND_SET_MODULE_KEY = "recruiting";
export const RECRUITING_FOUND_SET_FILENAME_BASE = "Recruiting";
