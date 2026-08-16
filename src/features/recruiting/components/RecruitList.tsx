"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { ClipboardList, Download, Mail, MessageSquare, Phone } from "lucide-react";

import DirectoryTable from "@/components/data-table/DirectoryTable";
import {
  DIRECTORY_CELL_CLIP,
  DIRECTORY_CELL_PAD,
  DIRECTORY_COL,
} from "@/components/data-table/directoryColumnWidths";
import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import {
  stickyColumnRowClass,
  stickyLeadingTdClass,
  stickyLeadingThClass,
  stickyTrailingTdClass,
  stickyTrailingThClass,
} from "@/components/data-table/stickyColumns";
import type { SortState } from "@/components/data-table/types";
import { useSortableData } from "@/components/data-table/useSortableData";
import {
  copyFoundSet,
  exportFoundSetCsv,
  publishFoundSet,
} from "@/components/found-set";
import { phoneHrefDigits } from "@/components/inline-edit";
import PlayerAvatar from "@/components/PlayerAvatar";
import { StickyProductivityActionBar } from "@/components/productivity";
import QuickActionButton from "@/components/QuickActionButton";
import { typeRole } from "@/components/typography";
import {
  TEAM_DIRECTORY_EMPTY,
  TEAM_DIRECTORY_META,
  TEAM_DIRECTORY_NAME,
  directoryCellValue,
} from "@/features/people/directoryHierarchy";
import { getDisplayName, getInitials } from "@/features/people/utils";
import { formatUtr, formatWtn } from "@/lib/formatting";

import type { RecruitDirectoryRow } from "../directory";
import {
  RECRUITING_DIRECTORY_TABLE_COLUMNS,
  RECRUITING_FOUND_SET_COLUMNS,
  RECRUITING_FOUND_SET_FILENAME_BASE,
  RECRUITING_FOUND_SET_MODULE_KEY,
  type RecruitDirectoryColumnId,
} from "../directoryColumns";

const LIST_SORT_STORAGE_KEY = "denison-tennis-os:recruiting-list-sort";
const TABLE_MIN_WIDTH_PX = 1480;
const columns = RECRUITING_DIRECTORY_TABLE_COLUMNS;
const COLUMN_IDS = columns.map((column) => column.id);

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

function contactHrefs(row: RecruitDirectoryRow) {
  const digits = phoneHrefDigits(row.person.cellPhone);
  const email = row.person.personalEmail ?? row.person.denisonEmail;
  return {
    tel: digits ? `tel:${digits}` : undefined,
    sms: digits ? `sms:${digits}` : undefined,
    mailto: email ? `mailto:${email}` : undefined,
  };
}

