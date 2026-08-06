"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ClipboardList, Download, Mail, MessageSquare, Phone } from "lucide-react";

import DirectoryTable from "@/components/data-table/DirectoryTable";
import {
  DIRECTORY_CELL_CLIP,
  DIRECTORY_CELL_PAD,
  DIRECTORY_COL,
  DIRECTORY_TABLE_WIDTH_PX,
} from "@/components/data-table/directoryColumnWidths";
import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import {
  stickyColumnRowClass,
  stickyLeadingTdClass,
  stickyLeadingThClass,
  stickyTrailingTdClass,
  stickyTrailingThClass,
} from "@/components/data-table/stickyColumns";
import type { ColumnDef, SortState } from "@/components/data-table/types";
import { useSortableData } from "@/components/data-table/useSortableData";
import {
  isValidUtr,
  isValidWtn,
  toOptionalNumber,
} from "@/components/editor";
import {
  copyFoundSet,
  exportFoundSetCsv,
  publishFoundSet,
} from "@/components/found-set";
import {
  InlineEditCell,
  phoneHrefDigits,
  SaveIndicator,
  useSaveIndicator,
  type InlineCommitReason,
} from "@/components/inline-edit";
import { StickyProductivityActionBar } from "@/components/productivity";

import { updatePersonAction } from "@/features/people/actions";
import {
  TEAM_DIRECTORY_EMPTY,
  TEAM_DIRECTORY_META,
  TEAM_DIRECTORY_NAME,
  directoryCellValue,
} from "@/features/people/directoryHierarchy";
import {
  TEAM_FOUND_SET_COLUMNS,
  TEAM_FOUND_SET_FILENAME_BASE,
  TEAM_FOUND_SET_MODULE_KEY,
} from "@/features/people/foundSet";
import type { Person } from "@/features/people/types";
import {
  getDisplayFirstName,
  getDisplayName,
  getHometown,
  getInitials,
  getPersonRoleDisplay,
  isCoachDirectoryPerson,
} from "@/features/people/utils";
import { formatUtr, formatWtn } from "@/lib/formatting";

import PlayerAvatar from "@/components/PlayerAvatar";
import QuickActionButton from "@/components/QuickActionButton";
import { typeClass, typeRole } from "@/components/typography";

type PersonColumnKey =
  | "name"
  | "role"
  | "hometown"
  | "classYear"
  | "utr"
  | "wtn";

/** Fields that support double-click inline editing in the Team List (BP-019A / BP-025F). */
type EditableField = Exclude<PersonColumnKey, "name" | "role">;

