"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ClipboardList, Download } from "lucide-react";

import ContactActionSlots from "@/components/ContactActionSlots";
import type { SortState } from "@/components/data-table/types";
import { useSortableData } from "@/components/data-table/useSortableData";
import {
  isValidUtr,
  isValidWtn,
  toOptionalNumber,
} from "@/components/editor";
import {
  copyFoundSet,
  publishFoundSet,
} from "@/components/found-set";
import { DesktopOnlyActions } from "@/components/mobile-dashboard";
import {
  InlineEditCell,
  formatPhoneDisplay,
  phoneHrefDigits,
  SaveIndicator,
  useSaveIndicator,
  type InlineCommitReason,
} from "@/components/inline-edit";
import { StickyProductivityActionBar } from "@/components/productivity";
import ViewChrome, { ViewContextHeader } from "@/components/view-chrome";
import { useDrawerManager } from "@/components/workspace-drawer";

import ExportBuilder from "@/features/export-engine/components/ExportBuilder";
import { TEAM_EXPORT_MODULE } from "@/features/export-engine";
import { updatePersonAction } from "@/features/people/actions";
import {
  TEAM_DIRECTORY_LIST_TABLE_COLUMNS,
  type TeamDirectoryListColumnId,
} from "@/features/people/directoryColumns";
import {
  TEAM_DIRECTORY_EMPTY,
  TEAM_DIRECTORY_META,
  TEAM_DIRECTORY_NAME,
  directoryCellValue,
} from "@/features/people/directoryHierarchy";
import { peopleDirectoryContextLabel } from "@/features/people/filters";
import {
  TEAM_FOUND_SET_COLUMNS,
  TEAM_FOUND_SET_FILENAME_BASE,
  TEAM_FOUND_SET_MODULE_KEY,
} from "@/features/people/foundSet";
import { toPersonWritePatch } from "@/features/people/personWritePatch";
import type { Person } from "@/features/people/types";
import {
  getDisplayName,
  getHometown,
  getInitials,
  getPersonRoleDisplay,
  isCoachDirectoryPerson,
} from "@/features/people/utils";
import { formatUtr, formatWtn } from "@/lib/formatting";
import { playersCoachesPersonPath } from "@/lib/module-routes";

import PlayerAvatar from "@/components/PlayerAvatar";
import QuickActionButton from "@/components/QuickActionButton";
import {
  RECRUITING_TABLE,
  RECRUITING_TABLE_AVATAR_SIZE,
  RECRUITING_TABLE_COLUMNS,
} from "@/features/recruiting/components/recruitingTableChrome";
import {
  RecruitingHeaderLabel,
  RecruitingTableSectionBar,
  recruitingMetricDisplay,
} from "@/features/recruiting/components/RecruitingTableShared";

type PersonColumnKey = TeamDirectoryListColumnId;

/** Fields that support double-click inline editing in the Team List (BP-019A / BP-025F). */
type EditableField = Exclude<PersonColumnKey, "name" | "cellPhone" | "email">;

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

const PERSON_COLUMN_KEYS: readonly PersonColumnKey[] = TEAM_DIRECTORY_LIST_TABLE_COLUMNS.map(
  (column) => column.id,
);

const columns = TEAM_DIRECTORY_LIST_TABLE_COLUMNS;
const BOARD = RECRUITING_TABLE;
const C = RECRUITING_TABLE_COLUMNS;

function PlayersCoachesListColgroup() {
  return (
    <colgroup>
      <col style={{ width: C.handle }} />
      <col style={{ width: C.rank }} />
      <col />
      <col style={{ width: 160 }} />
      <col style={{ width: C.classYear }} />
      <col style={{ width: C.utr }} />
      <col style={{ width: C.wtn }} />
      <col style={{ width: 132 }} />
      <col />
      <col style={{ width: C.contact }} />
    </colgroup>
  );
}

function personListEmail(person: Person): string | undefined {
  return person.personalEmail ?? person.denisonEmail;
}

type EditingCell = { personId: string; field: EditableField };

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

