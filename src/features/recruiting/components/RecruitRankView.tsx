"use client";

import { ArrowDown, ArrowUp, ChevronDown, GripVertical } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import type { SortDirection } from "@/components/data-table/types";
import ViewChrome, { ViewContextHeader } from "@/components/view-chrome";
import {
  TEAM_DIRECTORY_EMPTY,
  TEAM_DIRECTORY_META,
} from "@/features/people/directoryHierarchy";
import { getDisplayName } from "@/features/people/utils";
import { EMPTY_VALUE, formatUtr } from "@/lib/formatting";

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
import {
  groupRankedRowsByTier,
  type TierSectionId,
} from "../tier";
import { useRecruitDirectoryInlineEdit } from "../useRecruitDirectoryInlineEdit";
import { useRecruitingFoundSetActions } from "../useRecruitingFoundSetActions";
import RecruitStatusBadge from "./RecruitStatusBadge";
import {
  RECRUITING_TABLE,
  rankBoardClassContextLabel,
} from "./recruitingTableChrome";
import {
  RecruitingHeaderLabel,
  RecruitingIdentityCell,
  RecruitingSharedDataCells,
  RecruitingTableColgroup,
  RecruitingTableSectionBar,
  RecruitingTierCell,
  classYearSelectOptions,
} from "./RecruitingTableShared";
import { pipelineTone } from "./statusPresentation";
import { useRankedBoardDrag } from "./useRankedBoardDrag";

/** @deprecated Use RECRUITING_TABLE_COLUMNS from recruitingTableChrome. */
export { RECRUIT_RANK_COLUMNS } from "./recruitingTableChrome";

const BOARD = RECRUITING_TABLE;
const UNRANKED_PREVIEW = 12;

type BoardSortState = {
  key: UnrankedSortKey;
  direction: SortDirection;
};

/** Practice Sequence drag handle (GripVertical + pointer capture handlers). */
function RankedDragHandle({
  name,
  disabled,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  name: string;
  disabled: boolean;
  dragging: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Drag ${name} to reorder`}
      disabled={disabled}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(event);
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        onPointerMove(event);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        onPointerUp(event);
      }}
      onPointerCancel={(event) => {
        event.stopPropagation();
        onPointerUp(event);
      }}
      onClick={(event) => event.stopPropagation()}
      className={`cursor-grab touch-none rounded p-1 text-[var(--module-accent)] active:cursor-grabbing disabled:cursor-default disabled:opacity-35 ${
        dragging ? "cursor-grabbing" : ""
      }`}
    >
      <GripVertical className="h-5 w-5" />
    </button>
  );
}

function DragHandlePlaceholder() {
  return (
    <span
      className="inline-flex items-center justify-center rounded p-1 text-text-secondary/35"
      aria-hidden="true"
    >
      <GripVertical className="h-5 w-5" />
    </span>
  );
}

/** Practice Sequence up/down controls. */
function BoardMoveButtons({
  name,
  disabled,
  canUp,
  canDown,
  onUp,
  onDown,
}: {
  name: string;
  disabled: boolean;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <span className="hidden items-center sm:flex">
      <button
        type="button"
        disabled={disabled || !canUp}
        onClick={(event) => {
          event.stopPropagation();
          onUp();
        }}
        aria-label={`Move ${name} up`}
        className="rounded p-1 text-[var(--module-accent)] disabled:opacity-25"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={disabled || !canDown}
        onClick={(event) => {
          event.stopPropagation();
          onDown();
        }}
        aria-label={`Move ${name} down`}
        className="rounded p-1 text-[var(--module-accent)] disabled:opacity-25"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
    </span>
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
        <RecruitingHeaderLabel label="Tier" />
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
  rankCell,
  boardAttrs,
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
  rankCell?: ReactNode;
  boardAttrs?: {
    personId: string;
    tierSection: string;
    sectionIndex: number;
  };
}) {
  const edit = { isEditing, fieldError, startEdit, cancelEdit, commit };

  return (
    <tr
      data-rank-board-item={boardAttrs ? "" : undefined}
      data-person-id={boardAttrs?.personId}
      data-tier-section={boardAttrs?.tierSection}
      data-section-index={
        boardAttrs ? String(boardAttrs.sectionIndex) : undefined
      }
      className={`${BOARD.rowHover} last:[&>td]:border-b-0${
        isDragging
          ? " opacity-55 [&>td]:bg-surface [&>td]:shadow-[0_1px_3px_rgba(17,24,39,0.08)]"
          : ""
      }`}
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
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
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
  dragging,
}: {
  title: string;
  count: number;
  sectionKey: "unranked";
  empty: string;
  sort: BoardSortState;
  onSort: (key: UnrankedSortKey) => void;
  children: ReactNode;
  footer?: ReactNode;
  dragging?: boolean;
}) {
  return (
    <section
      className={`${BOARD.section}${dragging ? " !overflow-visible" : ""}`}
      data-rank-section={sectionKey}
      data-tier-drop-zone="unranked"
    >
      <RecruitingTableSectionBar title={title} count={count} />
      {count > 0 ? (
        <>
          <div className="relative max-md:hidden">
            <table
              className={`${BOARD.table}${
                dragging ? " select-none border-separate border-spacing-0" : ""
              }`}
              data-rank-table={sectionKey}
            >
              <RecruitingTableColgroup />
              <RecruitRankHeader sort={sort} onSort={onSort} />
              <tbody>{children}</tbody>
            </table>
          </div>
          {footer}
        </>
      ) : (
        <div className="relative px-3 py-7 text-sm text-text-secondary">
          {empty}
        </div>
      )}
    </section>
  );
}

function TierSectionBar({
  title,
  count,
  expanded,
  onToggle,
  section,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  section: TierSectionId;
}) {
  const countLabel = `${count} Recruit${count === 1 ? "" : "s"}`;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      data-tier-drop-zone={expanded ? undefined : String(section)}
      className={`${BOARD.sectionBar} w-full cursor-pointer text-left transition-colors hover:bg-black/[0.015]`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-text-secondary/70 transition-transform ${
            expanded ? "" : "-rotate-90"
          }`}
          strokeWidth={2}
          aria-hidden="true"
        />
        <h3 className={BOARD.sectionLabel}>{title}</h3>
      </span>
      <span className={BOARD.sectionCount}>{countLabel}</span>
    </button>
  );
}

