"use client";

import Link from "next/link";
import { useEffect, useMemo, type ReactNode } from "react";

import type { SortState } from "@/components/data-table/types";
import { useSortableData } from "@/components/data-table/useSortableData";
import { publishFoundSet } from "@/components/found-set";
import PlayerAvatar from "@/components/PlayerAvatar";
import ViewChrome, { ViewContextHeader } from "@/components/view-chrome";
import {
  TEAM_DIRECTORY_EMPTY,
  TEAM_DIRECTORY_META,
  TEAM_DIRECTORY_NAME,
} from "@/features/people/directoryHierarchy";
import { getDisplayName, getInitials } from "@/features/people/utils";
import { EMPTY_VALUE, formatUtr } from "@/lib/formatting";

import { availableRecruitClassYears } from "../coachRank/classYear";
import type { RecruitDirectoryRow } from "../directory";
import {
  RECRUITING_DIRECTORY_TABLE_COLUMNS,
  RECRUITING_FOUND_SET_COLUMNS,
  RECRUITING_FOUND_SET_FILENAME_BASE,
  RECRUITING_FOUND_SET_MODULE_KEY,
  recruitListSummaryLine,
  type RecruitDirectoryColumnId,
} from "../directoryColumns";
import { useRecruitDirectoryInlineEdit } from "../useRecruitDirectoryInlineEdit";
import { useRecruitingFoundSetActions } from "../useRecruitingFoundSetActions";
import RecruitStatusBadge from "./RecruitStatusBadge";
import {
  RECRUITING_TABLE,
  RECRUITING_TABLE_AVATAR_SIZE,
  listDirectoryClassContextLabel,
} from "./recruitingTableChrome";
import {
  RecruitingHeaderLabel,
  RecruitingIdentityCell,
  RecruitingSharedDataCells,
  RecruitingTableColgroup,
  RecruitingTableSectionBar,
  classYearSelectOptions,
} from "./RecruitingTableShared";
import { pipelineTone } from "./statusPresentation";

const LIST_SORT_STORAGE_KEY = "denison-tennis-os:recruiting-list-sort";
const columns = RECRUITING_DIRECTORY_TABLE_COLUMNS;
const COLUMN_IDS = columns.map((column) => column.id);
const BOARD = RECRUITING_TABLE;

/** Compact UTR / TRN block — mobile List rows only. */
function MobileListTennisMetrics({
  utr,
  trnRank,
}: {
  utr: number | undefined;
  trnRank: number | undefined;
}) {
  const utrDisplay = formatUtr(utr);
  const trnDisplay = trnRank !== undefined ? `#${trnRank}` : EMPTY_VALUE;
  const utrEmpty = utrDisplay === EMPTY_VALUE;
  const trnEmpty = trnDisplay === EMPTY_VALUE;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-x-3 text-right">
      <div className="min-w-0">
        <p
          className={`text-[15px] leading-none font-semibold tabular-nums ${
            utrEmpty ? "text-text-secondary/45" : "text-[var(--module-accent)]"
          }`}
        >
          {utrDisplay}
        </p>
        <p className="mt-1 text-[9px] font-medium tracking-[0.06em] text-text-secondary uppercase">
          UTR
        </p>
      </div>
      <div className="min-w-0">
        <p
          className={`text-[15px] leading-none font-semibold tabular-nums ${
            trnEmpty ? "text-text-secondary/45" : "text-success"
          }`}
        >
          {trnDisplay}
        </p>
        <p className="mt-1 text-[9px] font-medium tracking-[0.06em] text-text-secondary uppercase">
          TRN
        </p>
      </div>
    </div>
  );
}

/** Map list column ids ↔ shared table sort keys used by header buttons. */
type ListHeaderSortKey = RecruitDirectoryColumnId;

