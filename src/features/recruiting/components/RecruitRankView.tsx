"use client";

import { GripVertical } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";

import type { SortDirection } from "@/components/data-table/types";
import ViewChrome, { ViewContextHeader } from "@/components/view-chrome";
import { getDisplayName } from "@/features/people/utils";

import { parseDirectCoachRank } from "../coachRank";
import {
  availableRecruitClassYears,
  resolveRankClassYearFromFilters,
} from "../coachRank/classYear";
import type { RecruitDirectoryRow } from "../directory";
import {
  readStoredRecruitingRankClassYear,
  subscribeRecruitingRankClassYear,
  writeStoredRecruitingRankClassYear,
} from "../directorySessionState";
import {
  compareUnrankedRows,
  type UnrankedSortKey,
} from "../rankViewSort";
import { useRecruitDirectoryInlineEdit } from "../useRecruitDirectoryInlineEdit";
import { useRecruitingFoundSetActions } from "../useRecruitingFoundSetActions";
import {
  RECRUITING_TABLE,
  RECRUITING_TABLE_COLUMNS,
  rankBoardClassContextLabel,
} from "./recruitingTableChrome";
import {
  RecruitingHeaderLabel,
  RecruitingIdentityCell,
  RecruitingSharedDataCells,
  RecruitingTableColgroup,
  RecruitingTableSectionBar,
  classYearSelectOptions,
} from "./RecruitingTableShared";
import { useRankedBoardDrag } from "./useRankedBoardDrag";

/** @deprecated Use RECRUITING_TABLE_COLUMNS from recruitingTableChrome. */
export { RECRUIT_RANK_COLUMNS } from "./recruitingTableChrome";

const BOARD = RECRUITING_TABLE;
const UNRANKED_PREVIEW = 12;
/** Keep in sync with `RECRUITING_TABLE.th` (`h-9`). */
const RANKED_THEAD_HEIGHT = 36;

type DropSlot = {
  section: "ranked" | "unranked";
  top: number;
  height: number;
  rank: number | null;
};

