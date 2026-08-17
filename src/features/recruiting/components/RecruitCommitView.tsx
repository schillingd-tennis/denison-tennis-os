"use client";

import { useEffect, useMemo } from "react";

import type { SortState } from "@/components/data-table/types";
import { useSortableData } from "@/components/data-table/useSortableData";
import EmptyState from "@/components/EmptyState";
import { publishFoundSet } from "@/components/found-set";

import { availableRecruitClassYears } from "../coachRank/classYear";
import { filterCommitDirectoryRows } from "../commitView";
import type { RecruitDirectoryRow } from "../directory";
import {
  RECRUITING_COMMIT_FOUND_SET_COLUMNS,
  RECRUITING_COMMIT_TABLE_COLUMNS,
  RECRUITING_FOUND_SET_FILENAME_BASE,
  RECRUITING_FOUND_SET_MODULE_KEY,
  type RecruitCommitColumnId,
} from "../directoryColumns";
import { useRecruitDirectoryInlineEdit } from "../useRecruitDirectoryInlineEdit";
import { useRecruitingFoundSetActions } from "../useRecruitingFoundSetActions";
import {
  commitBoardClassContextLabel,
  commitViewCountMeta,
  RECRUITING_TABLE,
} from "./recruitingTableChrome";
import {
  RecruitingCommitDataCells,
  RecruitingHeaderLabel,
  RecruitingIdentityCell,
  RecruitingTableColgroup,
  RecruitingTableSectionBar,
  classYearSelectOptions,
} from "./RecruitingTableShared";
import RecruitingViewChrome, { RecruitingViewContextMeta } from "./RecruitingViewChrome";
import RecruitingViewContextHeader from "./RecruitingViewContextHeader";

const COMMIT_SORT_STORAGE_KEY = "denison-tennis-os:recruiting-commit-sort";
const columns = RECRUITING_COMMIT_TABLE_COLUMNS;
const COLUMN_IDS = columns.map((column) => column.id);
const BOARD = RECRUITING_TABLE;

function readStoredSort(): SortState<RecruitCommitColumnId> {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(COMMIT_SORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key?: unknown; direction?: unknown } | null;
    if (
      !parsed ||
      typeof parsed.key !== "string" ||
      (parsed.direction !== "asc" && parsed.direction !== "desc") ||
      !COLUMN_IDS.includes(parsed.key as RecruitCommitColumnId)
    ) {
      return null;
    }
    return { key: parsed.key as RecruitCommitColumnId, direction: parsed.direction };
  } catch {
    return null;
  }
}

function writeStoredSort(sort: SortState<RecruitCommitColumnId>) {
  if (typeof window === "undefined") return;
  try {
    if (!sort) window.sessionStorage.removeItem(COMMIT_SORT_STORAGE_KEY);
    else window.sessionStorage.setItem(COMMIT_SORT_STORAGE_KEY, JSON.stringify(sort));
  } catch {
    // Private mode / quota.
  }
}

export default function RecruitCommitView({
  filteredRows,
  cohort,
  activeFilterIds,
  onCohortChange,
}: {
  filteredRows: RecruitDirectoryRow[];
  cohort: RecruitDirectoryRow[];
  activeFilterIds: readonly string[];
  onCohortChange: (rows: RecruitDirectoryRow[]) => void;
}) {
  const commitRows = useMemo(
    () => filterCommitDirectoryRows(filteredRows),
    [filteredRows],
  );
  const { sortedItems, sort, toggleSort } = useSortableData(commitRows, columns, {
    getInitialSort: readStoredSort,
    onSortChange: writeStoredSort,
  });
  const { foundSetFeedback, actionButtons } = useRecruitingFoundSetActions(
    sortedItems,
    RECRUITING_COMMIT_FOUND_SET_COLUMNS,
    `${RECRUITING_FOUND_SET_FILENAME_BASE}-Commits`,
  );
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
  const contextLabel = commitBoardClassContextLabel(activeFilterIds);

  useEffect(() => {
    publishFoundSet({
      moduleKey: RECRUITING_FOUND_SET_MODULE_KEY,
      filenameBase: `${RECRUITING_FOUND_SET_FILENAME_BASE}-Commits`,
      rows: sortedItems,
      columns: RECRUITING_COMMIT_FOUND_SET_COLUMNS,
    });
  }, [sortedItems]);

  function sortDir(key: RecruitCommitColumnId) {
    return sort?.key === key ? sort.direction : null;
  }

  return (
    <RecruitingViewChrome
      contextHeader={
        <RecruitingViewContextHeader
          eyebrow="Commitments"
          title="Commit Board"
          subtitle={contextLabel}
        />
      }
      contextMeta={
        <RecruitingViewContextMeta>
          {commitViewCountMeta(sortedItems.length)}
        </RecruitingViewContextMeta>
      }
      foundSetFeedback={foundSetFeedback}
      saveStatus={saveStatus}
      saveError={saveError}
      actionButtons={actionButtons}
    >
      {sortedItems.length === 0 ? (
        <EmptyState
          title="No committed recruits match this view."
          description="Try a different search term or filter."
        />
      ) : (
        <section className={BOARD.section} data-recruiting-commit-table="">
          <RecruitingTableSectionBar title="Commits" count={sortedItems.length} />
          <table className={BOARD.table} role="grid" aria-label="Recruiting commits">
            <RecruitingTableColgroup variant="commit" />
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
                  label="Outcome"
                  sortDirection={sortDir("outcome")}
                  onSort={() => toggleSort("outcome")}
                />
                <RecruitingHeaderLabel
                  label="School Chosen"
                  sortDirection={sortDir("schoolChosen")}
                  onSort={() => toggleSort("schoolChosen")}
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
                    <RecruitingIdentityCell row={row} />
                  </td>
                  <RecruitingCommitDataCells
                    row={row}
                    classOptions={classOptions}
                    edit={edit}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </RecruitingViewChrome>
  );
}
