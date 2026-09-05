"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";

import { useSortableData } from "@/components/data-table/useSortableData";
import EmptyState from "@/components/EmptyState";
import {
  MobileDirectoryControls,
  MobileDirectorySearchRegion,
  MobileViewSelector,
} from "@/components/mobile-dashboard";
import SearchInput from "@/components/SearchInput";
import ViewChrome, { ViewContextHeader } from "@/components/view-chrome";
import { useDrawerManager } from "@/components/workspace-drawer";
import {
  TEAM_DIRECTORY_EMPTY,
  TEAM_DIRECTORY_META,
  TEAM_DIRECTORY_NAME,
  directoryCellValue,
} from "@/features/people/directoryHierarchy";
import {
  RecruitingHeaderLabel,
  RecruitingTableSectionBar,
} from "@/features/recruiting/components/RecruitingTableShared";
import { RECRUITING_TABLE } from "@/features/recruiting/components/recruitingTableChrome";
import { ADD_RECRUIT_BUTTON_CLASS } from "@/features/recruiting/useAddRecruitDrawer";

import { createPracticeDrillAction, updatePracticeDrillAction } from "../actions";
import {
  DRILL_LIBRARY_COLUMNS,
  DRILL_LIBRARY_VIEW_OPTIONS,
  buildDrillFilterDefinitions,
  buildDrillLibraryRows,
  filterDrillLibraryRows,
  formatDrillLastUsed,
  type DrillLibraryRow,
  type DrillLibraryView,
  type DrillSortKey,
} from "../drillLibraryModel";
import type { DailyPracticePlan, PracticeDrill } from "../types";
import DrillFilterControl from "./DrillFilterControl";

const BOARD = RECRUITING_TABLE;
const ROW_CLICK_DELAY_MS = 250;

const ADD_DRILL_BUTTON_CLASS = ADD_RECRUIT_BUTTON_CLASS;

const DRILL_TABLE_COLUMNS = {
  drill: 400,
  category: 120,
  focus: 220,
  players: 88,
  competitive: 120,
  lastUsed: 132,
  timesUsed: 112,
  actions: 96,
} as const;