function RankDropSlot({
  slot,
  empty,
}: {
  slot: DropSlot;
  empty?: boolean;
}) {
  const top = empty ? 0 : RANKED_THEAD_HEIGHT + slot.top;
  return (
    <div
      aria-hidden="true"
      data-rank-drop-slot={slot.section}
      className="pointer-events-none absolute inset-x-0 z-[20]"
      style={{ top, height: slot.height }}
    >
      <div className="h-[2px] w-full bg-[var(--module-accent)]" />
      <div className="flex h-[54px] items-center bg-[var(--module-tint)]/60">
        {slot.rank !== null ? (
          <>
            <span style={{ width: RECRUITING_TABLE_COLUMNS.handle }} />
            <span className={BOARD.rankValue}>#{slot.rank}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

type BoardSortState = {
  key: UnrankedSortKey;
  direction: SortDirection;
};

function DragHandlePlaceholder() {
  return (
    <span
      className="inline-flex h-7 w-5 items-center justify-center text-text-secondary/35"
      aria-hidden="true"
    >
      <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
    </span>
  );
}

function RankedDragHandle({
  disabled,
  dragging,
  onPointerDown,
}: {
  disabled: boolean;
  dragging: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder Coach Rank"
      disabled={disabled}
      onPointerDown={onPointerDown}
      className={`flex h-full w-full items-center justify-center text-text-secondary/35 touch-none hover:text-text-secondary/65 disabled:cursor-default disabled:hover:text-text-secondary/35 ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

/**
 * ONE shared header for Ranked and Unranked.
 * Sorting only reorders Unranked rows; Ranked stays Coach Rank order.
 */
function RecruitRankHeader({
  sort,
  onSort,
}: {
  sort: BoardSortState;
  onSort: (key: UnrankedSortKey) => void;
}) {
  function sortDir(key: UnrankedSortKey): SortDirection | null {
    return sort.key === key ? sort.direction : null;
  }

  return (
    <thead>
      <tr>
        <th scope="col" className={BOARD.th} aria-label="Handle" />
        <RecruitingHeaderLabel label="Rank" />
        <RecruitingHeaderLabel label="Recruit" />
        <RecruitingHeaderLabel
          label="Class"
          sortDirection={sortDir("classYear")}
          onSort={() => onSort("classYear")}
        />
        <RecruitingHeaderLabel
          label="Pipeline"
          sortDirection={sortDir("pipeline")}
          onSort={() => onSort("pipeline")}
        />
        <RecruitingHeaderLabel
          label="Priority"
          sortDirection={sortDir("priority")}
          onSort={() => onSort("priority")}
        />
        <RecruitingHeaderLabel
          label="Interest"
          sortDirection={sortDir("interest")}
          onSort={() => onSort("interest")}
        />
        <RecruitingHeaderLabel
          label="Outcome"
          sortDirection={sortDir("outcome")}
          onSort={() => onSort("outcome")}
        />
        <RecruitingHeaderLabel
          label="UTR"
          align="right"
          sortDirection={sortDir("utr")}
          onSort={() => onSort("utr")}
        />
        <RecruitingHeaderLabel
          label="TRN"
          align="right"
          sortDirection={sortDir("trn")}
          onSort={() => onSort("trn")}
        />
        <RecruitingHeaderLabel
          label="WTN"
          align="right"
          sortDirection={sortDir("wtn")}
          onSort={() => onSort("wtn")}
        />
        <th scope="col" className={`${BOARD.th} text-center`} aria-label="Rank action" />
        <RecruitingHeaderLabel label="Actions" align="center" />
      </tr>
    </thead>
  );
}

function DirectCoachRankInput({
  currentRank,
  rankedCount,
  onMove,
  onClose,
}: {
  currentRank: number;
  rankedCount: number;
  onMove: (toRank: number) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(String(currentRank));
  const inputRef = useRef<HTMLInputElement>(null);
  const ignoreBlurRef = useRef(false);
  const closedRef = useRef(false);

  function apply(raw: string, reason: "enter" | "blur") {
    if (closedRef.current) return true;
    const parsed = parseDirectCoachRank(raw, currentRank, rankedCount);
    if (parsed.status === "invalid") {
      if (reason === "blur") {
        closedRef.current = true;
        onClose();
        return true;
      }
      requestAnimationFrame(() => inputRef.current?.select());
      return false;
    }
    closedRef.current = true;
    if (parsed.status === "move") {
      onMove(parsed.toRank);
    }
    onClose();
    return true;
  }

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    node.select();
  }, []);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const closed = apply(draft, "enter");
      if (closed) ignoreBlurRef.current = true;
    } else if (event.key === "Escape") {
      event.preventDefault();
      ignoreBlurRef.current = true;
      closedRef.current = true;
      onClose();
    }
  }

  function handleBlur() {
    if (ignoreBlurRef.current) {
      ignoreBlurRef.current = false;
      return;
    }
    apply(draft, "blur");
  }

  return (
    <input
      ref={inputRef}
      aria-label="Coach Rank"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="box-border h-[22px] w-full min-w-0 border border-[var(--module-accent)] bg-surface px-0.5 text-[17px] font-bold leading-none tracking-tight tabular-nums text-text-primary outline-none"
    />
  );
}

function CoachRankValue({
  displayRank,
  currentRank,
  rankedCount,
  editing,
  disabled,
  onStartEdit,
  onMove,
  onClose,
}: {
  displayRank: number | null;
  currentRank: number | null;
  rankedCount: number;
  editing: boolean;
  disabled: boolean;
  onStartEdit: () => void;
  onMove: (toRank: number) => void;
  onClose: () => void;
}) {
  if (displayRank === null) {
    return <span className={BOARD.rankValue}>{"\u00A0"}</span>;
  }

  if (editing && currentRank !== null) {
    return (
      <DirectCoachRankInput
        currentRank={currentRank}
        rankedCount={rankedCount}
        onMove={onMove}
        onClose={onClose}
      />
    );
  }

  if (currentRank === null) {
    return <span className={BOARD.rankValue}>#{displayRank}</span>;
  }

  return (
    <button
      type="button"
      aria-label={`Edit Coach Rank ${displayRank}`}
      disabled={disabled}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (disabled) return;
        onStartEdit();
      }}
      className={`${BOARD.rankValue} w-full cursor-text border-0 bg-transparent p-0 text-left disabled:cursor-text`}
    >
      #{displayRank}
    </button>
  );
}

function RecruitRankRow({
  row,
  coachRank,
  rankAction,
  classOptions,
  isEditing,
  fieldError,
  startEdit,
  cancelEdit,
  commit,
  dragHandle,
  isDragging,
  dragSession,
  shiftY,
  rankCell,
}: {
  row: RecruitDirectoryRow;
  coachRank: number | null;
  rankAction: ReactNode;
  classOptions: { value: string; label: string }[];
  isEditing: ReturnType<typeof useRecruitDirectoryInlineEdit>["isEditing"];
  fieldError: string | undefined;
  startEdit: ReturnType<typeof useRecruitDirectoryInlineEdit>["startEdit"];
  cancelEdit: ReturnType<typeof useRecruitDirectoryInlineEdit>["cancelEdit"];
  commit: ReturnType<typeof useRecruitDirectoryInlineEdit>["commit"];
  dragHandle?: ReactNode;
  isDragging?: boolean;
  dragSession?: boolean;
  shiftY?: number;
  rankCell?: ReactNode;
}) {
  const edit = { isEditing, fieldError, startEdit, cancelEdit, commit };
  const shift = shiftY ?? 0;

  return (
    <tr
      style={{
        ["--rank-shift" as string]: `${shift}px`,
        transform: dragSession ? `translateY(${shift}px)` : undefined,
        transition: isDragging
          ? "none"
          : dragSession
            ? "transform 150ms ease-out"
            : undefined,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 8 : undefined,
      }}
      className={`${BOARD.rowHover} last:[&>td]:border-b-0${
        isDragging
          ? " opacity-55 [&>td]:bg-surface [&>td]:shadow-[0_1px_3px_rgba(17,24,39,0.08)]"
          : ""
      }${dragSession ? " [&>td]:[transform:translateY(var(--rank-shift,0px))]" : ""}`}
    >
      <td className={`${BOARD.td} ${dragHandle ? "!p-0" : "pr-0 pl-1.5"}`}>
        {dragHandle ?? <DragHandlePlaceholder />}
      </td>
      <td className={`${BOARD.td} pr-1`}>
        {rankCell ?? (
          <span className={BOARD.rankValue}>
            {coachRank !== null ? `#${coachRank}` : "\u00A0"}
          </span>
        )}
      </td>
      <td className={BOARD.td}>
        <RecruitingIdentityCell row={row} />
      </td>
      <RecruitingSharedDataCells
        row={row}
        classOptions={classOptions}
        edit={edit}
        rankAction={rankAction}
      />
    </tr>
  );
}

function RankActionButton({
  row,
  variant,
  busy,
  disabled,
  onClick,
}: {
  row: RecruitDirectoryRow;
  variant: "add" | "remove";
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const name = getDisplayName(row.person);
  const isRemove = variant === "remove";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={isRemove ? BOARD.removeActionButton : BOARD.actionButton}
      aria-label={
        isRemove ? `Remove ${name} from ranked` : `Add ${name} to ranked`
      }
    >
      {busy ? "…" : isRemove ? "- Rank" : "+ Rank"}
    </button>
  );
}

function RecruitRankSection({
  title,
  count,
  sectionKey,
  empty,
  sort,
  onSort,
  children,
  footer,
  tbodyRef,
  sectionRef,
  dragging,
  dropActive,
  dropSlot,
}: {
  title: string;
  count: number;
  sectionKey: "ranked" | "unranked";
  empty: string;
  sort: BoardSortState;
  onSort: (key: UnrankedSortKey) => void;
  children: ReactNode;
  footer?: ReactNode;
  tbodyRef?: Ref<HTMLTableSectionElement>;
  sectionRef?: Ref<HTMLElement>;
  dragging?: boolean;
  dropActive?: boolean;
  dropSlot?: DropSlot | null;
}) {
  const showSlot = dropSlot?.section === sectionKey;
  return (
    <section
      ref={sectionRef}
      className={`${BOARD.section}${dragging ? " !overflow-visible" : ""}${
        dropActive ? " ring-2 ring-[var(--module-accent)]/40" : ""
      }`}
      data-rank-section={sectionKey}
    >
      <RecruitingTableSectionBar title={title} count={count} />
      {count > 0 ? (
        <>
          <div className="relative">
            <table
              className={`${BOARD.table}${
                dragging ? " select-none border-separate border-spacing-0" : ""
              }`}
              data-rank-table={sectionKey}
            >
              <RecruitingTableColgroup />
              <RecruitRankHeader sort={sort} onSort={onSort} />
              <tbody ref={tbodyRef}>{children}</tbody>
            </table>
            {showSlot && dropSlot ? <RankDropSlot slot={dropSlot} /> : null}
          </div>
          {footer}
        </>
      ) : (
        <div
          className={`relative px-3 py-7 text-sm text-text-secondary${
            dropActive ? " bg-[var(--module-tint)]/50" : ""
          }`}
        >
          {empty}
          {showSlot && dropSlot ? <RankDropSlot slot={dropSlot} empty /> : null}
        </div>
      )}
    </section>
  );
}

export default function RecruitRankView({
  rows,
  filteredRows,
  activeFilterIds,
  onCohortChange,
}: {
  rows: RecruitDirectoryRow[];
  filteredRows: RecruitDirectoryRow[];
  activeFilterIds: readonly string[];
  onCohortChange: (rows: RecruitDirectoryRow[]) => void;
}) {
  const filterResolution = resolveRankClassYearFromFilters(activeFilterIds);
  const storedYear = useSyncExternalStore(
    subscribeRecruitingRankClassYear,
    readStoredRecruitingRankClassYear,
    () => null,
  );
  const [error, setError] = useState<string | undefined>();
  const [editingRankPersonId, setEditingRankPersonId] = useState<string | null>(null);
  const [unrankedExpandKey, setUnrankedExpandKey] = useState<string | null>(null);
  const [boardSort, setBoardSort] = useState<BoardSortState>({
    key: "utr",
    direction: "desc",
  });
  const {
    isEditing,
    startEdit,
    cancelEdit,
    commit,
    fieldError,
    saveStatus,
    saveError,
  } = useRecruitDirectoryInlineEdit({
    cohort: rows,
    onCohortChange,
  });

  const classYear =
    filterResolution.status === "ready" ? filterResolution.classYear : storedYear;

  const availableYears = useMemo(() => availableRecruitClassYears(rows), [rows]);
  const classOptions = useMemo(
    () => classYearSelectOptions(availableYears),
    [availableYears],
  );
  const filterContextLabel = rankBoardClassContextLabel(activeFilterIds);
  const { foundSetFeedback, actionButtons } = useRecruitingFoundSetActions(filteredRows);

  const classRows = useMemo(() => {
    if (classYear === null) return [];
    return rows.filter((row) => row.profile.recruitClassYear === classYear);
  }, [rows, classYear]);

  const visibleIds = useMemo(
    () => new Set(filteredRows.map((row) => row.person.id)),
    [filteredRows],
  );

  const ranked = useMemo(() => {
    return classRows
      .filter((row) => row.profile.coachRank !== undefined)
      .filter((row) => visibleIds.has(row.person.id))
      .sort((a, b) => (a.profile.coachRank as number) - (b.profile.coachRank as number));
  }, [classRows, visibleIds]);

  const unranked = useMemo(() => {
    return classRows
      .filter((row) => row.profile.coachRank === undefined)
      .filter((row) => visibleIds.has(row.person.id))
      .slice()
      .sort((a, b) =>
        compareUnrankedRows(a, b, boardSort.key, boardSort.direction),
      );
  }, [classRows, visibleIds, boardSort]);

  const rankedDrag = useRankedBoardDrag({
    classYear: classYear ?? 0,
    ranked,
    classRows,
    cohort: rows,
    addPending: false,
    onCohortChange,
    onError: setError,
  });

  const unrankedBoardKey = [
    classYear ?? "none",
    boardSort.key,
    boardSort.direction,
    activeFilterIds.join("|"),
  ].join(":");
  const unrankedExpanded = unrankedExpandKey === unrankedBoardKey;

  const visibleUnranked = unrankedExpanded
    ? unranked
    : unranked.slice(0, UNRANKED_PREVIEW);
  const hiddenUnrankedCount = Math.max(unranked.length - UNRANKED_PREVIEW, 0);

  function selectYear(year: number) {
    writeStoredRecruitingRankClassYear(year);
    setError(undefined);
  }

  function toggleBoardSort(key: UnrankedSortKey) {
    setBoardSort((current) => {
      if (current.key !== key) {
        const direction: SortDirection =
          key === "classYear" ||
          key === "pipeline" ||
          key === "priority" ||
          key === "interest" ||
          key === "outcome"
            ? "asc"
            : "desc";
        return { key, direction };
      }
      return {
        key,
        direction: current.direction === "desc" ? "asc" : "desc",
      };
    });
  }

  function handleAddToRanked(personId: string) {
    if (classYear === null) return;
    if (rankedDrag.dragging || rankedDrag.persistPending) return;
    setError(undefined);
    rankedDrag.rankPerson(personId);
  }

  const heading = (
    <ViewContextHeader
      eyebrow="Coach Rank"
      title="Recruiting Board"
      subtitle={classYear !== null ? `${classYear} Class` : filterContextLabel}
    />
  );

  if (classYear === null) {
    const reason =
      filterResolution.status === "choose" ? filterResolution.reason : "none";
    const message =
      reason === "multiple"
        ? "Multiple class years are filtered. Choose one class board to rank — rankings are never combined across years."
        : reason === "none_year"
          ? "Recruits without a class year cannot be ranked. Choose a recruiting class."
          : "Choose a recruiting class to manage Coach Rank. Each class year has its own board.";

    return (
      <div className="rounded-card border border-black/[0.06] bg-surface px-6 py-8">
        {heading}
        <p className="mt-4 max-w-xl text-sm text-text-secondary">{message}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {availableYears.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => selectYear(year)}
              className="inline-flex h-10 items-center rounded-control bg-surface px-4 text-sm font-medium text-text-primary ring-1 ring-black/[0.06] transition-colors hover:bg-[var(--module-tint)]/50 hover:text-[var(--module-accent)]"
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ViewChrome
      contextHeader={heading}
      foundSetFeedback={foundSetFeedback}
      saveStatus={saveStatus}
      saveError={saveError}
      actionButtons={actionButtons}
      error={
        error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : undefined
      }
    >
      <div className="flex min-w-0 flex-col gap-3">
      <RecruitRankSection
        title="Ranked"
        count={ranked.length}
        sectionKey="ranked"
        empty="No ranked recruits yet. Add someone from Unranked to start the board."
        sort={boardSort}
        onSort={toggleBoardSort}
        tbodyRef={rankedDrag.tbodyRef}
        sectionRef={rankedDrag.rankedSectionRef}
        dragging={rankedDrag.dragging}
        dropActive={rankedDrag.dragSource === "unranked" && rankedDrag.dropZone === "ranked"}
        dropSlot={rankedDrag.dropSlot}
      >
        {rankedDrag.displayRanked.map((row, index) => {
          const previewRank = rankedDrag.previewRankById?.get(row.person.id);
          const leavingBoard =
            rankedDrag.draggedPersonId === row.person.id && rankedDrag.dropZone === "unranked";
          const busy = rankedDrag.persistPending;
          // Visible board densifies 1…N (no gaps). Master class order still
          // densifies separately on persist via applyCoachRanksToCohort.
          const displayRank = leavingBoard ? null : (previewRank ?? index + 1);
          const rankEditDisabled =
            rankedDrag.dragging || rankedDrag.persistPending;
          return (
            <RecruitRankRow
              key={row.person.id}
              row={row}
              coachRank={displayRank}
              rankCell={
                <CoachRankValue
                  displayRank={displayRank}
                  currentRank={displayRank}
                  rankedCount={ranked.length}
                  editing={
                    editingRankPersonId === row.person.id && !rankedDrag.dragging
                  }
                  disabled={rankEditDisabled}
                  onStartEdit={() => setEditingRankPersonId(row.person.id)}
                  onMove={(toRank) => rankedDrag.movePersonToRank(row.person.id, toRank)}
                  onClose={() => setEditingRankPersonId(null)}
                />
              }
              rankAction={
                <RankActionButton
                  row={row}
                  variant="remove"
                  busy={busy}
                  disabled={rankedDrag.dragging || rankedDrag.persistPending}
                  onClick={() => rankedDrag.unrankPerson(row.person.id)}
                />
              }
              classOptions={classOptions}
              isEditing={isEditing}
              fieldError={fieldError}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              commit={commit}
              isDragging={rankedDrag.draggedPersonId === row.person.id}
              dragSession={rankedDrag.dragging}
              shiftY={rankedDrag.shiftYByPersonId.get(row.person.id)}
              dragHandle={
                <RankedDragHandle
                  disabled={rankedDrag.persistPending}
                  dragging={rankedDrag.draggedPersonId === row.person.id}
                  onPointerDown={(event) => {
                    setEditingRankPersonId(null);
                    rankedDrag.onHandlePointerDown(event, row.person.id, "ranked");
                  }}
                />
              }
            />
          );
        })}
      </RecruitRankSection>

      <RecruitRankSection
        title="Unranked"
        count={unranked.length}
        sectionKey="unranked"
        empty="Every visible recruit in this class is ranked."
        sort={boardSort}
        onSort={toggleBoardSort}
        sectionRef={rankedDrag.unrankedSectionRef}
        dragging={rankedDrag.dragging}
        dropActive={rankedDrag.dragSource === "ranked" && rankedDrag.dropZone === "unranked"}
        dropSlot={rankedDrag.dropSlot}
        footer={
          <>
            {!unrankedExpanded && hiddenUnrankedCount > 0 ? (
              <div className="border-t border-black/[0.06] px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setUnrankedExpandKey(unrankedBoardKey)}
                  className="text-[12px] font-medium text-text-secondary transition-colors hover:text-[var(--module-accent)]"
                >
                  Show {hiddenUnrankedCount} more unranked ↓
                </button>
              </div>
            ) : null}
            {unrankedExpanded && unranked.length > UNRANKED_PREVIEW ? (
              <div className="border-t border-black/[0.06] px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setUnrankedExpandKey(null)}
                  className="text-[12px] font-medium text-text-secondary transition-colors hover:text-[var(--module-accent)]"
                >
                  Show fewer ↑
                </button>
              </div>
            ) : null}
          </>
        }
      >
        {visibleUnranked.map((row) => {
          const busy = rankedDrag.persistPending;
          const previewRank = rankedDrag.previewRankById?.get(row.person.id);
          return (
            <RecruitRankRow
              key={row.person.id}
              row={row}
              coachRank={previewRank ?? null}
              rankAction={
                <RankActionButton
                  row={row}
                  variant="add"
                  busy={busy}
                  disabled={rankedDrag.dragging || rankedDrag.persistPending}
                  onClick={() => handleAddToRanked(row.person.id)}
                />
              }
              classOptions={classOptions}
              isEditing={isEditing}
              fieldError={fieldError}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              commit={commit}
              isDragging={rankedDrag.draggedPersonId === row.person.id}
              dragSession={rankedDrag.dragging}
              shiftY={
                rankedDrag.dragSource === "ranked" && rankedDrag.dropZone === "unranked"
                  ? (rankedDrag.dropSlot?.height ?? 56)
                  : rankedDrag.shiftYByPersonId.get(row.person.id)
              }
              dragHandle={
                <RankedDragHandle
                  disabled={rankedDrag.persistPending}
                  dragging={rankedDrag.draggedPersonId === row.person.id}
                  onPointerDown={(event) => {
                    setEditingRankPersonId(null);
                    rankedDrag.onHandlePointerDown(event, row.person.id, "unranked");
                  }}
                />
              }
            />
          );
        })}
      </RecruitRankSection>
      </div>
    </ViewChrome>
  );
}
