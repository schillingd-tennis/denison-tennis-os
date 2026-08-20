"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

import type { SortState } from "@/components/data-table/types";
import { useSortableData } from "@/components/data-table/useSortableData";
import { publishFoundSet } from "@/components/found-set";
import PlayerAvatar from "@/components/PlayerAvatar";
import { StickyProductivityActionBar } from "@/components/productivity";
import ViewChrome, { ViewContextHeader } from "@/components/view-chrome";
import {
  TEAM_DIRECTORY_EMPTY,
  TEAM_DIRECTORY_META,
  TEAM_DIRECTORY_NAME,
} from "@/features/people/directoryHierarchy";
import { getDisplayName, getInitials } from "@/features/people/utils";
import { formatUtr, formatWtn } from "@/lib/formatting";

import type { RecruitDirectoryRow } from "../directory";
import {
  RECRUITING_FOUND_SET_FILENAME_BASE,
  RECRUITING_FOUND_SET_MODULE_KEY,
  RECRUITING_METRICS_FOUND_SET_COLUMNS,
  RECRUITING_METRICS_TABLE_COLUMNS,
  formatMetricsMatchesPlayed,
  formatMetricsReliability,
  formatMetricsScore,
  metricsDisplayRank,
  recruitListSummaryLine,
  type RecruitMetricsColumnId,
} from "../directoryColumns";
import { useRecruitingFoundSetActions } from "../useRecruitingFoundSetActions";
import {
  RECRUITING_METRICS_COLUMN_WIDTHS,
  RECRUITING_METRICS_METRIC,
  RECRUITING_METRICS_TABLE_CLASS,
  RECRUITING_METRICS_TABLE_WIDTH,
  RECRUITING_TABLE,
  RECRUITING_TABLE_AVATAR_SIZE,
} from "./recruitingTableChrome";
import {
  RecruitingHeaderLabel,
  RecruitingIdentityCell,
  RecruitingTableSectionBar,
  recruitingMetricDisplay,
} from "./RecruitingTableShared";

const METRICS_SORT_STORAGE_KEY = "denison-tennis-os:recruiting-metrics-sort";
const columns = RECRUITING_METRICS_TABLE_COLUMNS;
const COLUMN_IDS = columns.map((column) => column.id);
const BOARD = RECRUITING_TABLE;
const WIDTHS = RECRUITING_METRICS_COLUMN_WIDTHS;

function readStoredSort(): SortState<RecruitMetricsColumnId> {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(METRICS_SORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key?: unknown; direction?: unknown } | null;
    if (
      !parsed ||
      typeof parsed.key !== "string" ||
      (parsed.direction !== "asc" && parsed.direction !== "desc") ||
      !COLUMN_IDS.includes(parsed.key as RecruitMetricsColumnId)
    ) {
      return null;
    }
    return { key: parsed.key as RecruitMetricsColumnId, direction: parsed.direction };
  } catch {
    return null;
  }
}

function writeStoredSort(sort: SortState<RecruitMetricsColumnId>) {
  if (typeof window === "undefined") return;
  try {
    if (!sort) window.sessionStorage.removeItem(METRICS_SORT_STORAGE_KEY);
    else window.sessionStorage.setItem(METRICS_SORT_STORAGE_KEY, JSON.stringify(sort));
  } catch {
    // Private mode / quota.
  }
}

function formatAnalyticsMetric(value: number | undefined): string {
  return recruitingMetricDisplay(
    value === undefined ? TEAM_DIRECTORY_EMPTY : String(value),
  );
}

function RecruitingMetricsTableShell({
  mobile,
  desktop,
}: {
  mobile: ReactNode;
  desktop: ReactNode;
}) {
  return (
    <div className="min-w-0" data-recruiting-metrics-table="">
      <section className={`${BOARD.section} max-md:hidden`}>{desktop}</section>
      <div className="md:hidden">{mobile}</div>
    </div>
  );
}

function RecruitingMetricsColgroup() {
  return (
    <colgroup>
      <col style={{ width: WIDTHS.rank }} />
      <col style={{ width: WIDTHS.recruit }} />
      <col style={{ width: WIDTHS.classYear }} />
      <col style={{ width: WIDTHS.matchesPlayed }} />
      <col style={{ width: WIDTHS.utr }} />
      <col style={{ width: WIDTHS.wtn }} />
      <col style={{ width: WIDTHS.trn }} />
      <col style={{ width: WIDTHS.z }} />
      <col style={{ width: WIDTHS.z }} />
      <col style={{ width: WIDTHS.z }} />
      <col style={{ width: WIDTHS.compositeZ }} />
      <col style={{ width: WIDTHS.weightedScore }} />
      <col style={{ width: WIDTHS.reliability }} />
      <col style={{ width: WIDTHS.reliabilityScore }} />
    </colgroup>
  );
}

