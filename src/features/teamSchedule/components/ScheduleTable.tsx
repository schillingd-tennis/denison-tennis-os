"use client";

import { Home, MapPin, MoreHorizontal, Plane } from "lucide-react";
import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";

import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import type { SortState } from "@/components/data-table/types";
import { useSortableData } from "@/components/data-table/useSortableData";
import ViewChrome, { ViewContextHeader } from "@/components/view-chrome";
import { RECRUITING_TABLE } from "@/features/recruiting/components/recruitingTableChrome";

import {
  formatCompDateNumber,
  formatItaRank,
  formatScheduleDateDisplay,
  locationLine,
  sharedDateOrDhLabel,
  statusBadgeClass,
  truncateNotes,
  typeBadgeForEvent,
} from "../display";
import { SCHEDULE_TABLE_COLUMNS, type ScheduleTableColumnId } from "../scheduleTableColumns";
import { sortScheduleEvents } from "../sorting";
import { SCHEDULE_STATUS_LABELS, SITE_DESIGNATION_LABELS, displayOpponentOrEvent, type TeamScheduleEvent } from "../types";
import ScheduleOpponentCell from "./ScheduleOpponentCell";
import { ScheduleTableSectionBar } from "./scheduleTableChrome";

const SORT_STORAGE_KEY = "denison-tennis-os:team-schedule-sort";
const SORTABLE_COLUMNS = new Set<ScheduleTableColumnId>([
  "startDate",
  "opponent",
  "itaRank",
  "site",
  "status",
  "ncac",
]);

function readStoredSort(): SortState<ScheduleTableColumnId> {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key?: unknown; direction?: unknown } | null;
    if (
      !parsed ||
      typeof parsed.key !== "string" ||
      (parsed.direction !== "asc" && parsed.direction !== "desc") ||
      !SORTABLE_COLUMNS.has(parsed.key as ScheduleTableColumnId)
    ) {
      return null;
    }
    return { key: parsed.key as ScheduleTableColumnId, direction: parsed.direction };
  } catch {
    return null;
  }
}

function writeStoredSort(sort: SortState<ScheduleTableColumnId>) {
  try {
    if (!sort) window.sessionStorage.removeItem(SORT_STORAGE_KEY);
    else window.sessionStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
  } catch {
    // Private mode / quota.
  }
}

function stopRowNavigation(event: MouseEvent) {
  event.stopPropagation();
}

function handleRowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  scheduleEvent: TeamScheduleEvent,
  onEdit: (event: TeamScheduleEvent) => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onEdit(scheduleEvent);
  }
}

function SiteCell({ event }: { event: TeamScheduleEvent }) {
  const Icon =
    event.siteDesignation === "home" ? Home : event.siteDesignation === "away" ? Plane : MapPin;
  return (
    <div className="min-w-[5.5rem]">
      <p className="flex items-center gap-1 text-xs font-medium text-text-primary">
        <Icon className="h-3 w-3 shrink-0 text-text-secondary" aria-hidden />
        {SITE_DESIGNATION_LABELS[event.siteDesignation]}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-text-secondary">{locationLine(event)}</p>
    </div>
  );
}

function DateCell({ event }: { event: TeamScheduleEvent }) {
  const display = formatScheduleDateDisplay(event.startDate, event.endDate);
  return (
    <div className="flex min-w-[3.5rem] items-start gap-2">
      <div className="text-center leading-none">
        <p className="text-[10px] font-semibold tracking-wide text-text-secondary">{display.month}</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">{display.day}</p>
        <p className="mt-0.5 text-[9px] font-medium text-text-secondary">{display.weekday}</p>
      </div>
    </div>
  );
}

