"use client";

import { Pencil, Plus, Tag, X } from "lucide-react";
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
import ViewChrome from "@/components/view-chrome";
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
  focus: 308,
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
  const availableTags = useMemo(
    () => [...new Set(rows.flatMap((row) => row.focusTags))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );
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
            availableTags={availableTags}
            onCancel={closeDrawer}
            onSaved={() => {
              closeDrawer();
              router.refresh();
            }}
          />
        ),
      });
    },
    [availableTags, closeDrawer, openDrawer, router],
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
      <MobileDirectorySearchRegion
        toolbar={
          <div className="grid min-w-0 gap-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0 flex-1">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by name, description, category, or tag"
                  aria-label="Search drills"
                />
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
            contextHeader={null}
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
                      <RecruitingHeaderLabel label="Tags" />
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
                        <td className={BOARD.td}>
                          <DrillTags tags={row.focusTags} />
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
                        {row.focusTags.length > 0 ? (
                          <div className="mt-2">
                            <DrillTags tags={row.focusTags} compact />
                          </div>
                        ) : null}
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
  availableTags,
  onCancel,
  onSaved,
}: {
  drill: DrillLibraryRow | null;
  availableTags: string[];
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
        <Field label="Tags">
          <DrillTagInput initialTags={drill?.tags ?? []} suggestions={availableTags} />
          <span className="text-[10px] font-normal text-text-secondary">
            Choose suggested tags or type a new one. Press Enter or comma to add it.
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

function DrillTags({ tags, compact = false }: { tags: string[]; compact?: boolean }) {
  if (tags.length === 0) {
    return <span className={TEAM_DIRECTORY_META}>{TEAM_DIRECTORY_EMPTY}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1" aria-label={`Tags: ${tags.join(", ")}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          data-drill-tag={tag}
          className={`inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--module-accent)]/20 bg-[var(--module-tint)] font-semibold text-[var(--module-accent)] ${
            compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"
          }`}
          title={tag}
        >
          <Tag className={compact ? "h-2.5 w-2.5 shrink-0" : "h-3 w-3 shrink-0"} />
          <span className="truncate">{tag}</span>
        </span>
      ))}
    </div>
  );
}

function DrillTagInput({ initialTags, suggestions }: { initialTags: string[]; suggestions: string[] }) {
  const [tags, setTags] = useState(() => [...new Set(initialTags.map((tag) => tag.trim()).filter(Boolean))]);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const normalizedTags = new Set(tags.map((tag) => tag.toLocaleLowerCase()));
  const matchingSuggestions = suggestions
    .filter((tag) => !normalizedTags.has(tag.toLocaleLowerCase()))
    .filter((tag) => !draft.trim() || tag.toLocaleLowerCase().includes(draft.trim().toLocaleLowerCase()))
    .slice(0, 8);

  function addTag(value: string) {
    const tag = value.trim().replace(/,+$/, "");
    if (!tag || normalizedTags.has(tag.toLocaleLowerCase())) {
      setDraft("");
      return;
    }
    setTags((current) => [...current, tag]);
    setDraft("");
  }

  return (
    <div className="relative">
      <input type="hidden" name="tags" value={tags.join(", ")} />
      <div
        className={`${inputClass} flex min-h-11 flex-wrap items-center gap-1.5 py-1.5`}
        onClick={(event) => event.currentTarget.querySelector("input")?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--module-accent)]/20 bg-[var(--module-tint)] px-2 py-1 text-[11px] font-semibold text-[var(--module-accent)]"
          >
            <Tag className="h-3 w-3" />
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => setTags((current) => current.filter((value) => value !== tag))}
              className="rounded-full p-0.5 hover:bg-[var(--module-accent)]/10"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => {
            const value = event.target.value;
            if (value.endsWith(",")) addTag(value);
            else setDraft(value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (draft.trim()) addTag(draft);
            } else if (event.key === "Backspace" && !draft && tags.length > 0) {
              setTags((current) => current.slice(0, -1));
            }
          }}
          placeholder={tags.length === 0 ? "Start typing a tag…" : "Add another…"}
          aria-label="Add tags"
          aria-autocomplete="list"
          className="min-w-[130px] flex-1 bg-transparent py-1 text-sm font-normal text-text-primary outline-none placeholder:text-text-secondary/70"
        />
      </div>
      {focused && matchingSuggestions.length > 0 ? (
        <div
          role="listbox"
          aria-label="Suggested tags"
          className="absolute z-20 mt-1 flex max-h-48 w-full flex-wrap gap-1.5 overflow-y-auto rounded-control border border-border bg-surface p-2 shadow-lg"
        >
          {matchingSuggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              role="option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addTag(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-app-background px-2.5 py-1.5 text-[11px] font-semibold text-text-primary hover:border-[var(--module-accent)]/30 hover:bg-[var(--module-tint)] hover:text-[var(--module-accent)]"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-control border border-border bg-surface px-3 py-2.5 text-[16px] font-normal outline-none focus:border-[var(--module-accent)] focus:ring-2 focus:ring-[var(--module-tint)] md:text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-text-primary">
      <span>{label}</span>
      {children}
    </label>
  );
}
