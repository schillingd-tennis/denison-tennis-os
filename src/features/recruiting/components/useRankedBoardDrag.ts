"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { applyCoachRankOrderAction } from "../actions";
import {
  appendUnranked,
  applyCoachRanksToCohort,
  applyVisibleOrderToMaster,
  densifyCoachRanks,
  densifyExistingClassOrder,
  insertUnrankedAt,
  insertUnrankedIntoVisible,
  moveByRank,
  moveInOrder,
  rankedPersonIdsForClass,
  removeFromRanked,
} from "../coachRank";
import {
  RANKED_ROW_HEIGHT,
  boardDropZone,
  rankedDropIndex,
  rankedDropSlotTop,
  rankedInsertIndex,
  rankedInsertShiftY,
  rankedRemoveShiftY,
  rankedRowShiftY,
} from "../coachRank/dragIndex";
import type { RecruitDirectoryRow } from "../directory";

type DragSource = "ranked" | "unranked";
type DragZone = "ranked" | "unranked";

type DragState = {
  personId: string;
  classYear: number;
  source: DragSource;
  hoverZone: DragZone;
  originVisibleIds: string[];
  originMasterIds: string[];
  originFromIndex: number;
  hoverIndex: number;
  pointerId: number;
  pointerStartY: number;
  pointerY: number;
  rowHeight: number;
};

type PersistQueue = {
  classYear: number;
  order: string[] | null;
  rollback: RecruitDirectoryRow[];
  inFlight: boolean;
};