export default function ScheduleTable({
  events,
  allEvents,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  events: TeamScheduleEvent[];
  allEvents: TeamScheduleEvent[];
  onEdit: (event: TeamScheduleEvent) => void;
  onDuplicate: (event: TeamScheduleEvent) => void;
  onDelete: (event: TeamScheduleEvent) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const defaultOrdered = useMemo(() => sortScheduleEvents(events), [events]);
  const { sortedItems, sort, toggleSort } = useSortableData(defaultOrdered, SCHEDULE_TABLE_COLUMNS, {
    getInitialSort: readStoredSort,
    onSortChange: writeStoredSort,
  });

  function sortDirection(columnId: ScheduleTableColumnId) {
    return sort?.key === columnId ? sort.direction : null;
  }

  return (
    <ViewChrome
      contextHeader={
        <ViewContextHeader
          eyebrow="Schedule"
          title="Matches"
          subtitle="Competition schedule for the selected season"
        />
      }
      saveStatus="idle"
      actionButtons={null}
    >
      <ScheduleTableSectionBar title="Matches" count={sortedItems.length} />

      <div className="overflow-x-auto rounded-card border border-border/80 bg-surface">
        <table className="min-w-[1100px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border/70 bg-background/40">
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Date #
              </th>
              <SortableColumnHeader
                label="Date"
                sortDirection={sortDirection("startDate")}
                onSort={() => toggleSort("startDate")}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
              />
              <SortableColumnHeader
                label="Opponent / Event"
                sortDirection={sortDirection("opponent")}
                onSort={() => toggleSort("opponent")}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
              />
              <SortableColumnHeader
                label="ITA Rank"
                sortDirection={sortDirection("itaRank")}
                onSort={() => toggleSort("itaRank")}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
              />
              <SortableColumnHeader
                label="Site"
                sortDirection={sortDirection("site")}
                onSort={() => toggleSort("site")}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
              />
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Time
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Type
              </th>
              <SortableColumnHeader
                label="Status"
                sortDirection={sortDirection("status")}
                onSort={() => toggleSort("status")}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
              />
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                DH
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Officials
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Notes
              </th>
              <th className="px-3 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((event) => {
              const compDate = formatCompDateNumber(event);
              const typeBadge = typeBadgeForEvent(event);
              const dhLabel = sharedDateOrDhLabel(event, allEvents);
              const groupSize =
                event.competitionDateGroup != null
                  ? allEvents.filter((e) => e.competitionDateGroup === event.competitionDateGroup).length
                  : 0;
              const grouped = groupSize > 1;
              const rowLabel = displayOpponentOrEvent(event);

              return (
                <tr
                  key={event.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Edit ${rowLabel}`}
                  onClick={() => onEdit(event)}
                  onKeyDown={(keyboardEvent) => handleRowKeyDown(keyboardEvent, event, onEdit)}
                  className={`cursor-pointer ${RECRUITING_TABLE.rowHover} border-b border-border/40 last:border-0 ${grouped ? "bg-background/30" : ""}`}
                >
                  <td className="px-3 py-2 align-top text-xs tabular-nums text-text-secondary">
                    {compDate ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <DateCell event={event} />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <ScheduleOpponentCell event={event} />
                  </td>
                  <td className="px-3 py-2 align-top text-xs tabular-nums text-text-primary">
                    {formatItaRank(event.itaRank)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <SiteCell event={event} />
                  </td>
                  <td className="px-3 py-2 align-top text-xs whitespace-nowrap text-text-primary">
                    {event.timeText ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeBadge.className}`}>
                      {typeBadge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(event.status)}`}>
                      {SCHEDULE_STATUS_LABELS[event.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {dhLabel ? (
                      <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        {dhLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-xs tabular-nums text-text-primary">
                    {event.officialsNeeded ?? "—"}
                  </td>
                  <td className="max-w-[12rem] px-3 py-2 align-top text-[11px] text-text-secondary" title={event.notes ?? undefined}>
                    {truncateNotes(event.notes)}
                  </td>
                  <td className="relative px-2 py-2 align-top">
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-control text-text-secondary hover:bg-background"
                      aria-label="Row actions"
                      onClick={(clickEvent) => {
                        stopRowNavigation(clickEvent);
                        setOpenMenuId((current) => (current === event.id ? null : event.id));
                      }}
                      onMouseDown={stopRowNavigation}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {openMenuId === event.id ? (
                      <div
                        className="absolute right-2 top-8 z-20 min-w-[8rem] rounded-control border border-border bg-surface py-1 shadow-md"
                        onClick={stopRowNavigation}
                        onMouseDown={stopRowNavigation}
                      >
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left text-xs hover:bg-background"
                          onClick={() => {
                            setOpenMenuId(null);
                            onEdit(event);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left text-xs hover:bg-background"
                          onClick={() => {
                            setOpenMenuId(null);
                            onDuplicate(event);
                          }}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left text-xs text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setOpenMenuId(null);
                            onDelete(event);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ViewChrome>
  );
}