function readStoredSort(): SortState<RecruitDirectoryColumnId> {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LIST_SORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key?: unknown; direction?: unknown } | null;
    if (
      !parsed ||
      typeof parsed.key !== "string" ||
      (parsed.direction !== "asc" && parsed.direction !== "desc") ||
      !COLUMN_IDS.includes(parsed.key as RecruitDirectoryColumnId)
    ) {
      return null;
    }
    return { key: parsed.key as RecruitDirectoryColumnId, direction: parsed.direction };
  } catch {
    return null;
  }
}

function writeStoredSort(sort: SortState<RecruitDirectoryColumnId>) {
  if (typeof window === "undefined") return;
  try {
    if (!sort) window.sessionStorage.removeItem(LIST_SORT_STORAGE_KEY);
    else window.sessionStorage.setItem(LIST_SORT_STORAGE_KEY, JSON.stringify(sort));
  } catch {
    // Private mode / quota.
  }
}

/**
 * Responsive List table shell — mirrors DirectoryTable / RecruitRankSection.
 * Desktop table and mobile list must share one wrapper so ViewChrome
 * does not treat them as separate flex children (avoids blank gap + branch drift).
 */
function RecruitingListTableShell({
  mobile,
  desktop,
}: {
  mobile: ReactNode;
  desktop: ReactNode;
}) {
  return (
    <div className="min-w-0" data-recruiting-list-table="">
      {/*
        Desktop-first: table shell stays mounted/visible at md+ (matches DirectoryTable).
        Avoid `hidden sm:block` — when that responsive class fails to apply, the table
        stays display:none and the mobile `<ul>` becomes the only visible List UI.
      */}
      <section className={`${BOARD.section} max-md:hidden`}>{desktop}</section>
      <div className="md:hidden">{mobile}</div>
    </div>
  );
}

