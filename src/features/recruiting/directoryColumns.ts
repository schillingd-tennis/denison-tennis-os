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

export const RECRUITING_FOUND_SET_MODULE_KEY = "recruiting";
export const RECRUITING_FOUND_SET_FILENAME_BASE = "Recruiting";
