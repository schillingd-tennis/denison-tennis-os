/**
 * Rank View Unranked display ordering only.
 * Never assigns or mutates Coach Rank.
 */
import type { SortDirection } from "@/components/data-table/types";
import { getDisplayName } from "@/features/people/utils";

import type { RecruitDirectoryRow } from "./directory";
import {
  RECRUIT_INTEREST_SEED,
  RECRUIT_OUTCOME_SEED,
  RECRUIT_PIPELINE_SEED,
  RECRUIT_PRIORITY_SEED,
} from "./lookupSeed";

export type UnrankedSortKey =
  | "classYear"
  | "pipeline"
  | "priority"
  | "interest"
  | "outcome"
  | "utr"
  | "trn"
  | "wtn";

const PIPELINE_ORDER = new Map(
  RECRUIT_PIPELINE_SEED.map((row) => [row.key, row.sortOrder] as const),
);
const PRIORITY_ORDER = new Map(
  RECRUIT_PRIORITY_SEED.map((row) => [row.key, row.sortOrder] as const),
);
const INTEREST_ORDER = new Map(
  RECRUIT_INTEREST_SEED.map((row) => [row.key, row.sortOrder] as const),
);
const OUTCOME_ORDER = new Map(
  RECRUIT_OUTCOME_SEED.map((row) => [row.key, row.sortOrder] as const),
);

function nameCompare(a: RecruitDirectoryRow, b: RecruitDirectoryRow): number {
  return getDisplayName(a.person).localeCompare(getDisplayName(b.person));
}

function lookupSortValue(
  row: RecruitDirectoryRow,
  field: "pipeline" | "priority" | "interest" | "outcome",
): number | null {
  const lookup =
    field === "pipeline"
      ? row.profile.pipelineStage
      : field === "priority"
        ? row.profile.priority
        : field === "outcome"
          ? row.profile.outcome
          : row.profile.interest;
  if (!lookup) return null;
  const order =
    field === "pipeline"
      ? PIPELINE_ORDER
      : field === "priority"
        ? PRIORITY_ORDER
        : field === "outcome"
          ? OUTCOME_ORDER
          : INTEREST_ORDER;
  return order.get(lookup.key) ?? null;
}

function numericSortValue(
  row: RecruitDirectoryRow,
  field: "utr" | "trn" | "wtn",
): number | null {
  if (field === "utr") {
    return row.person.utr === undefined ? null : row.person.utr;
  }
  if (field === "trn") {
    return row.person.trnRank === undefined ? null : row.person.trnRank;
  }
  return row.person.wtn === undefined ? null : row.person.wtn;
}

export function compareUnrankedRows(
  a: RecruitDirectoryRow,
  b: RecruitDirectoryRow,
  key: UnrankedSortKey,
  direction: SortDirection,
): number {
  const dir = direction === "asc" ? 1 : -1;

  if (key === "classYear") {
    const av = a.profile.recruitClassYear ?? null;
    const bv = b.profile.recruitClassYear ?? null;
    if (av === null && bv === null) return nameCompare(a, b);
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av !== bv) return (av - bv) * dir;
    return nameCompare(a, b);
  }

  if (key === "pipeline" || key === "priority" || key === "interest" || key === "outcome") {
    const av = lookupSortValue(a, key);
    const bv = lookupSortValue(b, key);
    if (av === null && bv === null) return nameCompare(a, b);
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av !== bv) return (av - bv) * dir;
    return nameCompare(a, b);
  }

  const av = numericSortValue(a, key);
  const bv = numericSortValue(b, key);
  // Missing metrics always sort last regardless of direction.
  if (av === null && bv === null) return nameCompare(a, b);
  if (av === null) return 1;
  if (bv === null) return -1;
  if (av !== bv) return (av - bv) * dir;
  return nameCompare(a, b);
}
