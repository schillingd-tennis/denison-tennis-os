"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type MouseEvent } from "react";
import { Mail, MessageSquare, Phone } from "lucide-react";

import type { ColumnDef, SortState } from "@/components/data-table/types";
import { useSortableData } from "@/components/data-table/useSortableData";
import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import {
  isValidEmail,
  isValidPhone,
  isValidUtr,
  isValidWtn,
  toOptionalNumber,
} from "@/components/editor";
import {
  formatPhoneDisplay,
  InlineEditCell,
  normalizeEmail,
  normalizePhone,
  phoneHrefDigits,
  SaveIndicator,
  useSaveIndicator,
  type InlineCommitReason,
} from "@/components/inline-edit";

import { updatePersonAction } from "@/features/people/actions";
import type { Person, PersonStatus } from "@/features/people/types";
import {
  getDisplayFirstName,
  getDisplayName,
  getHometown,
  getInitials,
  getStatusLabel,
  getStatusTone,
} from "@/features/people/utils";

import PlayerAvatar from "@/components/PlayerAvatar";
import QuickActionButton from "@/components/QuickActionButton";
import StatusBadge from "@/components/StatusBadge";

type PersonColumnKey =
  | "name"
  | "status"
  | "phone"
  | "email"
  | "hometown"
  | "classYear"
  | "utr"
  | "wtn";

/** Fields that support double-click inline editing in the Team List (BP-019A). */
type EditableField = Exclude<PersonColumnKey, "name">;

const EDITABLE_FIELDS: EditableField[] = [
  "status",
  "phone",
  "email",
  "hometown",
  "classYear",
  "utr",
  "wtn",
];

/** Delay so a double-click on a cell isn't also treated as a row open. */
const ROW_CLICK_DELAY_MS = 250;

/** Session-only persistence so returning from a workspace keeps the sort. */
const TEAM_LIST_SORT_STORAGE_KEY = "denison-tennis-os:team-list-sort";

const PERSON_COLUMN_KEYS: readonly PersonColumnKey[] = [
  "name",
  "status",
  "phone",
  "email",
  "hometown",
  "classYear",
  "utr",
  "wtn",
];

const statusOptions = [
  { value: "current", label: "Current" },
  { value: "alumni", label: "Alumni" },
];

type EditingCell = { personId: string; field: EditableField };

/**
 * Sort key for the Name column: last name primary, first/preferred name as
 * a stable tiebreaker. Display remains "First Last" via `getDisplayName`.
 */
function nameSortKey(person: Person): string {
  const last = person.lastName?.trim() || "";
  const first = getDisplayFirstName(person).trim();
  return `${last}\u0000${first}`;
}

function readStoredTeamListSort(): SortState<PersonColumnKey> {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TEAM_LIST_SORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key?: unknown; direction?: unknown } | null;
    if (
      !parsed ||
      typeof parsed.key !== "string" ||
      (parsed.direction !== "asc" && parsed.direction !== "desc") ||
      !PERSON_COLUMN_KEYS.includes(parsed.key as PersonColumnKey)
    ) {
      return null;
    }
    return { key: parsed.key as PersonColumnKey, direction: parsed.direction };
  } catch {
    return null;
  }
}