/**
 * Practice Sequence-style sortable card for one ranked recruit.
 * [handle] [rank] [name + info] [UTR] [Tier] [status/actions]
 */
function RankBoardSequenceCard({
  row,
  section,
  sectionIndex,
  visualIndex,
  visualCount,
  editingRankPersonId,
  setEditingRankPersonId,
  rankedCount,
  persistPending,
  dragging,
  draggedPersonId,
  reorderEnabled,
  isEditing,
  fieldError,
  startEdit,
  cancelEdit,
  commit,
  onUnrank,
  onMoveRank,
  onMoveInBoard,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
}: {
  row: RecruitDirectoryRow;
  section: TierSectionId;
  sectionIndex: number;
  visualIndex: number;
  visualCount: number;
  editingRankPersonId: string | null;
  setEditingRankPersonId: (id: string | null) => void;
  rankedCount: number;
  persistPending: boolean;
  dragging: boolean;
  draggedPersonId: string | null;
  reorderEnabled: boolean;
  isEditing: ReturnType<typeof useRecruitDirectoryInlineEdit>["isEditing"];
  fieldError: string | undefined;
  startEdit: ReturnType<typeof useRecruitDirectoryInlineEdit>["startEdit"];
  cancelEdit: ReturnType<typeof useRecruitDirectoryInlineEdit>["cancelEdit"];
  commit: ReturnType<typeof useRecruitDirectoryInlineEdit>["commit"];
  onUnrank: (personId: string) => void;
  onMoveRank: (personId: string, toRank: number) => void;
  onMoveInBoard: (personId: string, delta: -1 | 1) => void;
  onHandlePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    personId: string,
    source: "ranked" | "unranked",
  ) => void;
  onHandlePointerMove: (
    event: ReactPointerEvent<HTMLButtonElement>,
    personId: string,
  ) => void;
  onHandlePointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const name = getDisplayName(row.person);
  const displayRank = row.profile.coachRank ?? null;
  const utrDisplay = formatUtr(row.person.utr);
  const isDragging = draggedPersonId === row.person.id;
  const edit = { isEditing, fieldError, startEdit, cancelEdit, commit };

  return (
    <div
      data-rank-board-item=""
      data-person-id={row.person.id}
      data-tier-section={String(section)}
      data-section-index={String(sectionIndex)}
      className={`flex items-center gap-2 rounded-control border p-2.5 transition ${
        isDragging
          ? "scale-[1.01] border-[var(--module-accent)] bg-white shadow-lg"
          : "border-[color-mix(in_srgb,var(--module-accent)_35%,transparent)] bg-[var(--module-tint)]/55"
      }`}
    >
      {reorderEnabled ? (
        <RankedDragHandle
          name={name}
          disabled={persistPending}
          dragging={isDragging}
          onPointerDown={(event) => {
            setEditingRankPersonId(null);
            onHandlePointerDown(event, row.person.id, "ranked");
          }}
          onPointerMove={(event) =>
            onHandlePointerMove(event, row.person.id)
          }
          onPointerUp={onHandlePointerUp}
        />
      ) : (
        <DragHandlePlaceholder />
      )}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--module-accent)] text-xs font-bold text-white">
        {displayRank ?? "–"}
      </span>
      <Link
        href={`/recruiting/${row.person.id}`}
        className="min-w-0 flex-1"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="block truncate text-xs font-semibold text-text-primary">
          {name}
        </span>
        <span className={`mt-0.5 block truncate ${TEAM_DIRECTORY_META}`}>
          {row.profile.recruitClassYear ?? TEAM_DIRECTORY_EMPTY}
          {utrDisplay !== EMPTY_VALUE ? ` · UTR ${utrDisplay}` : ""}
        </span>
      </Link>
      <span className="hidden w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-text-primary sm:block">
        {utrDisplay === EMPTY_VALUE ? "—" : utrDisplay}
      </span>
      <div
        className="w-14 shrink-0"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <RecruitingTierCell row={row} edit={edit} />
      </div>
      <div className="hidden shrink-0 sm:block">
        <RecruitStatusBadge
          label={row.profile.pipelineStage?.label}
          tone={pipelineTone(row.profile.pipelineStage?.key)}
        />
      </div>
      {reorderEnabled ? (
        <BoardMoveButtons
          name={name}
          disabled={persistPending || dragging}
          canUp={visualIndex > 0}
          canDown={visualIndex < visualCount - 1}
          onUp={() => onMoveInBoard(row.person.id, -1)}
          onDown={() => onMoveInBoard(row.person.id, 1)}
        />
      ) : null}
      <div
        className="hidden w-10 shrink-0 sm:block"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <CoachRankValue
          displayRank={displayRank}
          currentRank={row.profile.coachRank ?? null}
          rankedCount={rankedCount}
          editing={editingRankPersonId === row.person.id && !dragging}
          disabled={persistPending || dragging}
          onStartEdit={() => setEditingRankPersonId(row.person.id)}
          onMove={(toRank) => onMoveRank(row.person.id, toRank)}
          onClose={() => setEditingRankPersonId(null)}
        />
      </div>
      <RankActionButton
        row={row}
        variant="remove"
        busy={persistPending}
        disabled={persistPending || dragging}
        onClick={() => onUnrank(row.person.id)}
      />
    </div>
  );
}