const EDITABLE_FIELDS: EditableField[] = [
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
  "role",
  "hometown",
  "classYear",
  "utr",
  "wtn",
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
 * Column definitions for the Team List view — directory facts only (BP-025F).
 * Administrative fields (D#, phone, email) live in Person Workspace.
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
    id: "role",
    title: "Role",
    sortable: true,
    sortType: "text",
    accessor: (person) => getPersonRoleDisplay(person),
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

/**
 * Parse free-text "City, ST" into a patch.
 * Omit keys that were not provided so `personPatchToRow` cannot NULL them
 * accidentally (BP-026B). Empty input explicitly clears both fields.
 */
function parseHometown(raw: string): { city?: string; state?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { city: undefined, state: undefined };
  const comma = trimmed.lastIndexOf(",");
  if (comma === -1) {
    return { city: trimmed };
  }
  const city = trimmed.slice(0, comma).trim();
  const state = trimmed.slice(comma + 1).trim();
  const patch: { city?: string; state?: string } = {};
  if (city) patch.city = city;
  else patch.city = undefined;
  if (state) patch.state = state;
  else patch.state = undefined;
  return patch;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function contactHrefs(person: Person) {
  const digits = phoneHrefDigits(person.cellPhone);
  const email = person.personalEmail ?? person.denisonEmail;
  return {
    tel: digits ? `tel:${digits}` : undefined,
    sms: digits ? `sms:${digits}` : undefined,
    mailto: email ? `mailto:${email}` : undefined,
  };
}

export default function PersonList({ people }: { people: Person[] }) {
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

  // Keep the Team found set in session so Workspace Copy / Export match
  // the list's current search · filter · sort (BP-021).
  useEffect(() => {
    publishFoundSet({
      moduleKey: TEAM_FOUND_SET_MODULE_KEY,
      filenameBase: TEAM_FOUND_SET_FILENAME_BASE,
      rows: sortedItems,
      columns: TEAM_FOUND_SET_COLUMNS,
    });
  }, [sortedItems]);

  const [foundSetFeedback, setFoundSetFeedback] = useState<string | undefined>(undefined);

  const handleCopyFoundSet = useCallback(async () => {
    if (sortedItems.length === 0) return;
    try {
      await copyFoundSet(sortedItems, TEAM_FOUND_SET_COLUMNS);
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
      columns: TEAM_FOUND_SET_COLUMNS,
      filenameBase: TEAM_FOUND_SET_FILENAME_BASE,
    });
  }, [sortedItems]);

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
      _person: Person,
      field: EditableField,
      raw: string,
    ): { patch: Partial<Person>; error?: string } => {
      switch (field) {
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

  const cellPad = DIRECTORY_CELL_PAD;
  const middleCell = `${DIRECTORY_CELL_PAD} ${DIRECTORY_CELL_CLIP}`;

  return (
    <div className="flex flex-col gap-2">
      <StickyProductivityActionBar
        leading={
          <>
            <SaveIndicator status={saveStatus} error={saveError} />
            {foundSetFeedback ? (
              <span className="text-xs font-medium text-success" role="status">
                {foundSetFeedback}
              </span>
            ) : null}
            <span className={typeClass("metadataSm", "tabular-nums")}>
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

      <DirectoryTable mobile={
          <ul className="divide-y divide-border/50">
            {sortedItems.map((person) => {
              const displayName = getDisplayName(person);
              const roleDisplay = getPersonRoleDisplay(person);
              const hometown = getHometown(person);
              const coachDirectory = isCoachDirectoryPerson(person);
              const detailLine = coachDirectory
                ? [hometown].filter(Boolean).join(" · ")
                : [person.classYear ? `Class of ${person.classYear}` : null, hometown]
                    .filter(Boolean)
                    .join(" · ");

              return (
                <li key={person.id}>
                  <Link
                    href={`/team/${person.id}`}
                    className="flex items-center gap-3 px-4 py-4 transition-colors duration-150 active:bg-app-background"
                  >
                    <PlayerAvatar
                      photoUrl={person.photoUrl}
                      initials={getInitials(person)}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={TEAM_DIRECTORY_NAME}>{displayName}</p>
                      <p className={`mt-0.5 ${TEAM_DIRECTORY_META}`}>
                        {directoryCellValue(roleDisplay)}
                      </p>
                      {detailLine ? (
                        <p className={`mt-1 ${TEAM_DIRECTORY_META}`}>{detailLine}</p>
                      ) : (
                        <p className={`mt-1 ${TEAM_DIRECTORY_META}`}>{TEAM_DIRECTORY_EMPTY}</p>
                      )}
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
          style={{ minWidth: DIRECTORY_TABLE_WIDTH_PX }}
          role="grid"
          aria-label="Team list"
        >
          <colgroup>
            {/* Sticky content-width edges; middle cols share remainder (BP-028E). */}
            <col className={DIRECTORY_COL.name} />
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
            {sortedItems.map((person) => {
              const displayName = getDisplayName(person);
              const roleDisplay = directoryCellValue(getPersonRoleDisplay(person));
              const hometown = getHometown(person);
              const hrefs = contactHrefs(person);
              const coachDirectory = isCoachDirectoryPerson(person);
              const showPlayerMetrics = !coachDirectory;
              const classDisplay = showPlayerMetrics
                ? directoryCellValue(person.classYear)
                : TEAM_DIRECTORY_EMPTY;
              const utrDisplay = showPlayerMetrics ? formatUtr(person.utr) : TEAM_DIRECTORY_EMPTY;
              const wtnDisplay = showPlayerMetrics ? formatWtn(person.wtn) : TEAM_DIRECTORY_EMPTY;

              return (
                <tr
                  key={person.id}
                  onClick={() => handleRowClick(person.id)}
                  className={`${stickyColumnRowClass} h-12 cursor-pointer border-b border-border/40 transition-colors duration-150 last:border-b-0 hover:bg-app-background`}
                >
                  <td className={`${cellPad} ${stickyLeadingTdClass}`}>
                    <div className="flex h-8 min-w-0 items-center gap-2">
                      <PlayerAvatar
                        photoUrl={person.photoUrl}
                        initials={getInitials(person)}
                        size={32}
                      />
                      <span className={`min-w-0 truncate ${TEAM_DIRECTORY_NAME}`}>
                        {displayName}
                      </span>
                    </div>
                  </td>
                  <td className={middleCell}>
                    <span className={`block whitespace-nowrap ${TEAM_DIRECTORY_META}`}>
                      {roleDisplay}
                    </span>
                  </td>
                  <td className={middleCell}>
                    <InlineEditCell
                      label="Hometown"
                      value={hometown ?? ""}
                      displayValue={directoryCellValue(hometown)}
                      emptyDisplay={TEAM_DIRECTORY_EMPTY}
                      emphasis="directory"
                      className="truncate"
                      editing={isEditing(person.id, "hometown")}
                      error={isEditing(person.id, "hometown") ? fieldError : undefined}
                      onRequestEdit={() => startEdit(person.id, "hometown")}
                      onCancel={cancelEdit}
                      onCommit={(raw, reason) => handleCommit(person.id, "hometown", raw, reason)}
                    />
                  </td>
                  <td className={`${middleCell} text-right`}>
                    {showPlayerMetrics ? (
                      <InlineEditCell
                        label="Class"
                        value={person.classYear !== undefined ? String(person.classYear) : ""}
                        displayValue={classDisplay}
                        emptyDisplay={TEAM_DIRECTORY_EMPTY}
                        type="number"
                        align="right"
                        emphasis="directory"
                        editing={isEditing(person.id, "classYear")}
                        error={isEditing(person.id, "classYear") ? fieldError : undefined}
                        onRequestEdit={() => startEdit(person.id, "classYear")}
                        onCancel={cancelEdit}
                        onCommit={(raw, reason) =>
                          handleCommit(person.id, "classYear", raw, reason)
                        }
                      />
                    ) : (
                      <span className={TEAM_DIRECTORY_META}>{TEAM_DIRECTORY_EMPTY}</span>
                    )}
                  </td>
                  <td className={`${middleCell} text-right`}>
                    {showPlayerMetrics ? (
                      <InlineEditCell
                        label="UTR"
                        value={person.utr !== undefined ? String(person.utr) : ""}
                        displayValue={utrDisplay}
                        emptyDisplay={TEAM_DIRECTORY_EMPTY}
                        type="number"
                        step={0.01}
                        align="right"
                        emphasis="directory"
                        editing={isEditing(person.id, "utr")}
                        error={isEditing(person.id, "utr") ? fieldError : undefined}
                        onRequestEdit={() => startEdit(person.id, "utr")}
                        onCancel={cancelEdit}
                        onCommit={(raw, reason) => handleCommit(person.id, "utr", raw, reason)}
                      />
                    ) : (
                      <span className={TEAM_DIRECTORY_META}>{TEAM_DIRECTORY_EMPTY}</span>
                    )}
                  </td>
                  <td className={`${middleCell} text-right`}>
                    {showPlayerMetrics ? (
                      <InlineEditCell
                        label="WTN"
                        value={person.wtn !== undefined ? String(person.wtn) : ""}
                        displayValue={wtnDisplay}
                        emptyDisplay={TEAM_DIRECTORY_EMPTY}
                        type="number"
                        step={0.01}
                        align="right"
                        emphasis="directory"
                        editing={isEditing(person.id, "wtn")}
                        error={isEditing(person.id, "wtn") ? fieldError : undefined}
                        onRequestEdit={() => startEdit(person.id, "wtn")}
                        onCancel={cancelEdit}
                        onCommit={(raw, reason) => handleCommit(person.id, "wtn", raw, reason)}
                      />
                    ) : (
                      <span className={TEAM_DIRECTORY_META}>{TEAM_DIRECTORY_EMPTY}</span>
                    )}
                  </td>
                  <td
                    className={`${cellPad} text-right ${stickyTrailingTdClass}`}
                    onClick={stopRowNavigation}
                    onMouseDown={stopRowNavigation}
                  >
                    <div className="inline-flex h-10 shrink-0 items-center justify-end gap-1">
                      {hrefs.tel ? (
                        <QuickActionButton
                          href={hrefs.tel}
                          icon={Phone}
                          label="Call"
                          tone="success"
                        />
                      ) : null}
                      {hrefs.sms ? (
                        <QuickActionButton
                          href={hrefs.sms}
                          icon={MessageSquare}
                          label="Text"
                          tone="denison"
                        />
                      ) : null}
                      {hrefs.mailto ? (
                        <QuickActionButton
                          href={hrefs.mailto}
                          icon={Mail}
                          label="Email"
                          tone="info"
                        />
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