function writeStoredTeamListSort(sort: SortState<PersonColumnKey>) {
  if (typeof window === "undefined") return;
  try {
    if (!sort) {
      window.sessionStorage.removeItem(TEAM_LIST_SORT_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(TEAM_LIST_SORT_STORAGE_KEY, JSON.stringify(sort));
  } catch {
    // Private mode / quota — sort still works for this mount; persistence is best-effort.
  }
}

/**
 * Column definitions for the Team List view — sorting via the Universal
 * DataTable engine, inline editing via `InlineEditCell` (BP-019A / BP-020).
 */
const columns: ColumnDef<Person, PersonColumnKey>[] = [
  {
    id: "name",
    title: "Name",
    sortable: true,
    sortType: "text",
    // Always sort by last name (A→Z first click); display stays First Last.
    accessor: nameSortKey,
    defaultSort: "asc",
  },
  {
    id: "status",
    title: "Status",
    sortable: true,
    sortType: "enum",
    accessor: (person) => person.status,
    enumOrder: ["current", "alumni"] satisfies PersonStatus[],
    defaultSort: "asc",
  },
  {
    id: "phone",
    title: "Phone",
    sortable: true,
    sortType: "text",
    accessor: (person) => person.cellPhone,
    defaultSort: "asc",
  },
  {
    id: "email",
    title: "Email",
    sortable: true,
    sortType: "text",
    accessor: (person) => person.personalEmail ?? person.denisonEmail,
    defaultSort: "asc",
  },
  {
    id: "hometown",
    title: "Hometown",
    sortable: true,
    sortType: "text",
    accessor: (person) => getHometown(person),
    defaultSort: "asc",
  },
  {
    id: "classYear",
    title: "Class",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (person) => person.classYear,
    defaultSort: "asc",
  },
  {
    id: "utr",
    title: "UTR",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (person) => person.utr,
    defaultSort: "desc",
  },
  {
    id: "wtn",
    title: "WTN",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (person) => person.wtn,
    defaultSort: "desc",
  },
];

/** Parse a free-text "City, ST" hometown back into Person address fields. */
function parseHometown(raw: string): { city?: string; state?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { city: undefined, state: undefined };
  const comma = trimmed.lastIndexOf(",");
  if (comma === -1) {
    return { city: trimmed, state: undefined };
  }
  const city = trimmed.slice(0, comma).trim();
  const state = trimmed.slice(comma + 1).trim();
  return {
    city: city || undefined,
    state: state || undefined,
  };
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Which email field the list column edits — personal if set, otherwise Denison. */
function emailFieldKey(person: Person): "personalEmail" | "denisonEmail" {
  if (person.personalEmail !== undefined) return "personalEmail";
  if (person.denisonEmail !== undefined) return "denisonEmail";
  return "personalEmail";
}

function emailForList(person: Person): string | undefined {
  return person.personalEmail ?? person.denisonEmail;
}

function contactHrefs(person: Person) {
  const digits = phoneHrefDigits(person.cellPhone);
  const email = emailForList(person);
  return {
    tel: digits ? `tel:${digits}` : undefined,
    sms: digits ? `sms:${digits}` : undefined,
    mailto: email ? `mailto:${email}` : undefined,
  };
}

export default function PlayerList({ people }: { people: Person[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(people);
  const [trackedPeople, setTrackedPeople] = useState(people);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const { status: saveStatus, error: saveError, runSave } = useSaveIndicator();
  const rowClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local optimistic rows when the server-rendered prop changes
  // (React-recommended "adjust state when a prop changes" pattern — not an effect).
  if (people !== trackedPeople) {
    setTrackedPeople(people);
    setRows(people);
  }

  const { sortedItems, sort, toggleSort } = useSortableData(rows, columns, {
    getInitialSort: readStoredTeamListSort,
    onSortChange: writeStoredTeamListSort,
  });

  const openWorkspace = useCallback(
    (personId: string) => {
      router.push(`/team/${personId}`);
    },
    [router],
  );

  const cancelPendingRowClick = useCallback(() => {
    if (rowClickTimerRef.current) {
      clearTimeout(rowClickTimerRef.current);
      rowClickTimerRef.current = null;
    }
  }, []);

  const handleRowClick = useCallback(
    (personId: string) => {
      // Don't navigate away while a cell on this (or any) row is being edited.
      if (editing) return;
      cancelPendingRowClick();
      rowClickTimerRef.current = setTimeout(() => {
        rowClickTimerRef.current = null;
        openWorkspace(personId);
      }, ROW_CLICK_DELAY_MS);
    },
    [editing, cancelPendingRowClick, openWorkspace],
  );

  const moveEditing = useCallback(
    (from: EditingCell, direction: "next" | "prev") => {
      const rowIndex = sortedItems.findIndex((person) => person.id === from.personId);
      if (rowIndex < 0) {
        setEditing(null);
        return;
      }

      const fieldIndex = EDITABLE_FIELDS.indexOf(from.field);
      let nextRow = rowIndex;
      let nextField = fieldIndex + (direction === "next" ? 1 : -1);

      if (nextField >= EDITABLE_FIELDS.length) {
        nextField = 0;
        nextRow += 1;
      } else if (nextField < 0) {
        nextField = EDITABLE_FIELDS.length - 1;
        nextRow -= 1;
      }

      if (nextRow < 0 || nextRow >= sortedItems.length) {
        setEditing(null);
        return;
      }

      setFieldError(undefined);
      setEditing({
        personId: sortedItems[nextRow].id,
        field: EDITABLE_FIELDS[nextField],
      });
    },
    [sortedItems],
  );

  const buildPatch = useCallback(
    (
      person: Person,
      field: EditableField,
      raw: string,
    ): { patch: Partial<Person>; error?: string } => {
      switch (field) {
        case "status": {
          if (!raw) return { patch: {}, error: "Status is required." };
          return { patch: { status: raw as PersonStatus } };
        }
        case "phone": {
          const value = normalizePhone(raw);
          const error = isValidPhone(value);
          return error ? { patch: {}, error } : { patch: { cellPhone: value } };
        }
        case "email": {
          const value = normalizeEmail(raw);
          const error = isValidEmail(value);
          if (error) return { patch: {}, error };
          // Write back to whichever email the column is currently showing so an
          // unchanged Enter on a Denison-only row doesn't invent a personalEmail.
          const key = emailFieldKey(person);
          return { patch: { [key]: value } };
        }
        case "hometown": {
          return { patch: parseHometown(raw) };
        }
        case "classYear": {
          if (raw.trim() === "") return { patch: { classYear: undefined } };
          const value = toOptionalNumber(raw);
          if (value === undefined) return { patch: {}, error: "Class year must be a number." };
          return { patch: { classYear: value } };
        }
        case "utr": {
          if (raw.trim() === "") return { patch: { utr: undefined } };
          const value = toOptionalNumber(raw);
          if (value === undefined) return { patch: {}, error: "UTR must be a number." };
          const error = isValidUtr(value);
          return error ? { patch: {}, error } : { patch: { utr: value } };
        }
        case "wtn": {
          if (raw.trim() === "") return { patch: { wtn: undefined } };
          const value = toOptionalNumber(raw);
          if (value === undefined) return { patch: {}, error: "WTN must be a number." };
          const error = isValidWtn(value);
          return error ? { patch: {}, error } : { patch: { wtn: value } };
        }
      }
    },
    [],
  );

  const isPatchUnchanged = useCallback((person: Person, patch: Partial<Person>): boolean => {
    return Object.entries(patch).every(([key, value]) =>
      valuesEqual(person[key as keyof Person], value),
    );
  }, []);

  const handleCommit = useCallback(
    async (personId: string, field: EditableField, raw: string, reason: InlineCommitReason) => {
      const person = rows.find((row) => row.id === personId);
      if (!person) {
        setEditing(null);
        return;
      }

      const { patch, error } = buildPatch(person, field, raw);
      if (error) {
        setFieldError(error);
        return;
      }

      setFieldError(undefined);

      if (isPatchUnchanged(person, patch)) {
        if (reason === "tab") {
          moveEditing({ personId, field }, "next");
        } else if (reason === "shift-tab") {
          moveEditing({ personId, field }, "prev");
        } else {
          setEditing(null);
        }
        return;
      }

      const previousRows = rows;
      setRows((current) =>
        current.map((row) => (row.id === personId ? { ...row, ...patch } : row)),
      );

      if (reason === "tab") {
        moveEditing({ personId, field }, "next");
      } else if (reason === "shift-tab") {
        moveEditing({ personId, field }, "prev");
      } else {
        setEditing(null);
      }

      const ok = await runSave(async () => {
        const result = await updatePersonAction(personId, patch);
        if (!result.success) {
          throw new Error(result.error);
        }
        setRows((current) =>
          current.map((row) => (row.id === personId ? result.person : row)),
        );
      });

      if (!ok) {
        setRows(previousRows);
      }
    },
    [rows, buildPatch, isPatchUnchanged, moveEditing, runSave],
  );

  const editingKey = useMemo(
    () => (editing ? `${editing.personId}:${editing.field}` : null),
    [editing],
  );

  function isEditing(personId: string, field: EditableField): boolean {
    return editingKey === `${personId}:${field}`;
  }

  function startEdit(personId: string, field: EditableField) {
    cancelPendingRowClick();
    setFieldError(undefined);
    setEditing({ personId, field });
  }

  function cancelEdit() {
    setFieldError(undefined);
    setEditing(null);
  }

  function stopRowNavigation(event: MouseEvent) {
    event.stopPropagation();
    cancelPendingRowClick();
  }

  const cellPad = "px-4 py-2.5 align-middle";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex min-h-5 items-center justify-end px-1">
        <SaveIndicator status={saveStatus} error={saveError} />
      </div>

      <div className="relative overflow-hidden rounded-card border border-border bg-surface">
        <div className="hidden overflow-x-auto md:block">
          <table
            className="w-full min-w-[1020px] table-fixed text-left text-sm"
            role="grid"
            aria-label="Team list"
          >
            <colgroup>
              <col className="w-[17%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-app-background/60 text-xs font-medium tracking-wide text-text-secondary uppercase">
                {columns.map((column) => (
                  <SortableColumnHeader
                    key={column.id}
                    label={column.title}
                    align={column.align}
                    sortDirection={sort?.key === column.id ? sort.direction : null}
                    onSort={() => toggleSort(column.id)}
                  />
                ))}
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium tracking-wide text-text-secondary uppercase"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((person) => {
                const displayName = getDisplayName(person);
                const hometown = getHometown(person);
                const phoneDisplay = formatPhoneDisplay(person.cellPhone);
                const emailDisplay = emailForList(person);
                const hrefs = contactHrefs(person);

                return (
                  <tr
                    key={person.id}
                    onClick={() => handleRowClick(person.id)}
                    className="h-14 cursor-pointer border-b border-border/50 transition-colors duration-150 last:border-b-0 hover:bg-denison-red/[0.045]"
                  >
                    <td className={cellPad}>
                      <div className="flex min-w-0 items-center gap-3">
                        <PlayerAvatar
                          photoUrl={person.photoUrl}
                          initials={getInitials(person)}
                          size={32}
                        />
                        <span className="truncate text-[14px] font-semibold tracking-tight text-text-primary">
                          {displayName}
                        </span>
                      </div>
                    </td>
                    <td className={cellPad}>
                      <InlineEditCell
                        label="Status"
                        value={person.status}
                        displayValue={getStatusLabel(person.status)}
                        renderDisplay={
                          <StatusBadge
                            label={getStatusLabel(person.status)}
                            tone={getStatusTone(person.status)}
                          />
                        }
                        type="select"
                        options={statusOptions}
                        editing={isEditing(person.id, "status")}
                        error={isEditing(person.id, "status") ? fieldError : undefined}
                        onRequestEdit={() => startEdit(person.id, "status")}
                        onCancel={cancelEdit}
                        onCommit={(raw, reason) => handleCommit(person.id, "status", raw, reason)}
                      />
                    </td>
                    <td className={cellPad}>
                      <InlineEditCell
                        label="Phone"
                        value={person.cellPhone ?? ""}
                        displayValue={phoneDisplay}
                        type="tel"
                        className="tabular-nums"
                        editing={isEditing(person.id, "phone")}
                        error={isEditing(person.id, "phone") ? fieldError : undefined}
                        onRequestEdit={() => startEdit(person.id, "phone")}
                        onCancel={cancelEdit}
                        onCommit={(raw, reason) => handleCommit(person.id, "phone", raw, reason)}
                      />
                    </td>
                    <td className={cellPad}>
                      <InlineEditCell
                        label="Email"
                        value={person[emailFieldKey(person)] ?? ""}
                        displayValue={emailDisplay}
                        type="email"
                        className="truncate"
                        editing={isEditing(person.id, "email")}
                        error={isEditing(person.id, "email") ? fieldError : undefined}
                        onRequestEdit={() => startEdit(person.id, "email")}
                        onCancel={cancelEdit}
                        onCommit={(raw, reason) => handleCommit(person.id, "email", raw, reason)}
                      />
                    </td>
                    <td className={cellPad}>
                      <InlineEditCell
                        label="Hometown"
                        value={hometown ?? ""}
                        displayValue={hometown}
                        className="truncate"
                        editing={isEditing(person.id, "hometown")}
                        error={isEditing(person.id, "hometown") ? fieldError : undefined}
                        onRequestEdit={() => startEdit(person.id, "hometown")}
                        onCancel={cancelEdit}
                        onCommit={(raw, reason) => handleCommit(person.id, "hometown", raw, reason)}
                      />
                    </td>
                    <td className={`${cellPad} text-right`}>
                      <InlineEditCell
                        label="Class"
                        value={person.classYear !== undefined ? String(person.classYear) : ""}
                        displayValue={
                          person.classYear !== undefined ? String(person.classYear) : undefined
                        }
                        type="number"
                        align="right"
                        className="tabular-nums"
                        editing={isEditing(person.id, "classYear")}
                        error={isEditing(person.id, "classYear") ? fieldError : undefined}
                        onRequestEdit={() => startEdit(person.id, "classYear")}
                        onCancel={cancelEdit}
                        onCommit={(raw, reason) =>
                          handleCommit(person.id, "classYear", raw, reason)
                        }
                      />
                    </td>
                    <td className={`${cellPad} text-right`}>
                      <InlineEditCell
                        label="UTR"
                        value={person.utr !== undefined ? String(person.utr) : ""}
                        displayValue={person.utr !== undefined ? person.utr.toFixed(1) : undefined}
                        type="number"
                        step={0.1}
                        align="right"
                        className="tabular-nums"
                        editing={isEditing(person.id, "utr")}
                        error={isEditing(person.id, "utr") ? fieldError : undefined}
                        onRequestEdit={() => startEdit(person.id, "utr")}
                        onCancel={cancelEdit}
                        onCommit={(raw, reason) => handleCommit(person.id, "utr", raw, reason)}
                      />
                    </td>
                    <td className={`${cellPad} text-right`}>
                      <InlineEditCell
                        label="WTN"
                        value={person.wtn !== undefined ? String(person.wtn) : ""}
                        displayValue={person.wtn !== undefined ? person.wtn.toFixed(1) : undefined}
                        type="number"
                        step={0.1}
                        align="right"
                        className="tabular-nums"
                        editing={isEditing(person.id, "wtn")}
                        error={isEditing(person.id, "wtn") ? fieldError : undefined}
                        onRequestEdit={() => startEdit(person.id, "wtn")}
                        onCancel={cancelEdit}
                        onCommit={(raw, reason) => handleCommit(person.id, "wtn", raw, reason)}
                      />
                    </td>
                    <td
                      className={`${cellPad} text-right`}
                      onClick={stopRowNavigation}
                      onMouseDown={stopRowNavigation}
                    >
                      <div className="inline-flex w-full items-center justify-end gap-1">
                        <QuickActionButton
                          href={hrefs.sms}
                          icon={MessageSquare}
                          label="Text"
                          tone="denison"
                        />
                        <QuickActionButton
                          href={hrefs.tel}
                          icon={Phone}
                          label="Call"
                          tone="success"
                        />
                        <QuickActionButton
                          href={hrefs.mailto}
                          icon={Mail}
                          label="Email"
                          tone="info"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked records, navigation only (inline edit / quick actions are desktop) */}
        <ul className="divide-y divide-border/60 md:hidden">
          {sortedItems.map((person) => {
            const displayName = getDisplayName(person);
            const hometown = getHometown(person);
            const detailLine = [person.classYear ? `Class of ${person.classYear}` : null, hometown]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={person.id}>
                <Link
                  href={`/team/${person.id}`}
                  className="flex items-center gap-3.5 px-5 py-5 transition-colors duration-150 active:bg-denison-red/[0.03]"
                >
                  <PlayerAvatar
                    photoUrl={person.photoUrl}
                    initials={getInitials(person)}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[15px] font-semibold text-text-primary">
                        {displayName}
                      </p>
                      <StatusBadge
                        label={getStatusLabel(person.status)}
                        tone={getStatusTone(person.status)}
                      />
                    </div>
                    {detailLine ? (
                      <p className="mt-1 truncate text-sm text-text-secondary">{detailLine}</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