function RankedTierSection({
  section,
  title,
  rows,
  expanded,
  onToggle,
  rankedCount,
  visualIndexById,
  visualCount,
  editingRankPersonId,
  setEditingRankPersonId,
  isEditing,
  fieldError,
  startEdit,
  cancelEdit,
  commit,
  persistPending,
  onUnrank,
  onMoveRank,
  onMoveInBoard,
  dragging,
  draggedPersonId,
  hoverTarget,
  reorderEnabled,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
}: {
  section: TierSectionId;
  title: string;
  rows: RecruitDirectoryRow[];
  expanded: boolean;
  onToggle: () => void;
  rankedCount: number;
  visualIndexById: Map<string, number>;
  visualCount: number;
  editingRankPersonId: string | null;
  setEditingRankPersonId: (id: string | null) => void;
  isEditing: ReturnType<typeof useRecruitDirectoryInlineEdit>["isEditing"];
  fieldError: string | undefined;
  startEdit: ReturnType<typeof useRecruitDirectoryInlineEdit>["startEdit"];
  cancelEdit: ReturnType<typeof useRecruitDirectoryInlineEdit>["cancelEdit"];
  commit: ReturnType<typeof useRecruitDirectoryInlineEdit>["commit"];
  persistPending: boolean;
  onUnrank: (personId: string) => void;
  onMoveRank: (personId: string, toRank: number) => void;
  onMoveInBoard: (personId: string, delta: -1 | 1) => void;
  dragging: boolean;
  draggedPersonId: string | null;
  hoverTarget: boolean;
  reorderEnabled: boolean;
  onHandlePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    personId: string,
    source: "ranked" | "unranked",
  ) => void;
  onHandlePointerMove: (
    event: ReactPointerEvent<HTMLButtonElement>,
    personId: string,
  ) => void;
  onHandlePointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <section
      className={`${BOARD.section}${
        dragging ? " !overflow-visible" : ""
      }${
        hoverTarget
          ? " ring-2 ring-[var(--module-accent)]/45 ring-inset"
          : ""
      }`}
      data-rank-tier-section={String(section)}
      data-rank-tier-collapsed={expanded ? "false" : "true"}
      data-tier-drop-zone={String(section)}
    >
      <TierSectionBar
        title={title}
        count={rows.length}
        expanded={expanded}
        onToggle={onToggle}
        section={section}
      />
      {expanded ? (
        rows.length > 0 ? (
          <div className="space-y-2 p-2.5">
            <p className="px-0.5 text-[11px] text-text-secondary">
              {rows.length} in tier · drag the handle to reorder
            </p>
            {rows.map((row, sectionIndex) => (
              <RankBoardSequenceCard
                key={row.person.id}
                row={row}
                section={section}
                sectionIndex={sectionIndex}
                visualIndex={visualIndexById.get(row.person.id) ?? 0}
                visualCount={visualCount}
                editingRankPersonId={editingRankPersonId}
                setEditingRankPersonId={setEditingRankPersonId}
                rankedCount={rankedCount}
                persistPending={persistPending}
                dragging={dragging}
                draggedPersonId={draggedPersonId}
                reorderEnabled={reorderEnabled}
                isEditing={isEditing}
                fieldError={fieldError}
                startEdit={startEdit}
                cancelEdit={cancelEdit}
                commit={commit}
                onUnrank={onUnrank}
                onMoveRank={onMoveRank}
                onMoveInBoard={onMoveInBoard}
                onHandlePointerDown={onHandlePointerDown}
                onHandlePointerMove={onHandlePointerMove}
                onHandlePointerUp={onHandlePointerUp}
              />
            ))}
          </div>
        ) : (
          <div
            data-tier-drop-zone={String(section)}
            className="mx-2.5 mb-2.5 rounded-control border border-dashed border-[color-mix(in_srgb,var(--module-accent)_40%,transparent)] bg-[var(--module-tint)]/40 px-3 py-5 text-center text-sm text-text-secondary"
          >
            Drop recruit here
          </div>
        )
      ) : null}
    </section>
  );
}

