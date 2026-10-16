"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import type { SortState } from "@/components/data-table/types";
import { useSortableData } from "@/components/data-table/useSortableData";
import InlineEditCell from "@/components/inline-edit/InlineEditCell";
import PlayerAvatar from "@/components/PlayerAvatar";
import { EMPTY_VALUE, formatDate } from "@/lib/formatting";
import { recruitingTournamentPath } from "@/lib/module-routes";

import { locationFromCityState, tournamentToInput } from "../editor";
import { defaultSortedTournaments, parseDistanceMiles, splitCityState } from "../location";
import { TOURNAMENT_TABLE_COLUMNS, type TournamentTableColumnId } from "../tableColumns";
import type { Tournament } from "../types";
import { deleteTournamentAction, saveTournamentAction, setTournamentPlanToAttendAction } from "../actions";

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

type InlineField = "startDate" | "endDate" | "city" | "state" | "level";

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
  const [editing, setEditing] = useState<{ id: string; field: InlineField } | null>(null);
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

  async function commitField(row: Tournament, field: InlineField, raw: string) {
    const input = tournamentToInput(row);
    const trimmed = raw.trim();
    if (field === "city" || field === "state") {
      const current = splitCityState(row.location);
      input.location = locationFromCityState(field === "city" ? trimmed : current.city ?? "", field === "state" ? trimmed : current.state ?? "");
    } else {
      input[field] = trimmed || null;
    }
    setPendingId(row.id);
    setMessage(null);
    const result = await saveTournamentAction(row.id, input);
    setPendingId(null);
    if (!result.success) {
      setMessage(result.error);
      return;
    }
    onTournamentUpdated(result.tournament);
    setEditing(null);
  }

  function inlineCell(row: Tournament, field: InlineField, value: string, options?: { type?: "text" | "date" | "select"; displayValue?: string; selectOptions?: { value: string; label: string }[] }) {
    return <InlineEditCell label={field === "startDate" ? "Start date" : field === "endDate" ? "End date" : field[0].toUpperCase() + field.slice(1)} value={value} displayValue={options?.displayValue} type={options?.type ?? "text"} options={options?.selectOptions} editOn="click" density="compact" emphasis="directory" editing={editing?.id === row.id && editing.field === field} disabled={pending && pendingId === row.id} onRequestEdit={() => setEditing({ id: row.id, field })} onCancel={() => setEditing(null)} onCommit={(next) => commitField(row, field, next)} />;
  }

  return (
    <div className="overflow-hidden rounded-card border border-[var(--module-border)] bg-surface">
      {message ? <p role="alert" className="border-b border-danger/20 bg-danger/5 px-4 py-2 text-sm text-danger">{message}</p> : null}
      <div className="overflow-hidden">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className="w-[27%]" />
          <col className="w-[9%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[6%]" />
          <col className="w-[9%]" />
          <col className="w-[9%]" />
          <col className="w-[7%]" />
          <col className="w-[8%]" />
          <col className="w-[6%]" />
        </colgroup>
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
            <th scope="col" className="px-2 py-3 text-right text-xs font-semibold tracking-wide text-text-secondary uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((row) => {
            const extra = Math.max(row.linkedRecruits.length - 3, 0);
            const { city, state } = splitCityState(row.location);
            const miles = parseDistanceMiles(row.distanceFromColumbus);
            return (
              <tr key={row.id} className={`border-b border-border last:border-0 ${row.recruitingPlan === "traveling" ? "bg-denison-red/[0.055] hover:bg-denison-red/[0.09]" : "hover:bg-app-background/70"}`}>
                <td className="px-3 py-2.5">
                  <Link href={recruitingTournamentPath(row.id)} className={`block truncate font-semibold hover:underline ${row.recruitingPlan === "traveling" ? "text-denison-red" : "text-text-primary"}`}>{row.name}</Link>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-text-primary">
                  {inlineCell(row, "startDate", row.startDate ?? "", { type: "date", displayValue: row.startDate ? formatDate(row.startDate) : EMPTY_VALUE })}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-text-primary">
                  {inlineCell(row, "endDate", row.endDate ?? "", { type: "date", displayValue: row.endDate ? formatDate(row.endDate) : EMPTY_VALUE })}
                </td>
                <td className="px-4 py-2.5 text-text-primary">{inlineCell(row, "city", city ?? "")}</td>
                <td className="px-4 py-2.5 text-text-primary">{inlineCell(row, "state", state ?? "")}</td>
                <td className="px-4 py-2.5 text-text-primary">{inlineCell(row, "level", row.level ?? "")}</td>
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
                <td className="px-2 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => onEditTournament(row)} title="Edit tournament" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-app-background hover:text-text-primary" aria-label={`Edit ${row.name}`}><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" disabled={pending && pendingId === row.id} onClick={() => deleteRow(row)} title="Delete tournament" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-danger hover:bg-danger/5 disabled:opacity-40" aria-label={`Delete ${row.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
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