export default function RecruitMetricsView({
  rows,
}: {
  rows: RecruitDirectoryRow[];
}) {
  const { sortedItems, sort, toggleSort } = useSortableData(rows, columns, {
    getInitialSort: readStoredSort,
    onSortChange: writeStoredSort,
  });
  const { foundSetFeedback, actionButtons } = useRecruitingFoundSetActions(
    sortedItems,
    RECRUITING_METRICS_FOUND_SET_COLUMNS,
  );

  useEffect(() => {
    publishFoundSet({
      moduleKey: RECRUITING_FOUND_SET_MODULE_KEY,
      filenameBase: RECRUITING_FOUND_SET_FILENAME_BASE,
      rows: sortedItems,
      columns: RECRUITING_METRICS_FOUND_SET_COLUMNS,
    });
  }, [sortedItems]);

  function sortDir(key: RecruitMetricsColumnId) {
    return sort?.key === key ? sort.direction : null;
  }

  return (
    <ViewChrome
      contextHeader={
        <ViewContextHeader
          eyebrow="Analytics"
          title="Metrics"
          subtitle="Performance and recruiting analytics"
        />
      }
      foundSetFeedback={foundSetFeedback}
      saveStatus="idle"
      actionButtons={actionButtons}
      mobileActionBar={
        <StickyProductivityActionBar
          className="!py-2 border-black/[0.04] bg-transparent md:hidden"
          leading={
            foundSetFeedback ? (
              <span className="text-xs font-medium text-success" role="status">
                {foundSetFeedback}
              </span>
            ) : null
          }
          actions={actionButtons}
        />
      }
    >
      <RecruitingMetricsTableShell
        mobile={
          <ul className="divide-y divide-border/50">
            {sortedItems.map((row) => {
              const displayName = getDisplayName(row.person);
              const classYear =
                row.profile.recruitClassYear !== undefined
                  ? String(row.profile.recruitClassYear)
                  : TEAM_DIRECTORY_EMPTY;
              return (
                <li key={row.person.id}>
                  <Link
                    href={`/recruiting/${row.person.id}`}
                    className="flex items-center gap-3 px-4 py-4 transition-colors duration-150 active:bg-app-background"
                  >
                    <PlayerAvatar
                      photoUrl={row.person.photoUrl}
                      initials={getInitials(row.person)}
                      size={RECRUITING_TABLE_AVATAR_SIZE}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`min-w-0 truncate ${TEAM_DIRECTORY_NAME}`}>{displayName}</p>
                      <p className={`mt-0.5 ${TEAM_DIRECTORY_META}`}>
                        {recruitListSummaryLine(row) || TEAM_DIRECTORY_EMPTY}
                      </p>
                      <p className={`mt-1 ${TEAM_DIRECTORY_META}`}>
                        {classYear}
                        {" · "}
                        Composite Z {formatAnalyticsMetric(row.analytics.compositeZ)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        }
        desktop={
          <>
            <RecruitingTableSectionBar title="Recruits" count={sortedItems.length} />
            <table
              className={RECRUITING_METRICS_TABLE_CLASS}
              style={{ width: RECRUITING_METRICS_TABLE_WIDTH }}
              role="grid"
              aria-label="Recruiting metrics"
            >
              <RecruitingMetricsColgroup />
              <thead>
                <tr>
                  <RecruitingHeaderLabel label="Rank" align="center" />
                  <RecruitingHeaderLabel
                    label="Recruit"
                    sortDirection={sortDir("name")}
                    onSort={() => toggleSort("name")}
                  />
                  <RecruitingHeaderLabel
                    label="Class"
                    align="center"
                    sortDirection={sortDir("recruitClassYear")}
                    onSort={() => toggleSort("recruitClassYear")}
                  />
                  <RecruitingHeaderLabel
                    label="Matches Played"
                    align="center"
                    sortDirection={sortDir("matchesPlayed")}
                    onSort={() => toggleSort("matchesPlayed")}
                  />
                  <RecruitingHeaderLabel
                    label="UTR"
                    align="center"
                    sortDirection={sortDir("utr")}
                    onSort={() => toggleSort("utr")}
                  />
                  <RecruitingHeaderLabel
                    label="WTN"
                    align="center"
                    sortDirection={sortDir("wtn")}
                    onSort={() => toggleSort("wtn")}
                  />
                  <RecruitingHeaderLabel
                    label="TRN"
                    align="center"
                    sortDirection={sortDir("trnRank")}
                    onSort={() => toggleSort("trnRank")}
                  />
                  <RecruitingHeaderLabel
                    label="UTR Z"
                    align="center"
                    sortDirection={sortDir("utrZ")}
                    onSort={() => toggleSort("utrZ")}
                  />
                  <RecruitingHeaderLabel
                    label="WTN Z"
                    align="center"
                    sortDirection={sortDir("wtnZ")}
                    onSort={() => toggleSort("wtnZ")}
                  />
                  <RecruitingHeaderLabel
                    label="TRN Z"
                    align="center"
                    sortDirection={sortDir("trZ")}
                    onSort={() => toggleSort("trZ")}
                  />
                  <RecruitingHeaderLabel
                    label="Composite Z"
                    align="center"
                    sortDirection={sortDir("compositeZ")}
                    onSort={() => toggleSort("compositeZ")}
                  />
                  <RecruitingHeaderLabel
                    label="Weighted Score"
                    align="center"
                    sortDirection={sortDir("weightedScore")}
                    onSort={() => toggleSort("weightedScore")}
                  />
                  <RecruitingHeaderLabel
                    label="Reliability"
                    align="center"
                    sortDirection={sortDir("reliability")}
                    onSort={() => toggleSort("reliability")}
                  />
                  <RecruitingHeaderLabel
                    label="Reliability Score"
                    align="center"
                    sortDirection={sortDir("reliabilityScore")}
                    onSort={() => toggleSort("reliabilityScore")}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((row, index) => {
                  const utrDisplay = recruitingMetricDisplay(formatUtr(row.person.utr));
                  const wtnDisplay = recruitingMetricDisplay(formatWtn(row.person.wtn));
                  const trnDisplay = recruitingMetricDisplay(
                    row.person.trnRank !== undefined
                      ? String(row.person.trnRank)
                      : TEAM_DIRECTORY_EMPTY,
                  );
                  const classYear =
                    row.profile.recruitClassYear !== undefined
                      ? String(row.profile.recruitClassYear)
                      : TEAM_DIRECTORY_EMPTY;

                  return (
                    <tr
                      key={row.person.id}
                      className={`${BOARD.rowHover} last:[&>td]:border-b-0`}
                    >
                      <td className={`${BOARD.td} text-center`}>
                        <span className={`${BOARD.rankValue} text-center`}>
                          #{metricsDisplayRank(index)}
                        </span>
                      </td>
                      <td className={BOARD.td}>
                        <RecruitingIdentityCell row={row} />
                      </td>
                      <td className={`${BOARD.td} text-center`}>
                        <span className={BOARD.classValue}>{classYear}</span>
                      </td>
                      <td className={`${BOARD.td} ${RECRUITING_METRICS_METRIC}`}>
                        {recruitingMetricDisplay(
                          formatMetricsMatchesPlayed(row.person.utrMatchesPlayed),
                        )}
                      </td>
                      <td className={`${BOARD.td} ${RECRUITING_METRICS_METRIC}`}>{utrDisplay}</td>
                      <td className={`${BOARD.td} ${RECRUITING_METRICS_METRIC}`}>{wtnDisplay}</td>
                      <td className={`${BOARD.td} ${RECRUITING_METRICS_METRIC}`}>{trnDisplay}</td>
                      <td className={`${BOARD.td} ${RECRUITING_METRICS_METRIC}`}>
                        {formatAnalyticsMetric(row.analytics.utrZ)}
                      </td>
                      <td className={`${BOARD.td} ${RECRUITING_METRICS_METRIC}`}>
                        {formatAnalyticsMetric(row.analytics.wtnZ)}
                      </td>
                      <td className={`${BOARD.td} ${RECRUITING_METRICS_METRIC}`}>
                        {formatAnalyticsMetric(row.analytics.trZ)}
                      </td>
                      <td className={`${BOARD.td} ${RECRUITING_METRICS_METRIC}`}>
                        {formatAnalyticsMetric(row.analytics.compositeZ)}
                      </td>
                      <td className={`${BOARD.td} ${RECRUITING_METRICS_METRIC}`}>
                        {recruitingMetricDisplay(formatMetricsScore(row.analytics.weightedScore))}
                      </td>
                      <td className={`${BOARD.td} ${RECRUITING_METRICS_METRIC}`}>
                        {recruitingMetricDisplay(
                          formatMetricsReliability(row.analytics.reliability),
                        )}
                      </td>
                      <td className={`${BOARD.td} ${RECRUITING_METRICS_METRIC}`}>
                        {recruitingMetricDisplay(
                          formatMetricsScore(row.analytics.reliabilityScore),
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        }
      />
    </ViewChrome>
  );
}