export default function RecruitRankView({
  rows,
  filteredRows,
  activeFilterIds,
  onCohortChange,
  onPersistLockChange,
}: {
  rows: RecruitDirectoryRow[];
  filteredRows: RecruitDirectoryRow[];
  activeFilterIds: readonly string[];
  onCohortChange: (rows: RecruitDirectoryRow[]) => void;
  onPersistLockChange?: (locked: boolean) => void;
}) {
  const filterResolution = resolveRankClassYearFromFilters(activeFilterIds);
  const storedYear = useSyncExternalStore(
    subscribeRecruitingRankClassYear,
    readStoredRecruitingRankClassYear,
    () => null,
  );
  const [error, setError] = useState<string | undefined>();
  const [editingRankPersonId, setEditingRankPersonId] = useState<string | null>(
    null,
  );
  const [unrankedExpandKey, setUnrankedExpandKey] = useState<string | null>(null);
  const [collapsedTiers, setCollapsedTiers] = useState<ReadonlySet<TierSectionId>>(
    () => new Set(),
  );
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

  const classRankedCount = useMemo(
    () => classRows.filter((row) => row.profile.coachRank !== undefined).length,
    [classRows],
  );

  const ranked = useMemo(() => {
    return classRows
      .filter((row) => row.profile.coachRank !== undefined)
      .filter((row) => visibleIds.has(row.person.id))
      .sort(
        (a, b) =>
          (a.profile.coachRank as number) - (b.profile.coachRank as number),
      );
  }, [classRows, visibleIds]);

  const reorderEnabled = ranked.length === classRankedCount;

  const tierGroups = useMemo(() => groupRankedRowsByTier(ranked), [ranked]);

  const visualIds = useMemo(
    () => tierGroups.flatMap((group) => group.rows.map((row) => row.person.id)),
    [tierGroups],
  );
  const visualIndexById = useMemo(() => {
    const map = new Map<string, number>();
    visualIds.forEach((id, index) => map.set(id, index));
    return map;
  }, [visualIds]);

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
    reorderEnabled,
    onCohortChange,
    onError: setError,
    onPersistLockChange,
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

  function toggleTierSection(section: TierSectionId) {
    setCollapsedTiers((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  function handleAddToRanked(personId: string) {
    if (classYear === null) return;
    if (rankedDrag.persistPending) return;
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
      <div
        className={`flex min-w-0 flex-col gap-3${
          rankedDrag.dragging ? " select-none" : ""
        }`}
        data-rank-board-root=""
      >
        {!reorderEnabled && ranked.length > 0 ? (
          <p className="text-xs text-text-secondary" role="status">
            Clear filters or search to reorder the Rank Board. Tier can still be
            edited from the dropdown.
          </p>
        ) : null}

        {tierGroups.map((group) => (
          <RankedTierSection
            key={String(group.section)}
            section={group.section}
            title={group.title}
            rows={group.rows}
            expanded={!collapsedTiers.has(group.section)}
            onToggle={() => toggleTierSection(group.section)}
            rankedCount={ranked.length}
            visualIndexById={visualIndexById}
            visualCount={visualIds.length}
            editingRankPersonId={editingRankPersonId}
            setEditingRankPersonId={setEditingRankPersonId}
            isEditing={isEditing}
            fieldError={fieldError}
            startEdit={startEdit}
            cancelEdit={cancelEdit}
            commit={commit}
            persistPending={rankedDrag.persistPending}
            onUnrank={(personId) => rankedDrag.unrankPerson(personId)}
            onMoveRank={(personId, toRank) =>
              rankedDrag.movePersonToRank(personId, toRank)
            }
            onMoveInBoard={(personId, delta) =>
              rankedDrag.movePersonInBoard(personId, delta)
            }
            dragging={rankedDrag.dragging}
            draggedPersonId={rankedDrag.draggedPersonId}
            hoverTarget={
              rankedDrag.dragging && rankedDrag.hoverSection === group.section
            }
            reorderEnabled={reorderEnabled}
            onHandlePointerDown={rankedDrag.onHandlePointerDown}
            onHandlePointerMove={rankedDrag.onHandlePointerMove}
            onHandlePointerUp={rankedDrag.onHandlePointerUp}
          />
        ))}

        <RecruitRankSection
          title="Unranked"
          count={unranked.length}
          sectionKey="unranked"
          empty="Every visible recruit in this class is ranked."
          sort={boardSort}
          onSort={toggleBoardSort}
          dragging={rankedDrag.dragging}
          footer={
            <>
              <div className="max-md:hidden">
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
              </div>
              {unranked.length > 0 ? (
                <ul className="divide-y divide-border/50 md:hidden">
                  {visibleUnranked.map((row) => {
                    const name = getDisplayName(row.person);
                    return (
                      <li
                        key={row.person.id}
                        className="flex min-w-0 items-center gap-2 px-4 py-3.5"
                      >
                        <Link
                          href={`/recruiting/${row.person.id}`}
                          className="min-w-0 flex-1 truncate text-sm font-semibold"
                        >
                          {name}
                        </Link>
                        <RankActionButton
                          row={row}
                          variant="add"
                          busy={rankedDrag.persistPending}
                          disabled={
                            rankedDrag.persistPending || rankedDrag.dragging
                          }
                          onClick={() => handleAddToRanked(row.person.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </>
          }
        >
          {visibleUnranked.map((row) => {
            const name = getDisplayName(row.person);
            return (
              <RecruitRankRow
                key={row.person.id}
                row={row}
                coachRank={null}
                rankAction={
                  <RankActionButton
                    row={row}
                    variant="add"
                    busy={rankedDrag.persistPending}
                    disabled={rankedDrag.persistPending || rankedDrag.dragging}
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
                dragHandle={
                  reorderEnabled ? (
                    <RankedDragHandle
                      name={name}
                      disabled={rankedDrag.persistPending}
                      dragging={rankedDrag.draggedPersonId === row.person.id}
                      onPointerDown={(event) => {
                        setEditingRankPersonId(null);
                        rankedDrag.onHandlePointerDown(
                          event,
                          row.person.id,
                          "unranked",
                        );
                      }}
                      onPointerMove={(event) =>
                        rankedDrag.onHandlePointerMove(event, row.person.id)
                      }
                      onPointerUp={rankedDrag.onHandlePointerUp}
                    />
                  ) : (
                    <DragHandlePlaceholder />
                  )
                }
              />
            );
          })}
        </RecruitRankSection>
      </div>
    </ViewChrome>
  );
}