export default function RecruitList({ rows }: { rows: RecruitDirectoryRow[] }) {
  const router = useRouter();
  const { sortedItems, sort, toggleSort } = useSortableData(rows, columns, {
    getInitialSort: readStoredSort,
    onSortChange: writeStoredSort,
  });
  const [foundSetFeedback, setFoundSetFeedback] = useState<string | undefined>(undefined);

  useEffect(() => {
    publishFoundSet({
      moduleKey: RECRUITING_FOUND_SET_MODULE_KEY,
      filenameBase: RECRUITING_FOUND_SET_FILENAME_BASE,
      rows: sortedItems,
      columns: RECRUITING_FOUND_SET_COLUMNS,
    });
  }, [sortedItems]);

  const handleCopyFoundSet = useCallback(async () => {
    if (sortedItems.length === 0) return;
    try {
      await copyFoundSet(sortedItems, RECRUITING_FOUND_SET_COLUMNS);
      setFoundSetFeedback("Found set copied");
      window.setTimeout(() => setFoundSetFeedback(undefined), 2000);
    } catch {
      setFoundSetFeedback("Copy failed");
      window.setTimeout(() => setFoundSetFeedback(undefined), 2000);
    }
  }, [sortedItems]);

  const handleExportFoundSet = useCallback(() => {
    if (sortedItems.length === 0) return;
    exportFoundSetCsv({
      rows: sortedItems,
      columns: RECRUITING_FOUND_SET_COLUMNS,
      filenameBase: RECRUITING_FOUND_SET_FILENAME_BASE,
    });
  }, [sortedItems]);

  function stopRowNavigation(event: MouseEvent) {
    event.stopPropagation();
  }

  const cellPad = DIRECTORY_CELL_PAD;
  const middleCell = `${DIRECTORY_CELL_PAD} ${DIRECTORY_CELL_CLIP}`;

  return (
    <div className="flex flex-col gap-2">
      <StickyProductivityActionBar
        leading={
          <>
            {foundSetFeedback ? (
              <span className="text-xs font-medium text-success" role="status">
                {foundSetFeedback}
              </span>
            ) : null}
            <span className="text-xs tabular-nums text-text-secondary">
              {sortedItems.length} in found set
            </span>
          </>
        }
        actions={
          <>
            <QuickActionButton
              onAction={sortedItems.length > 0 ? handleCopyFoundSet : undefined}
              icon={ClipboardList}
              label="Copy Found Set"
              tone="neutral"
              unavailableTitle="No records in found set"
            />
            <QuickActionButton
              onAction={sortedItems.length > 0 ? handleExportFoundSet : undefined}
              icon={Download}
              label="Export Found Set"
              tone="neutral"
              unavailableTitle="No records in found set"
            />
          </>
        }
      />

      <DirectoryTable
        mobile={
          <ul className="divide-y divide-border/50">
            {sortedItems.map((row) => {
              const displayName = getDisplayName(row.person);
              const detail = [
                row.profile.recruitClassYear ? `Class of ${row.profile.recruitClassYear}` : null,
                row.profile.pipelineStage?.label,
                row.analytics.tier,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={row.person.id}>
                  <Link
                    href={`/recruiting/${row.person.id}`}
                    className="flex items-center gap-3 px-4 py-4 transition-colors duration-150 active:bg-app-background"
                  >
                    <PlayerAvatar
                      photoUrl={row.person.photoUrl}
                      initials={getInitials(row.person)}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={TEAM_DIRECTORY_NAME}>{displayName}</p>
                      <p className={`mt-0.5 ${TEAM_DIRECTORY_META}`}>
                        {detail || TEAM_DIRECTORY_EMPTY}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        }
      >
        <table
          className="w-full table-fixed text-left text-sm"
          style={{ minWidth: TABLE_MIN_WIDTH_PX }}
          role="grid"
          aria-label="Recruiting list"
        >
          <colgroup>
            <col className={DIRECTORY_COL.name} />
            <col />
            <col />
            <col />
            <col />
            <col />
            <col />
            <col />
            <col />
            <col />
            <col className={DIRECTORY_COL.actions} />
          </colgroup>
          <thead>
            <tr className={`border-b border-border bg-app-background/60 ${typeRole.tableHeader}`}>
              {columns.map((column) => (
                <SortableColumnHeader
                  key={column.id}
                  label={column.title}
                  align={column.align}
                  sortDirection={sort?.key === column.id ? sort.direction : null}
                  onSort={() => toggleSort(column.id)}
                  className={
                    column.id === "name"
                      ? stickyLeadingThClass
                      : "whitespace-nowrap align-middle"
                  }
                />
              ))}
              <th
                scope="col"
                className={`px-3 py-3 text-right align-middle ${typeRole.tableHeader} ${stickyTrailingThClass}`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((row) => {
              const displayName = getDisplayName(row.person);
              const hrefs = contactHrefs(row);
              return (
                <tr
                  key={row.person.id}
                  onClick={() => router.push(`/recruiting/${row.person.id}`)}
                  className={`${stickyColumnRowClass} h-12 cursor-pointer border-b border-border/40 transition-colors duration-150 last:border-b-0 hover:bg-app-background`}
                >
                  <td className={`${cellPad} ${stickyLeadingTdClass}`}>
                    <div className="flex h-8 min-w-0 items-center gap-2">
                      <PlayerAvatar
                        photoUrl={row.person.photoUrl}
                        initials={getInitials(row.person)}
                        size={32}
                      />
                      <span className={`min-w-0 truncate ${TEAM_DIRECTORY_NAME}`}>
                        {displayName}
                      </span>
                    </div>
                  </td>
                  <td className={`${middleCell} text-right`}>
                    <span className={TEAM_DIRECTORY_META}>
                      {directoryCellValue(row.profile.recruitClassYear)}
                    </span>
                  </td>
                  <td className={middleCell}>
                    <span className={TEAM_DIRECTORY_META}>
                      {directoryCellValue(row.profile.recruitType?.label)}
                    </span>
                  </td>
                  <td className={middleCell}>
                    <span className={TEAM_DIRECTORY_META}>
                      {directoryCellValue(row.profile.pipelineStage?.label)}
                    </span>
                  </td>
                  <td className={middleCell}>
                    <span className={TEAM_DIRECTORY_META}>
                      {directoryCellValue(row.profile.priority?.label)}
                    </span>
                  </td>
                  <td className={`${middleCell} text-right`}>
                    <span className={TEAM_DIRECTORY_META}>{formatUtr(row.person.utr)}</span>
                  </td>
                  <td className={`${middleCell} text-right`}>
                    <span className={TEAM_DIRECTORY_META}>{formatWtn(row.person.wtn)}</span>
                  </td>
                  <td className={middleCell}>
                    <span className={TEAM_DIRECTORY_META}>
                      {directoryCellValue(row.analytics.tier)}
                    </span>
                  </td>
                  <td className={`${middleCell} text-right`}>
                    <span className={TEAM_DIRECTORY_META}>
                      {directoryCellValue(row.analytics.compositeRank)}
                    </span>
                  </td>
                  <td className={`${middleCell} text-right`}>
                    <span className={TEAM_DIRECTORY_META}>
                      {directoryCellValue(row.analytics.compositeZ)}
                    </span>
                  </td>
                  <td
                    className={`${cellPad} text-right ${stickyTrailingTdClass}`}
                    onClick={stopRowNavigation}
                    onMouseDown={stopRowNavigation}
                  >
                    <div className="inline-flex h-10 shrink-0 items-center justify-end gap-1">
                      {hrefs.tel ? (
                        <QuickActionButton href={hrefs.tel} icon={Phone} label="Call" tone="success" />
                      ) : null}
                      {hrefs.sms ? (
                        <QuickActionButton href={hrefs.sms} icon={MessageSquare} label="Text" tone="denison" />
                      ) : null}
                      {hrefs.mailto ? (
                        <QuickActionButton href={hrefs.mailto} icon={Mail} label="Email" tone="info" />
                      ) : null}
                      {!hrefs.tel && !hrefs.sms && !hrefs.mailto ? (
                        <span className={TEAM_DIRECTORY_META}>{TEAM_DIRECTORY_EMPTY}</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DirectoryTable>
    </div>
  );
}