export default function DrillLibrary({
  drills,
  plans,
}: {
  drills: PracticeDrill[];
  plans: DailyPracticePlan[];
}) {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<DrillLibraryView>("all");
  const [activeFilterIds, setActiveFilterIds] = useState<readonly string[]>([]);
  const rowClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows = useMemo(() => buildDrillLibraryRows(drills, plans), [drills, plans]);
  const definitions = useMemo(() => buildDrillFilterDefinitions(rows), [rows]);
  const filtered = useMemo(
    () =>
      filterDrillLibraryRows(rows, {
        query,
        view,
        activeFilterIds,
        definitions,
      }),
    [rows, query, view, activeFilterIds, definitions],
  );

  const { sortedItems, sort, toggleSort } = useSortableData(filtered, DRILL_LIBRARY_COLUMNS, {
    getInitialSort: () => ({ key: "name", direction: "asc" }),
  });

  useEffect(
    () => () => {
      if (rowClickTimerRef.current) clearTimeout(rowClickTimerRef.current);
    },
    [],
  );

  function cancelPendingRowClick() {
    if (rowClickTimerRef.current) {
      clearTimeout(rowClickTimerRef.current);
      rowClickTimerRef.current = null;
    }
  }

  function stopRowNavigation(event: MouseEvent) {
    event.stopPropagation();
    cancelPendingRowClick();
  }

  const openDrillDrawer = useCallback(
    (drill: DrillLibraryRow, mode: "edit" | "create" = "edit") => {
      openDrawer({
        id: mode === "create" ? "practice-drill-create" : `practice-drill-${drill.id}`,
        title: mode === "create" ? "Add Drill" : "Drill Detail",
        subtitle: "Team Operations · Practice",
        hideFooter: true,
        content: (
          <DrillDetailForm
            drill={mode === "create" ? null : drill}
            onCancel={closeDrawer}
            onSaved={() => {
              closeDrawer();
              router.refresh();
            }}
          />
        ),
      });
    },
    [closeDrawer, openDrawer, router],
  );

  const handleRowClick = useCallback(
    (row: DrillLibraryRow) => {
      cancelPendingRowClick();
      rowClickTimerRef.current = setTimeout(() => {
        openDrillDrawer(row);
      }, ROW_CLICK_DELAY_MS);
    },
    [openDrillDrawer],
  );

  function sortDir(key: DrillSortKey) {
    return sort?.key === key ? sort.direction : null;
  }

  const emptyCreateRow = useMemo(
    (): DrillLibraryRow => ({
      id: "",
      name: "",
      description: "",
      tags: [],
      sourceTags: "",
      category: "",
      notes: "",
      frequency: "",
      focus: "",
      focusTags: [],
      players: "",
      competitive: false,
      timesUsed: 0,
      lastUsed: null,
    }),
    [],
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary">Drill Library</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Dense sortable list of imported and custom practice drills.
          </p>
        </div>
        <button
          type="button"
          className={ADD_DRILL_BUTTON_CLASS}
          onClick={() => openDrillDrawer(emptyCreateRow, "create")}
        >
          <Plus className="mr-1.5 h-4 w-4" strokeWidth={2} aria-hidden />
          Add Drill
        </button>
      </div>

      <MobileDirectorySearchRegion
        toolbar={
          <div className="grid min-w-0 gap-2.5">
            <div className="min-w-0">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search by name, description, category, or focus"
                aria-label="Search drills"
              />
            </div>
            <nav
              aria-label="Drill library views"
              className="flex max-w-full gap-1 overflow-x-auto rounded-card border border-border bg-surface p-1 shadow-[0_4px_14px_rgba(17,24,39,0.03)] max-md:hidden"
            >
              {DRILL_LIBRARY_VIEW_OPTIONS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setView(tab.value)}
                  aria-current={view === tab.value ? "page" : undefined}
                  className={`min-h-9 shrink-0 rounded-control px-4 text-xs font-semibold transition-colors ${
                    view === tab.value
                      ? "bg-[var(--module-accent)] text-white"
                      : "text-text-secondary hover:bg-app-background hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="min-w-0">
              <DrillFilterControl
                value={activeFilterIds}
                onChange={setActiveFilterIds}
                definitions={definitions}
                renderMobileTrigger={(filtersButton) => (
                  <MobileDirectoryControls>
                    <MobileViewSelector
                      value={view}
                      onChange={setView}
                      options={DRILL_LIBRARY_VIEW_OPTIONS}
                      ariaLabel="Change drill library view"
                    />
                    {filtersButton}
                  </MobileDirectoryControls>
                )}
              />
            </div>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            title="No drills found"
            description="Try a different search term, view, or filter."
          />
        ) : (
          <ViewChrome
            contextHeader={
              <ViewContextHeader
                eyebrow="Practice"
                title="Drill Library"
                subtitle={`${sortedItems.length} ${sortedItems.length === 1 ? "drill" : "drills"}`}
              />
            }
            saveStatus="idle"
            actionButtons={null}
          >
            <div className="min-w-0" data-drill-library-table="">
            {/* Desktop / tablet table */}
            <div className={`${BOARD.section} max-md:hidden`}>
              <RecruitingTableSectionBar title="Drills" count={sortedItems.length} />
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[80rem] table-fixed border-collapse text-left">
                  <colgroup>
                    <col style={{ width: DRILL_TABLE_COLUMNS.drill }} />
                    <col style={{ width: DRILL_TABLE_COLUMNS.category }} />
                    <col style={{ width: DRILL_TABLE_COLUMNS.focus }} />
                    <col style={{ width: DRILL_TABLE_COLUMNS.players }} />
                    <col style={{ width: DRILL_TABLE_COLUMNS.competitive }} />
                    <col style={{ width: DRILL_TABLE_COLUMNS.lastUsed }} />
                    <col style={{ width: DRILL_TABLE_COLUMNS.timesUsed }} />
                    <col style={{ width: DRILL_TABLE_COLUMNS.actions }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <RecruitingHeaderLabel
                        label="Drill"
                        sortDirection={sortDir("name")}
                        onSort={() => toggleSort("name")}
                      />
                      <RecruitingHeaderLabel
                        label="Category"
                        sortDirection={sortDir("category")}
                        onSort={() => toggleSort("category")}
                      />
                      <RecruitingHeaderLabel label="Focus" />
                      <RecruitingHeaderLabel
                        label="Players"
                        sortDirection={sortDir("players")}
                        onSort={() => toggleSort("players")}
                      />
                      <RecruitingHeaderLabel
                        label="Competitive"
                        sortDirection={sortDir("competitive")}
                        onSort={() => toggleSort("competitive")}
                      />
                      <RecruitingHeaderLabel
                        label="Last Used"
                        sortDirection={sortDir("lastUsed")}
                        onSort={() => toggleSort("lastUsed")}
                      />
                      <RecruitingHeaderLabel
                        label="Times Used"
                        align="right"
                        sortDirection={sortDir("timesUsed")}
                        onSort={() => toggleSort("timesUsed")}
                      />
                      <RecruitingHeaderLabel label="Edit" align="center" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => handleRowClick(row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openDrillDrawer(row);
                          }
                        }}
                        tabIndex={0}
                        className={`cursor-pointer ${BOARD.rowHover}`}
                      >
                        <td className={`${BOARD.td} px-3 py-2`}>
                          <div className="min-w-0">
                            <span className={`block truncate ${TEAM_DIRECTORY_NAME}`}>{row.name}</span>
                            {row.description ? (
                              <span className={`mt-1 block truncate text-[12px] leading-snug ${TEAM_DIRECTORY_META}`}>
                                {row.description}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className={`${BOARD.td} ${TEAM_DIRECTORY_META}`}>
                          {directoryCellValue(row.category || "Uncategorized")}
                        </td>
                        <td className={`${BOARD.td} ${TEAM_DIRECTORY_META}`}>
                          <span className="line-clamp-2" title={row.focus || undefined}>
                            {directoryCellValue(row.focus)}
                          </span>
                        </td>
                        <td className={`${BOARD.td} ${TEAM_DIRECTORY_META}`}>
                          {directoryCellValue(row.players)}
                        </td>
                        <td className={`${BOARD.td} ${TEAM_DIRECTORY_META}`}>
                          {row.competitive ? "Yes" : "No"}
                        </td>
                        <td className={`${BOARD.td} ${TEAM_DIRECTORY_META}`}>
                          {formatDrillLastUsed(row.lastUsed)}
                        </td>
                        <td className={`${BOARD.td} ${BOARD.metric}`}>
                          {row.timesUsed}
                        </td>
                        <td
                          className={`${BOARD.td} text-center`}
                          onClick={stopRowNavigation}
                          onMouseDown={stopRowNavigation}
                        >
                          <button
                            type="button"
                            aria-label={`Edit ${row.name}`}
                            title="Open edit panel"
                            onClick={(event) => {
                              stopRowNavigation(event);
                              openDrillDrawer(row);
                            }}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-control border border-[var(--module-accent)]/20 bg-[var(--module-tint)] px-2.5 text-[11px] font-semibold text-[var(--module-accent)] transition-colors hover:border-[var(--module-accent)]/35 hover:bg-[var(--module-tint)]/70"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile compact list */}
            <div className="overflow-hidden rounded-card border border-black/[0.06] bg-surface md:hidden">
              <RecruitingTableSectionBar title="Drills" count={sortedItems.length} />
              <ul className="divide-y divide-black/[0.06]">
                {sortedItems.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => openDrillDrawer(row)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-3 text-left hover:bg-black/[0.015]"
                      aria-label={`Open ${row.name}`}
                    >
                      <div className="min-w-0">
                        <span className={`block truncate ${TEAM_DIRECTORY_NAME}`}>{row.name}</span>
                        <span className={`mt-1 block truncate text-[12px] ${TEAM_DIRECTORY_META}`}>
                          {directoryCellValue(row.category || "Uncategorized")}
                          {" · "}
                          {row.competitive ? "Competitive" : "Non-competitive"}
                        </span>
                      </div>
                      <span className={`self-center text-[12px] tabular-nums ${TEAM_DIRECTORY_META}`}>
                        {row.timesUsed > 0 ? `${row.timesUsed}×` : TEAM_DIRECTORY_EMPTY}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            </div>
          </ViewChrome>
        )}
      </MobileDirectorySearchRegion>
    </div>
  );
}

function DrillDetailForm({
  drill,
  onCancel,
  onSaved,
}: {
  drill: DrillLibraryRow | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const isCreate = drill == null;

  function save(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      const result = isCreate
        ? await createPracticeDrillAction(formData)
        : await updatePracticeDrillAction(formData);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      onSaved();
    });
  }

  return (
    <form action={save} className="flex min-h-full flex-col">
      {!isCreate ? <input type="hidden" name="id" value={drill.id} /> : null}
      <div className="grid flex-1 content-start gap-4 p-5">
        <div className="rounded-card border border-[var(--module-accent)]/15 bg-[var(--module-tint)]/25 p-4">
          <p className="text-[10px] font-bold tracking-wider text-[var(--module-accent)] uppercase">
            {isCreate ? "New drill" : "Drill detail"}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-primary">
            {isCreate
              ? "Add a reusable drill to the Practice library."
              : "Scan details here, then edit fields and save."}
          </p>
        </div>

        <Field label="Drill name">
          <input name="name" required defaultValue={drill?.name ?? ""} className={inputClass} />
        </Field>
        <Field label="Category">
          <input
            name="category"
            defaultValue={drill?.category ?? ""}
            placeholder="Drills or Games"
            className={inputClass}
          />
        </Field>
        <Field label="Focus">
          <input
            name="tags"
            defaultValue={drill?.tags.join(", ") ?? ""}
            placeholder="Serve, Forehand, Volley"
            className={inputClass}
          />
          <span className="text-[10px] font-normal text-text-secondary">
            Separate multiple focus tags with commas.
          </span>
        </Field>
        <Field label="Objective">
          <textarea
            name="description"
            rows={3}
            defaultValue={drill?.description ?? ""}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <ReadOnlyField label="Setup" value={TEAM_DIRECTORY_EMPTY} />
          <ReadOnlyField label="Players" value={directoryCellValue(drill?.players)} />
          <ReadOnlyField label="Scoring" value={TEAM_DIRECTORY_EMPTY} />
          <ReadOnlyField
            label="Competitive"
            value={drill ? (drill.competitive ? "Yes" : "No") : "No (set category to Games)"}
          />
        </div>

        <Field label="Instructions / Notes">
          <textarea name="notes" rows={4} defaultValue={drill?.notes ?? ""} className={inputClass} />
        </Field>
        <Field label="Frequency">
          <input name="frequency" defaultValue={drill?.frequency ?? ""} className={inputClass} />
        </Field>

        {!isCreate ? (
          <div className="grid grid-cols-2 gap-3 rounded-card border border-border bg-app-background/60 p-3">
            <ReadOnlyField label="Times Used" value={String(drill.timesUsed)} />
            <ReadOnlyField label="Last Used" value={formatDrillLastUsed(drill.lastUsed)} />
          </div>
        ) : null}

        {message ? (
          <p className="rounded-control bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {message}
          </p>
        ) : null}
      </div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-surface p-4">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-semibold hover:bg-app-background"
        >
          Cancel
        </button>
        <button
          disabled={pending}
          className="h-10 rounded-control bg-[var(--module-accent)] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
        >
          {pending ? "Saving…" : isCreate ? "Add Drill" : "Save Drill"}
        </button>
      </div>
    </form>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-[10px] font-bold tracking-wide text-text-secondary uppercase">{label}</span>
      <span className={`text-sm ${TEAM_DIRECTORY_META}`}>{value}</span>
    </div>
  );
}

const inputClass =
  "w-full rounded-control border border-border bg-surface px-3 py-2.5 text-[16px] outline-none focus:border-[var(--module-accent)] focus:ring-2 focus:ring-[var(--module-tint)] md:text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-text-primary">
      <span>{label}</span>
      {children}
    </label>
  );
}
