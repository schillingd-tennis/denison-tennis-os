"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import type { SortState } from "@/components/data-table/types";
import { useSortableData } from "@/components/data-table/useSortableData";
import PlayerAvatar from "@/components/PlayerAvatar";
import { EMPTY_VALUE, formatDate } from "@/lib/formatting";
import { recruitingTournamentPath } from "@/lib/module-routes";

import { defaultSortedTournaments, isPastTournament, parseDistanceMiles, splitCityState } from "../location";
import { TOURNAMENT_TABLE_COLUMNS, type TournamentTableColumnId } from "../tableColumns";
import type { Tournament } from "../types";
import { deleteTournamentAction, setTournamentPlanToAttendAction } from "../actions";

const SORT_STORAGE_KEY = "denison-tennis-os:tournaments-list-sort";
const COLUMN_IDS = TOURNAMENT_TABLE_COLUMNS.map((column) => column.id);

function readStoredSort(): SortState<TournamentTableColumnId> {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key?: unknown; direction?: unknown } | null;
    if (
      !parsed ||
      typeof parsed.key !== "string" ||
      (parsed.direction !== "asc" && parsed.direction !== "desc") ||
      !COLUMN_IDS.includes(parsed.key as TournamentTableColumnId)
    ) {
      return null;
    }
    return { key: parsed.key as TournamentTableColumnId, direction: parsed.direction };
  } catch {
    return null;
  }
}

function writeStoredSort(sort: SortState<TournamentTableColumnId>) {
  try {
    if (!sort) window.sessionStorage.removeItem(SORT_STORAGE_KEY);
    else window.sessionStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
  } catch {
    // Private mode / quota.
  }
}

function display(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY_VALUE;
}

export default function TournamentList({
  tournaments,
  onTournamentUpdated,
  onTournamentDeleted,
  onEditTournament,
}: {
  tournaments: Tournament[];
  onTournamentUpdated: (tournament: Tournament) => void;
  onTournamentDeleted: (id: string) => void;
  onEditTournament: (tournament: Tournament) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const defaultOrdered = useMemo(() => defaultSortedTournaments(tournaments), [tournaments]);
  const { sortedItems, sort, toggleSort } = useSortableData(defaultOrdered, TOURNAMENT_TABLE_COLUMNS, {
    getInitialSort: readStoredSort,
    onSortChange: writeStoredSort,
  });

  function sortDirection(columnId: TournamentTableColumnId) {
    return sort?.key === columnId ? sort.direction : null;
  }

  function setPlanToAttend(row: Tournament, checked: boolean) {
    setPendingId(row.id);
    setMessage(null);
    startTransition(async () => {
      const result = await setTournamentPlanToAttendAction(row.id, checked);
      setPendingId(null);
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      onTournamentUpdated(result.tournament);
    });
  }

  function deleteRow(row: Tournament) {
    if (!window.confirm(`Delete ${row.name}? This cannot be undone.`)) return;
    setPendingId(row.id);
    setMessage(null);
    startTransition(async () => {
      const result = await deleteTournamentAction(row.id);
      setPendingId(null);
      if (!result.success) return setMessage(result.error);
      onTournamentDeleted(row.id);
    });
  }

  return (
    <div className="overflow-hidden rounded-card border border-[var(--module-border)] bg-surface">
      {message ? <p role="alert" className="border-b border-danger/20 bg-danger/5 px-4 py-2 text-sm text-danger">{message}</p> : null}
      <div className="overflow-x-auto">
      <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
        <thead className="border-b border-border bg-app-background/80">
          <tr>
            {TOURNAMENT_TABLE_COLUMNS.map((column) => (
              <SortableColumnHeader
                key={column.id}
                label={column.title}
                align={column.align}
                sortDirection={sortDirection(column.id)}
                onSort={() => toggleSort(column.id)}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((row) => {
            const extra = Math.max(row.linkedRecruits.length - 3, 0);
            const { city, state } = splitCityState(row.location);
            const miles = parseDistanceMiles(row.distanceFromColumbus);
            return (
              <tr key={row.id} className={`border-b border-border last:border-0 ${row.recruitingPlan === "traveling" ? "bg-denison-red/[0.055] hover:bg-denison-red/[0.09]" : "hover:bg-app-background/70"}`}>
                <td className="sticky left-0 z-[1] min-w-[15rem] bg-inherit px-4 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={recruitingTournamentPath(row.id)}
                      className={`block min-w-0 truncate font-medium hover:underline ${row.recruitingPlan === "traveling" ? "font-semibold text-denison-red" : "text-text-primary hover:text-[var(--module-accent)]"}`}
                    >
                      {row.name}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => onEditTournament(row)} className="inline-flex h-7 items-center gap-1 rounded-control border border-border bg-surface px-2 text-[11px] font-semibold text-text-primary shadow-sm hover:border-[var(--module-accent)] hover:bg-app-background" aria-label={`Edit all fields for ${row.name}`}><Pencil className="h-3 w-3" /> Edit fields</button>
                      <button type="button" disabled={pending && pendingId === row.id} onClick={() => deleteRow(row)} className="inline-flex h-7 items-center gap-1 rounded-control border border-danger/25 bg-surface px-2 text-[11px] font-semibold text-danger shadow-sm hover:bg-danger/5 disabled:opacity-40" aria-label={`Delete ${row.name}`}><Trash2 className="h-3 w-3" /> Delete</button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-text-primary">
                  {row.startDate ? formatDate(row.startDate) : EMPTY_VALUE}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-text-primary">
                  {row.endDate ? formatDate(row.endDate) : EMPTY_VALUE}
                </td>
                <td className="px-4 py-2.5 text-text-primary">{display(city)}</td>
                <td className="px-4 py-2.5 text-text-primary">{display(state)}</td>
                <td className="px-4 py-2.5 text-text-primary">{display(row.level)}</td>
                <td className="px-4 py-2.5 text-text-primary">
                  {isPastTournament(row)
                    ? "Past"
                    : "Upcoming"}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <input
                    type="checkbox"
                    aria-label={`Plan to attend ${row.name}`}
                    checked={row.recruitingPlan === "traveling"}
                    disabled={pending && pendingId === row.id}
                    onChange={(event) => setPlanToAttend(row, event.target.checked)}
                    className="h-4 w-4 rounded border-border accent-denison-red disabled:opacity-50"
                  />
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-text-primary">
                  {miles == null ? EMPTY_VALUE : miles}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end">
                    {row.linkedRecruits.slice(0, 3).map((recruit, index) => (
                      <span key={recruit.personId} className={index === 0 ? "" : "-ml-1.5"}>
                        <PlayerAvatar photoUrl={recruit.photoUrl} initials={recruit.initials} size={24} />
                      </span>
                    ))}
                    {extra > 0 ? (
                      <span className="ml-1.5 text-[11px] font-semibold text-text-secondary">+{extra}</span>
                    ) : row.linkedRecruits.length === 0 ? (
                      <span className="text-text-secondary tabular-nums">0</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