export function useRankedBoardDrag({
  classYear,
  ranked,
  classRows,
  cohort,
  addPending,
  onCohortChange,
  onError,
}: {
  classYear: number;
  ranked: RecruitDirectoryRow[];
  classRows: RecruitDirectoryRow[];
  cohort: RecruitDirectoryRow[];
  addPending: boolean;
  onCohortChange: (rows: RecruitDirectoryRow[]) => void;
  onError: (message: string | undefined) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [persistPending, setPersistPending] = useState(false);
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);
  const rankedSectionRef = useRef<HTMLElement | null>(null);
  const unrankedSectionRef = useRef<HTMLElement | null>(null);
  const cohortRef = useRef(cohort);
  const rafRef = useRef<number | null>(null);
  const windowListenersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
    cancel: (event: PointerEvent) => void;
  } | null>(null);
  const queueRef = useRef<PersistQueue>({
    classYear,
    order: null,
    rollback: [],
    inFlight: false,
  });

  const activeDrag = drag && drag.classYear === classYear ? drag : null;
  const dragging = activeDrag !== null;

  useEffect(() => {
    cohortRef.current = cohort;
  }, [cohort]);

  const detachWindowListeners = useCallback(() => {
    const listeners = windowListenersRef.current;
    if (!listeners) return;
    window.removeEventListener("pointermove", listeners.move, { capture: true });
    window.removeEventListener("pointerup", listeners.up, { capture: true });
    window.removeEventListener("pointercancel", listeners.cancel, { capture: true });
    windowListenersRef.current = null;
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearDrag = useCallback(() => {
    stopRaf();
    detachWindowListeners();
    dragRef.current = null;
    setDrag(null);
  }, [detachWindowListeners, stopRaf]);

  useEffect(() => {
    if (!dragging) return;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [dragging]);

  useEffect(() => {
    if (!dragging) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") clearDrag();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearDrag, dragging]);

  useEffect(() => {
    if (drag === null || drag.classYear === classYear) return;
    queueMicrotask(() => clearDrag());
  }, [classYear, clearDrag, drag]);

  useEffect(() => () => {
    stopRaf();
    detachWindowListeners();
  }, [detachWindowListeners, stopRaf]);

  const flushPersist = useCallback(async () => {
    const queue = queueRef.current;
    if (queue.inFlight) return;
    queue.inFlight = true;
    setPersistPending(true);
    try {
      while (queue.order) {
        const order = queue.order;
        queue.order = null;
        const result = await applyCoachRankOrderAction(queue.classYear, order);
        if (!result.success) {
          onCohortChange(queue.rollback);
          onError(result.error);
          queue.order = null;
          return;
        }
        queue.rollback = applyCoachRanksToCohort(
          queue.rollback,
          queue.classYear,
          result.board.rankedPersonIds,
        );
        if (queue.order === null) {
          onCohortChange(
            applyCoachRanksToCohort(
              cohortRef.current,
              queue.classYear,
              result.board.rankedPersonIds,
            ),
          );
        }
      }
    } finally {
      queue.inFlight = false;
      setPersistPending(queue.order !== null);
      if (queue.order) void flushPersist();
    }
  }, [onCohortChange, onError]);

  const persistOrder = useCallback(
    (nextMaster: string[], snapshot: RecruitDirectoryRow[]) => {
      const queue = queueRef.current;
      queue.classYear = classYear;
      if (!queue.inFlight) queue.rollback = snapshot;
      queue.order = nextMaster;
      void flushPersist();
    },
    [classYear, flushPersist],
  );

  const applyMasterOrder = useCallback(
    (nextMaster: string[]) => {
      const snapshot = cohortRef.current;
      onCohortChange(applyCoachRanksToCohort(snapshot, classYear, nextMaster));
      persistOrder(nextMaster, snapshot);
    },
    [classYear, onCohortChange, persistOrder],
  );

  const rankedMasterIds = useCallback(() => {
    return rankedPersonIdsForClass(classRows, classYear);
  }, [classRows, classYear]);

  useEffect(() => {
    if (!classYear || addPending || persistPending || dragging) return;
    const repair = densifyExistingClassOrder(cohortRef.current, classYear);
    if (!repair.changed) return;
    applyMasterOrder(repair.rankedPersonIds);
  }, [addPending, applyMasterOrder, classYear, classRows, dragging, persistPending]);

  const unrankPerson = useCallback(
    (personId: string) => {
      if (addPending || persistPending || dragging) return;
      const originMasterIds = rankedMasterIds();
      if (!originMasterIds.includes(personId)) return;
      onError(undefined);
      applyMasterOrder(removeFromRanked(originMasterIds, personId));
    },
    [addPending, applyMasterOrder, dragging, onError, persistPending, rankedMasterIds],
  );

  const rankPerson = useCallback(
    (personId: string, atRank?: number) => {
      if (addPending || persistPending || dragging) return;
      const originMasterIds = rankedMasterIds();
      if (originMasterIds.includes(personId)) return;
      onError(undefined);
      const nextMaster =
        atRank === undefined
          ? appendUnranked(originMasterIds, personId)
          : insertUnrankedAt(originMasterIds, personId, atRank);
      applyMasterOrder(nextMaster);
    },
    [addPending, applyMasterOrder, dragging, onError, persistPending, rankedMasterIds],
  );

  const movePersonToRank = useCallback(
    (personId: string, toRank: number) => {
      if (addPending || persistPending || dragging) return;
      const originMasterIds = rankedMasterIds();
      const fromRank = originMasterIds.indexOf(personId) + 1;
      if (fromRank < 1) return;
      if (toRank === fromRank) return;
      if (toRank < 1 || toRank > originMasterIds.length) return;
      onError(undefined);
      applyMasterOrder(moveByRank(originMasterIds, fromRank, toRank));
    },
    [addPending, applyMasterOrder, dragging, onError, persistPending, rankedMasterIds],
  );

  const commitDrag = useCallback(
    (state: DragState) => {
      let nextMaster: string[] | null = null;

      if (state.source === "ranked" && state.hoverZone === "ranked") {
        if (state.hoverIndex === state.originFromIndex) {
          clearDrag();
          return;
        }
        const nextVisible = moveInOrder(
          state.originVisibleIds,
          state.originFromIndex,
          state.hoverIndex,
        );
        nextMaster = applyVisibleOrderToMaster(
          state.originMasterIds,
          state.originVisibleIds,
          nextVisible,
        );
      } else if (state.source === "ranked" && state.hoverZone === "unranked") {
        nextMaster = removeFromRanked(state.originMasterIds, state.personId);
      } else if (state.source === "unranked" && state.hoverZone === "ranked") {
        nextMaster = insertUnrankedIntoVisible(
          state.originMasterIds,
          state.originVisibleIds,
          state.personId,
          state.hoverIndex,
        );
      } else {
        clearDrag();
        return;
      }

      applyMasterOrder(nextMaster);
      clearDrag();
    },
    [applyMasterOrder, clearDrag],
  );

  const applyPointerY = useCallback((pointerY: number) => {
    const current = dragRef.current;
    if (!current) return;
    const rankedSection = rankedSectionRef.current;
    const unrankedSection = unrankedSectionRef.current;
    const tbody = tbodyRef.current;

    let hoverZone = current.hoverZone;
    if (rankedSection && unrankedSection) {
      const rankedBox = rankedSection.getBoundingClientRect();
      const unrankedBox = unrankedSection.getBoundingClientRect();
      hoverZone = boardDropZone(
        pointerY,
        rankedBox.bottom,
        unrankedBox.top,
        current.hoverZone,
      );
    }

    const listTop = tbody?.getBoundingClientRect().top
      ?? rankedSection?.getBoundingClientRect().top
      ?? 0;
    const rowHeight =
      tbody?.rows[0]?.getBoundingClientRect().height || current.rowHeight || RANKED_ROW_HEIGHT;

    let hoverIndex = current.hoverIndex;
    if (hoverZone === "ranked") {
      if (current.source === "ranked") {
        hoverIndex = rankedDropIndex(
          pointerY,
          listTop,
          rowHeight,
          current.originVisibleIds.length,
          current.hoverIndex,
        );
      } else {
        hoverIndex = rankedInsertIndex(
          pointerY,
          listTop,
          rowHeight,
          current.originVisibleIds.length,
          current.hoverIndex,
        );
      }
    }

    if (
      hoverZone === current.hoverZone &&
      hoverIndex === current.hoverIndex &&
      pointerY === current.pointerY &&
      rowHeight === current.rowHeight
    ) {
      return;
    }

    const next: DragState = {
      ...current,
      hoverZone,
      hoverIndex,
      pointerY,
      rowHeight,
    };
    dragRef.current = next;
    setDrag(next);
  }, []);

  const onWindowPointerMove = useCallback(
    (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      event.preventDefault();
      const pointerY = event.clientY;
      if (rafRef.current !== null) {
        current.pointerY = pointerY;
        return;
      }
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const latest = dragRef.current;
        if (!latest) return;
        applyPointerY(latest.pointerY);
      });
      current.pointerY = pointerY;
    },
    [applyPointerY],
  );

  const onWindowPointerUp = useCallback(
    (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      stopRaf();
      applyPointerY(event.clientY);
      const latest = dragRef.current;
      if (!latest) return;
      if (latest.classYear !== classYear) {
        clearDrag();
        return;
      }
      commitDrag(latest);
    },
    [applyPointerY, classYear, clearDrag, commitDrag, stopRaf],
  );

  const onWindowPointerCancel = useCallback(
    (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      clearDrag();
    },
    [clearDrag],
  );

  function onHandlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    personId: string,
    source: DragSource,
  ) {
    if (event.button !== 0) return;
    if (addPending) return;
    if (source === "ranked" && ranked.length === 0) return;
    event.preventDefault();
    event.stopPropagation();

    const originVisibleIds = ranked.map((row) => row.person.id);
    const originFromIndex = source === "ranked" ? originVisibleIds.indexOf(personId) : -1;
    if (source === "ranked" && originFromIndex < 0) return;
    if (source === "unranked" && originVisibleIds.includes(personId)) return;

    const originMasterIds = rankedMasterIds();

    const tbody = tbodyRef.current;
    const rowHeight =
      tbody?.rows[0]?.getBoundingClientRect().height || RANKED_ROW_HEIGHT;

    onError(undefined);
    const next: DragState = {
      personId,
      classYear,
      source,
      hoverZone: source,
      originVisibleIds,
      originMasterIds,
      originFromIndex,
      hoverIndex: source === "ranked" ? originFromIndex : 0,
      pointerId: event.pointerId,
      pointerStartY: event.clientY,
      pointerY: event.clientY,
      rowHeight,
    };
    dragRef.current = next;
    setDrag(next);

    detachWindowListeners();
    window.addEventListener("pointermove", onWindowPointerMove, {
      capture: true,
      passive: false,
    });
    window.addEventListener("pointerup", onWindowPointerUp, { capture: true });
    window.addEventListener("pointercancel", onWindowPointerCancel, { capture: true });
    windowListenersRef.current = {
      move: onWindowPointerMove,
      up: onWindowPointerUp,
      cancel: onWindowPointerCancel,
    };
  }

  let previewRankById: Map<string, number> | null = null;
  if (activeDrag) {
    let previewMaster: string[] | null = null;
    if (activeDrag.source === "ranked" && activeDrag.hoverZone === "ranked") {
      const nextVisible = moveInOrder(
        activeDrag.originVisibleIds,
        activeDrag.originFromIndex,
        activeDrag.hoverIndex,
      );
      previewMaster = applyVisibleOrderToMaster(
        activeDrag.originMasterIds,
        activeDrag.originVisibleIds,
        nextVisible,
      );
    } else if (activeDrag.source === "ranked" && activeDrag.hoverZone === "unranked") {
      previewMaster = removeFromRanked(activeDrag.originMasterIds, activeDrag.personId);
    } else if (activeDrag.source === "unranked" && activeDrag.hoverZone === "ranked") {
      previewMaster = insertUnrankedIntoVisible(
        activeDrag.originMasterIds,
        activeDrag.originVisibleIds,
        activeDrag.personId,
        activeDrag.hoverIndex,
      );
    }
    if (previewMaster) {
      previewRankById = new Map(
        densifyCoachRanks(previewMaster).map((entry) => [entry.personId, entry.coachRank]),
      );
    }
  }

  const shiftYByPersonId = new Map<string, number>();
  if (activeDrag) {
    const pointerDeltaY = activeDrag.pointerY - activeDrag.pointerStartY;
    shiftYByPersonId.set(activeDrag.personId, pointerDeltaY);

    if (activeDrag.source === "ranked" && activeDrag.hoverZone === "ranked") {
      activeDrag.originVisibleIds.forEach((id, index) => {
        if (id === activeDrag.personId) return;
        shiftYByPersonId.set(
          id,
          rankedRowShiftY(
            index,
            activeDrag.originFromIndex,
            activeDrag.hoverIndex,
            activeDrag.rowHeight,
          ),
        );
      });
    } else if (activeDrag.source === "ranked" && activeDrag.hoverZone === "unranked") {
      activeDrag.originVisibleIds.forEach((id, index) => {
        if (id === activeDrag.personId) return;
        shiftYByPersonId.set(
          id,
          rankedRemoveShiftY(index, activeDrag.originFromIndex, activeDrag.rowHeight),
        );
      });
    } else if (activeDrag.source === "unranked" && activeDrag.hoverZone === "ranked") {
      activeDrag.originVisibleIds.forEach((id, index) => {
        shiftYByPersonId.set(
          id,
          rankedInsertShiftY(index, activeDrag.hoverIndex, activeDrag.rowHeight),
        );
      });
    }
  }

  let dropSlot: {
    section: DragZone;
    top: number;
    height: number;
    rank: number | null;
  } | null = null;
  if (activeDrag) {
    if (activeDrag.hoverZone === "ranked") {
      dropSlot = {
        section: "ranked",
        top: rankedDropSlotTop(activeDrag.hoverIndex, activeDrag.rowHeight),
        height: activeDrag.rowHeight || RANKED_ROW_HEIGHT,
        rank: activeDrag.hoverIndex + 1,
      };
    } else if (activeDrag.source === "ranked") {
      dropSlot = {
        section: "unranked",
        top: 0,
        height: activeDrag.rowHeight || RANKED_ROW_HEIGHT,
        rank: null,
      };
    }
  }

  return {
    tbodyRef,
    rankedSectionRef,
    unrankedSectionRef,
    dragging,
    persistPending,
    draggedPersonId: activeDrag?.personId ?? null,
    dropZone: activeDrag?.hoverZone ?? null,
    dragSource: activeDrag?.source ?? null,
    displayRanked: ranked,
    previewRankById,
    shiftYByPersonId,
    dropSlot,
    onHandlePointerDown,
    unrankPerson,
    rankPerson,
    movePersonToRank,
  };
}