export default function RecruitList({
  rows,
  cohort,
  activeFilterIds,
  onCohortChange,
}: {
  rows: RecruitDirectoryRow[];
  cohort: RecruitDirectoryRow[];
  activeFilterIds: readonly string[];
  onCohortChange: (rows: RecruitDirectoryRow[]) => void;
}) {
  const { sortedItems, sort, toggleSort } = useSortableData(rows, columns, {
    getInitialSort: readStoredSort,
    onSortChange: writeStoredSort,
  });
  const { foundSetFeedback, actionButtons } = useRecruitingFoundSetActions(sortedItems);
  const {
    isEditing,
    startEdit,
    cancelEdit,
    commit,
    fieldError,
    saveStatus,
    saveError,
  } = useRecruitDirectoryInlineEdit({
    cohort,
    onCohortChange,
  });

  const classOptions = useMemo(
    () => classYearSelectOptions(availableRecruitClassYears(cohort)),
    [cohort],
  );

  const edit = { isEditing, fieldError, startEdit, cancelEdit, commit };
  const listContextLabel = listDirectoryClassContextLabel(activeFilterIds);

  useEffect(() => {
    publishFoundSet({
      moduleKey: RECRUITING_FOUND_SET_MODULE_KEY,
      filenameBase: RECRUITING_FOUND_SET_FILENAME_BASE,
      rows: sortedItems,
      columns: RECRUITING_FOUND_SET_COLUMNS,
    });
  }, [sortedItems]);

  function sortDir(key: ListHeaderSortKey) {
    return sort?.key === key ? sort.direction : null;
  }

  return (
    <ViewChrome
      contextHeader={
        <ViewContextHeader
          eyebrow="Directory"
          title="Recruiting Board"
          subtitle={listContextLabel}
        />
      }
      foundSetFeedback={foundSetFeedback}
      saveStatus={saveStatus}
      saveError={saveError}
      actionButtons={actionButtons}
    >
      <RecruitingListTableShell
        mobile={
          <ul className="divide-y divide-border/50">
            {sortedItems.map((row) => {
              const displayName = getDisplayName(row.person);
              return (
                <li key={row.person.id}>
                  <Link
                    href={`/recruiting/${row.person.id}`}
                    className="flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors duration-150 active:bg-app-background"
                  >
                    <PlayerAvatar
                      photoUrl={row.person.photoUrl}
                      initials={getInitials(row.person)}
                      size={RECRUITING_TABLE_AVATAR_SIZE}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`flex min-w-0 items-baseline gap-1.5 ${TEAM_DIRECTORY_NAME}`}>
                        {row.profile.coachRank !== undefined ? (
                          <span className={BOARD.rankMuted}>#{row.profile.coachRank}</span>
                        ) : null}
                        <span className="min-w-0 truncate">{displayName}</span>
                        {row.profile.tier != null ? (
                          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-text-secondary">
                            T{row.profile.tier}
                          </span>
                        ) : null}
                      </p>
                      <p className={`mt-0.5 truncate ${TEAM_DIRECTORY_META}`}>
                        {recruitListSummaryLine(row) || TEAM_DIRECTORY_EMPTY}
                      </p>
                      <div className="mt-1">
                        <RecruitStatusBadge
                          label={row.profile.pipelineStage?.label}
                          tone={pipelineTone(row.profile.pipelineStage?.key)}
                        />
                      </div>
                    </div>
                    <MobileListTennisMetrics
                      utr={row.person.utr}
                      trnRank={row.person.trnRank}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        }
        desktop={
          <>
            <RecruitingTableSectionBar title="Recruits" count={sortedItems.length} />
            <table className={BOARD.table} role="grid" aria-label="Recruiting list">
              <RecruitingTableColgroup />
              <thead>
                <tr>
                  <th scope="col" className={BOARD.th} aria-label="Handle" />
                  <th scope="col" className={BOARD.th} aria-label="Rank" />
                  <RecruitingHeaderLabel
                    label="Recruit"
                    sortDirection={sortDir("name")}
                    onSort={() => toggleSort("name")}
                  />
                  <RecruitingHeaderLabel
                    label="Class"
                    sortDirection={sortDir("recruitClassYear")}
                    onSort={() => toggleSort("recruitClassYear")}
                  />
                  <RecruitingHeaderLabel
                    label="Pipeline"
                    sortDirection={sortDir("pipelineStage")}
                    onSort={() => toggleSort("pipelineStage")}
                  />
                  <RecruitingHeaderLabel
                    label="Priority"
                    sortDirection={sortDir("priority")}
                    onSort={() => toggleSort("priority")}
                  />
                  <RecruitingHeaderLabel
                    label="Tier"
                    sortDirection={sortDir("tier")}
                    onSort={() => toggleSort("tier")}
                  />
                  <RecruitingHeaderLabel
                    label="Interest"
                    sortDirection={sortDir("interest")}
                    onSort={() => toggleSort("interest")}
                  />
                  <RecruitingHeaderLabel
                    label="Outcome"
                    sortDirection={sortDir("outcome")}
                    onSort={() => toggleSort("outcome")}
                  />
                  <RecruitingHeaderLabel
                    label="UTR"
                    align="right"
                    sortDirection={sortDir("utr")}
                    onSort={() => toggleSort("utr")}
                  />
                  <RecruitingHeaderLabel
                    label="TRN"
                    align="right"
                    sortDirection={sortDir("trnRank")}
                    onSort={() => toggleSort("trnRank")}
                  />
                  <RecruitingHeaderLabel
                    label="WTN"
                    align="right"
                    sortDirection={sortDir("wtn")}
                    onSort={() => toggleSort("wtn")}
                  />
                  <th scope="col" className={`${BOARD.th} text-center`} aria-label="Rank action" />
                  <RecruitingHeaderLabel label="Actions" align="center" />
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((row) => (
                  <tr
                    key={row.person.id}
                    className={`${BOARD.rowHover} last:[&>td]:border-b-0`}
                  >
                    <td className={`${BOARD.td} pr-0 pl-1.5`} />
                    <td className={`${BOARD.td} pr-1`} />
                    <td className={BOARD.td}>
                      <RecruitingIdentityCell row={row} listCoachRank />
                    </td>
                    <RecruitingSharedDataCells
                      row={row}
                      classOptions={classOptions}
                      edit={edit}
                      rankAction={null}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        }
      />
    </ViewChrome>
  );
}
