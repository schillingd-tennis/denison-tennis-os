/**
 * Recruiting directory columns (BP-045).
 * Mix of Person identity, Recruit Profile classification, and computed analytics.
 */
import type { ColumnDef } from "@/components/data-table/types";
import type { FoundSetColumn } from "@/components/found-set";
import { getDisplayFirstName, getDisplayName } from "@/features/people/utils";
import { EMPTY_VALUE, formatDisplay, formatUtr, formatWtn } from "@/lib/formatting";

import type { RecruitDirectoryRow } from "./directory";

export type RecruitDirectoryColumnId =
  | "name"
  | "recruitClassYear"
  | "recruitType"
  | "pipelineStage"
  | "priority"
  | "utr"
  | "wtn"
  | "tier"
  | "compositeRank"
  | "compositeZ";

function nameSortKey(row: RecruitDirectoryRow): string {
  const last = row.person.lastName?.trim() || "";
  const first = getDisplayFirstName(row.person).trim();
  return `${last}\u0000${first}`;
}

export const RECRUITING_DIRECTORY_TABLE_COLUMNS: ColumnDef<
  RecruitDirectoryRow,
  RecruitDirectoryColumnId
>[] = [
  {
    id: "name",
    title: "Name",
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
    align: "right",
    accessor: (row) => row.profile.recruitClassYear,
    defaultSort: "asc",
  },
  {
    id: "recruitType",
    title: "Type",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.profile.recruitType?.label,
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
    defaultSort: "asc",
  },
  {
    id: "tier",
    title: "Tier",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.analytics.tier,
    defaultSort: "asc",
  },
  {
    id: "compositeRank",
    title: "Comp Rank",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.analytics.compositeRank,
    defaultSort: "asc",
  },
  {
    id: "compositeZ",
    title: "Comp Z",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.analytics.compositeZ,
    defaultSort: "desc",
  },
];

export const RECRUITING_FOUND_SET_COLUMNS: FoundSetColumn<RecruitDirectoryRow>[] = [
  { id: "name", title: "Name", accessor: (row) => getDisplayName(row.person) },
  {
    id: "recruitClassYear",
    title: "Class",
    accessor: (row) => formatDisplay(row.profile.recruitClassYear),
  },
  {
    id: "recruitType",
    title: "Type",
    accessor: (row) => row.profile.recruitType?.label ?? EMPTY_VALUE,
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
  { id: "utr", title: "UTR", accessor: (row) => formatUtr(row.person.utr) },
  { id: "wtn", title: "WTN", accessor: (row) => formatWtn(row.person.wtn) },
  { id: "tier", title: "Tier", accessor: (row) => row.analytics.tier ?? EMPTY_VALUE },
  {
    id: "compositeRank",
    title: "Comp Rank",
    accessor: (row) => formatDisplay(row.analytics.compositeRank),
  },
  {
    id: "compositeZ",
    title: "Comp Z",
    accessor: (row) => formatDisplay(row.analytics.compositeZ),
  },
];

export const RECRUITING_FOUND_SET_MODULE_KEY = "recruiting";
export const RECRUITING_FOUND_SET_FILENAME_BASE = "Recruiting";