export default function PersonList({
  people,
  allPeople,
  activeFilterIds,
  onPersonCommit,
}: {
  people: Person[];
  /** Unfiltered Team directory (search/filters not applied). Used for All Players. */
  allPeople?: Person[];
  activeFilterIds: readonly string[];
  onPersonCommit?: (person: Person) => void;
}) {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const runExportRef = useRef<() => boolean>(() => false);
  const bindExport = useCallback((run: () => boolean) => {
    runExportRef.current = run;
  }, []);
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
    openDrawer({
      id: "team-export",
      title: "Export",
      subtitle: "Team",
      content: (
        <ExportBuilder
          entry={{
            module: TEAM_EXPORT_MODULE,
            populations: {
              all: allPeople ?? people,
              foundSet: sortedItems,
            },
            initialPresetId: "playerDirectory",
            initialWho: "found_set",
          }}
          bindExport={bindExport}
        />
      ),
      primaryAction: {
        label: "Export",
        onClick: () => {
          if (runExportRef.current()) closeDrawer();
        },
      },
      cancelAction: { label: "Cancel" },
    });
  }, [allPeople, bindExport, closeDrawer, openDrawer, people, sortedItems]);

  const openWorkspace = useCallback(
    (personId: string) => {
      router.push(playersCoachesPersonPath(personId));
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
        const result = await updatePersonAction(personId, toPersonWritePatch(patch));
        if (!result.success) {
          throw new Error(result.error);
        }
        setRows((current) =>
          current.map((row) => (row.id === personId ? result.person : row)),
        );
        onPersonCommit?.(result.person);
      });

      if (!ok) {
        setRows(previousRows);
      }
    },
    [rows, buildPatch, isPatchUnchanged, moveEditing, onPersonCommit, runSave],
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

  const actionButtons = (
    <DesktopOnlyActions>
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
    </DesktopOnlyActions>
  );

  function sortDir(key: PersonColumnKey) {
    return sort?.key === key ? sort.direction : null;
  }

  return (
    <ViewChrome
      contextHeader={
        <ViewContextHeader
          eyebrow="Directory"
          title="Roster"
          subtitle={peopleDirectoryContextLabel(activeFilterIds)}
        />
      }
      foundSetFeedback={foundSetFeedback}
      saveStatus={saveStatus}
      saveError={saveError}
      actionButtons={actionButtons}
      mobileActionBar={
        <StickyProductivityActionBar
          className="!py-2 border-black/[0.04] bg-transparent md:hidden"
          leading={
            foundSetFeedback ? (
              <span className="text-xs font-medium text-success" role="status">
                {foundSetFeedback}
              </span>
            ) : (
              <SaveIndicator status={saveStatus} error={saveError} />
            )
          }
          actions={actionButtons}
        />
      }
    >
      <div className="min-w-0">
        <section className={`${BOARD.section} max-md:hidden`}>
          <RecruitingTableSectionBar title="Team" count={sortedItems.length} />
          <table
            className="w-full table-fixed border-collapse text-left"
            role="grid"
            aria-label="Players and coaches list"
          >
            <PlayersCoachesListColgroup />
            <thead>
              <tr>
                <th scope="col" className={BOARD.th} aria-label="Handle" />
                <th scope="col" className={BOARD.th} aria-label="Rank" />
                <RecruitingHeaderLabel
                  label="Player / Coach"
                  sortDirection={sortDir("name")}
                  onSort={() => toggleSort("name")}
                />
                <RecruitingHeaderLabel
                  label="Hometown"
                  sortDirection={sortDir("hometown")}
                  onSort={() => toggleSort("hometown")}
                />
                <RecruitingHeaderLabel
                  label="Class"
                  sortDirection={sortDir("classYear")}
                  onSort={() => toggleSort("classYear")}
                />
                <RecruitingHeaderLabel
                  label="UTR"
                  align="right"
                  sortDirection={sortDir("utr")}
                  onSort={() => toggleSort("utr")}
                />
                <RecruitingHeaderLabel
                  label="WTN"
                  align="right"
                  sortDirection={sortDir("wtn")}
                  onSort={() => toggleSort("wtn")}
                />
                <RecruitingHeaderLabel
                  label="Cell #"
                  sortDirection={sortDir("cellPhone")}
                  onSort={() => toggleSort("cellPhone")}
                />
                <RecruitingHeaderLabel
                  label="Email"
                  sortDirection={sortDir("email")}
                  onSort={() => toggleSort("email")}
                />
                <RecruitingHeaderLabel label="Actions" align="center" />
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((person) => {
                const displayName = getDisplayName(person);
                const hometown = getHometown(person);
                const hrefs = contactHrefs(person);
                const coachDirectory = isCoachDirectoryPerson(person);
                const showPlayerMetrics = !coachDirectory;
                const classDisplay = showPlayerMetrics
                  ? directoryCellValue(person.classYear)
                  : TEAM_DIRECTORY_EMPTY;
                const utrDisplay = showPlayerMetrics
                  ? recruitingMetricDisplay(formatUtr(person.utr))
                  : TEAM_DIRECTORY_EMPTY;
                const wtnDisplay = showPlayerMetrics
                  ? recruitingMetricDisplay(formatWtn(person.wtn))
                  : TEAM_DIRECTORY_EMPTY;
                const phoneDisplay = directoryCellValue(formatPhoneDisplay(person.cellPhone));
                const emailDisplay = directoryCellValue(personListEmail(person));

                return (
                  <tr
                    key={person.id}
                    onClick={() => handleRowClick(person.id)}
                    className={`cursor-pointer ${BOARD.rowHover} last:[&>td]:border-b-0`}
                  >
                    <td className={`${BOARD.td} pr-0 pl-1.5`} />
                    <td className={`${BOARD.td} pr-1`} />
                    <td className={BOARD.td}>
                      <Link
                        href={playersCoachesPersonPath(person.id)}
                        onClick={stopRowNavigation}
                        onMouseDown={stopRowNavigation}
                        className="flex min-w-0 items-center gap-2.5 rounded-control outline-none hover:text-[var(--module-accent)] focus-visible:ring-2 focus-visible:ring-[var(--module-accent)]/40"
                        aria-label={`Open workspace for ${displayName}`}
                      >
                        <PlayerAvatar
                          photoUrl={person.photoUrl}
                          initials={getInitials(person)}
                          size={RECRUITING_TABLE_AVATAR_SIZE}
                        />
                        <div className="min-w-0">
                          <p className={`min-w-0 truncate ${TEAM_DIRECTORY_NAME}`}>
                            {displayName}
                          </p>
                          <p className={BOARD.hometown}>
                            {hometown || TEAM_DIRECTORY_EMPTY}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className={BOARD.td}>
                      <InlineEditCell
                        label="Hometown"
                        value={hometown ?? ""}
                        displayValue={directoryCellValue(hometown)}
                        emptyDisplay={TEAM_DIRECTORY_EMPTY}
                        emphasis="directory"
                        className="truncate !mx-0 !px-0 !py-0"
                        editing={isEditing(person.id, "hometown")}
                        error={isEditing(person.id, "hometown") ? fieldError : undefined}
                        onRequestEdit={() => startEdit(person.id, "hometown")}
                        onCancel={cancelEdit}
                        onCommit={(raw, reason) =>
                          handleCommit(person.id, "hometown", raw, reason)
                        }
                      />
                    </td>
                    <td className={BOARD.td}>
                      {showPlayerMetrics ? (
                        <InlineEditCell
                          label="Class"
                          value={
                            person.classYear !== undefined ? String(person.classYear) : ""
                          }
                          displayValue={classDisplay}
                          emptyDisplay={TEAM_DIRECTORY_EMPTY}
                          type="number"
                          editOn="click"
                          className="!mx-0 !px-0 !py-0"
                          editing={isEditing(person.id, "classYear")}
                          error={isEditing(person.id, "classYear") ? fieldError : undefined}
                          renderDisplay={
                            <span className={BOARD.classValue}>{classDisplay}</span>
                          }
                          onRequestEdit={() => startEdit(person.id, "classYear")}
                          onCancel={cancelEdit}
                          onCommit={(raw, reason) =>
                            handleCommit(person.id, "classYear", raw, reason)
                          }
                        />
                      ) : (
                        <span className={BOARD.classValue}>{TEAM_DIRECTORY_EMPTY}</span>
                      )}
                    </td>
                    <td className={`${BOARD.td} ${BOARD.metric}`}>
                      {showPlayerMetrics ? (
                        <InlineEditCell
                          label="UTR"
                          value={person.utr !== undefined ? String(person.utr) : ""}
                          displayValue={directoryCellValue(formatUtr(person.utr))}
                          emptyDisplay={TEAM_DIRECTORY_EMPTY}
                          type="number"
                          step={0.01}
                          align="right"
                          editOn="click"
                          emphasis="directory"
                          className="!mx-0 !px-0 !py-0"
                          editing={isEditing(person.id, "utr")}
                          error={isEditing(person.id, "utr") ? fieldError : undefined}
                          renderDisplay={<span className={BOARD.metric}>{utrDisplay}</span>}
                          onRequestEdit={() => startEdit(person.id, "utr")}
                          onCancel={cancelEdit}
                          onCommit={(raw, reason) =>
                            handleCommit(person.id, "utr", raw, reason)
                          }
                        />
                      ) : (
                        <span className={BOARD.metric}>{TEAM_DIRECTORY_EMPTY}</span>
                      )}
                    </td>
                    <td className={`${BOARD.td} ${BOARD.metric}`}>
                      {showPlayerMetrics ? (
                        <InlineEditCell
                          label="WTN"
                          value={person.wtn !== undefined ? String(person.wtn) : ""}
                          displayValue={directoryCellValue(formatWtn(person.wtn))}
                          emptyDisplay={TEAM_DIRECTORY_EMPTY}
                          type="number"
                          step={0.01}
                          align="right"
                          editOn="click"
                          emphasis="directory"
                          className="!mx-0 !px-0 !py-0"
                          editing={isEditing(person.id, "wtn")}
                          error={isEditing(person.id, "wtn") ? fieldError : undefined}
                          renderDisplay={<span className={BOARD.metric}>{wtnDisplay}</span>}
                          onRequestEdit={() => startEdit(person.id, "wtn")}
                          onCancel={cancelEdit}
                          onCommit={(raw, reason) =>
                            handleCommit(person.id, "wtn", raw, reason)
                          }
                        />
                      ) : (
                        <span className={BOARD.metric}>{TEAM_DIRECTORY_EMPTY}</span>
                      )}
                    </td>
                    <td className={BOARD.td}>
                      <span
                        title={phoneDisplay === TEAM_DIRECTORY_EMPTY ? undefined : phoneDisplay}
                        className={`block truncate text-[13px] leading-none font-normal text-text-secondary`}
                      >
                        {phoneDisplay}
                      </span>
                    </td>
                    <td className={BOARD.td}>
                      <span
                        title={emailDisplay === TEAM_DIRECTORY_EMPTY ? undefined : emailDisplay}
                        className={`block truncate text-[13px] leading-none font-normal text-text-secondary`}
                      >
                        {emailDisplay}
                      </span>
                    </td>
                    <td
                      className={BOARD.td}
                      onClick={stopRowNavigation}
                      onMouseDown={stopRowNavigation}
                    >
                      <div className="flex justify-center">
                        <ContactActionSlots
                          tel={hrefs.tel}
                          sms={hrefs.sms}
                          mailto={hrefs.mailto}
                          size="compact"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <div className="md:hidden">
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
                    href={playersCoachesPersonPath(person.id)}
                    className="flex items-center gap-3 px-4 py-4 transition-colors duration-150 active:bg-app-background"
                  >
                    <PlayerAvatar
                      photoUrl={person.photoUrl}
                      initials={getInitials(person)}
                      size={RECRUITING_TABLE_AVATAR_SIZE}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={TEAM_DIRECTORY_NAME}>{displayName}</p>
                      <p className={`mt-0.5 ${TEAM_DIRECTORY_META}`}>
                        {directoryCellValue(roleDisplay)}
                      </p>
                      {detailLine ? (
                        <p className={`mt-1 ${TEAM_DIRECTORY_META}`}>{detailLine}</p>
                      ) : (
                        <p className={`mt-1 ${TEAM_DIRECTORY_META}`}>
                          {TEAM_DIRECTORY_EMPTY}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </ViewChrome>
  );
}
