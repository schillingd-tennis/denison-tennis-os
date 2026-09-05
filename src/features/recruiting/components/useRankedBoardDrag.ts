"use client";

/**
 * Rank Board drag/drop — Practice Sequence native pointer model, extended for
 * MULTIPLE containers (Tier 1…5 + Unassigned + Unranked).
 *
 * Critical: the drag session is bound to window listeners, not the handle DOM
 * node. Live preview remounts the card into another Tier; that would destroy
 * setPointerCapture on the handle and abort mid-gesture (one-tier-only bug).
 *
 * Persist once on pointerup with final order + tier.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { moveItem } from "@/features/practice/reorder";

import { applyRankBoardReorderAction } from "../actions";
import {
  appendRankedToTierSection,
  appendUnranked,
  applyCoachRanksToCohort,
  applyVisibleOrderToMaster,
  densifyExistingClassOrder,
  flattenRankedTier,
  insertUnrankedAt,
  insertUnrankedIntoVisible,
  moveRankedToTierSection,
  moveRankedVisualByDelta,
  moveVisibleByRank,
  rankedPersonIdsForClass,
  removeFromRanked,
  tierValueForSection,
} from "../coachRank";
import {
  buildRankBoardReorderArgs,
  enqueueRankBoardPersist,
  resolveOrderPersistAfterDrag,
  resolveTierPersistAfterDrag,
  type RankBoardTierPersist,
} from "../coachRank/rankBoardPersist";
import {
  rankBoardEdgeScrollDelta,
  resolveRankBoardPointerTarget,
  type RankBoardHitSection,
} from "../coachRank/rankBoardPointer";
import type { RecruitDirectoryRow } from "../directory";
import {
  TIER_SECTION_ORDER,
  type RecruitBoardTier,
  type TierSectionId,
  tierSectionIdForProfile,
} from "../tier";

type DragSource = "ranked" | "unranked";

type TierPersist = RankBoardTierPersist;

type DragOrigin = {
  personId: string;
  source: DragSource;
  classYear: number;
  snapshot: RecruitDirectoryRow[];
  originMasterIds: string[];
  originVisibleIds: string[];
};

function applyTierToCohort(
  cohort: readonly RecruitDirectoryRow[],
  personId: string,
  tier: RecruitBoardTier | null,
): RecruitDirectoryRow[] {
  return cohort.map((row) => {
    if (row.person.id !== personId) return row;
    const nextTier = tier === null ? undefined : tier;
    if (row.profile.tier === nextTier) return row;
    return {
      ...row,
      profile: {
        ...row.profile,
        tier: nextTier,
      },
    };
  });
}

function parseTierSection(raw: string | undefined): TierSectionId | null {
  if (!raw) return null;
  if (raw === "unassigned") return "unassigned";
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return null;
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function sectionIndexOf(
  ranked: readonly RecruitDirectoryRow[],
  section: TierSectionId,
  personId: string,
): number {
  return ranked
    .filter((row) => tierSectionIdForProfile(row.profile) === section)
    .findIndex((row) => row.person.id === personId);
}

function findScrollParent(start: Element | null): HTMLElement | null {
  let node: Element | null = start;
  while (node && node !== document.body) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        node.scrollHeight > node.clientHeight + 1
      ) {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

function collectHitSections(personId: string): RankBoardHitSection[] {
  const sections: RankBoardHitSection[] = [];
  const tierEls = document.querySelectorAll<HTMLElement>("[data-rank-tier-section]");
  for (const el of tierEls) {
    const section = parseTierSection(el.dataset.rankTierSection);
    if (!section) continue;
    const rect = el.getBoundingClientRect();
    const items = [
      ...el.querySelectorAll<HTMLElement>("[data-rank-board-item]"),
    ].filter((item) => item.dataset.personId !== personId);
    sections.push({
      section,
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
      },
      otherMidYs: items.map((item) => {
        const r = item.getBoundingClientRect();
        return r.top + r.height / 2;
      }),
      collapsed: el.dataset.rankTierCollapsed === "true",
      empty: items.length === 0,
    });
  }

  const unranked = document.querySelector<HTMLElement>(
    '[data-rank-section="unranked"]',
  );
  if (unranked) {
    const rect = unranked.getBoundingClientRect();
    sections.push({
      section: "unranked",
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
      },
      otherMidYs: [],
      collapsed: false,
      empty: true,
    });
  }

  return sections;
}

export function useRankedBoardDrag({
  classYear,
  ranked,
  classRows,
  cohort,
  addPending,
  reorderEnabled,
  onCohortChange,
  onError,
  onPersistLockChange,
}: {
  classYear: number;
  ranked: RecruitDirectoryRow[];
  classRows: RecruitDirectoryRow[];
  cohort: RecruitDirectoryRow[];
  addPending: boolean;
  /** False when filters/search hide ranked recruits — reorder maps incorrectly. */
  reorderEnabled: boolean;
  onCohortChange: (rows: RecruitDirectoryRow[]) => void;
  onError: (message: string | undefined) => void;
  /** When true, parent should ignore stale server props overwriting liveRows. */
  onPersistLockChange?: (locked: boolean) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverSection, setHoverSection] = useState<
    TierSectionId | "unranked" | null
  >(null);
  const [persistPending, setPersistPending] = useState(false);
  const draggingRef = useRef<string | null>(null);
  const originRef = useRef<DragOrigin | null>(null);
  const liveTierRef = useRef<TierPersist | null>(null);
  /** Sync master order for the active drag — React cohort state lags pointerup. */
  const liveMasterOrderRef = useRef<string[] | null>(null);
  const cohortRef = useRef(cohort);
  const rankedRef = useRef(ranked);
  const persistInFlightRef = useRef(false);
  const sessionCleanupRef = useRef<(() => void) | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const queueRef = useRef<{
    classYear: number;
    order: string[] | null;
    tier: TierPersist | null;
    rollback: RecruitDirectoryRow[];
  }>({
    classYear,
    order: null,
    tier: null,
    rollback: [],
  });

  useEffect(() => {
    cohortRef.current = cohort;
  }, [cohort]);

  useEffect(() => {
    rankedRef.current = ranked;
  }, [ranked]);

  const setPersistLock = useCallback(
    (locked: boolean) => {
      onPersistLockChange?.(locked);
    },
    [onPersistLockChange],
  );

  const flushPersist = useCallback(async () => {
    if (persistInFlightRef.current) return;
    const queue = queueRef.current;
    if (!queue.order) return;

    persistInFlightRef.current = true;
    setPersistPending(true);
    setPersistLock(true);
    try {
      while (queue.order) {
        const order = queue.order;
        const tier = queue.tier;
        queue.order = null;
        queue.tier = null;

        const result = await applyRankBoardReorderAction(
          buildRankBoardReorderArgs({
            classYear: queue.classYear,
            rankedPersonIds: order,
            tier,
          }),
        );

        if (!result.success) {
          onCohortChange(queue.rollback);
          onError(result.error);
          queue.order = null;
          queue.tier = null;
          return;
        }

        // Apply dense order first, then tier only — never replace the whole
        // profile with tierProfile (it still carries the pre-reorder coachRank).
        let next = applyCoachRanksToCohort(
          cohortRef.current,
          queue.classYear,
          result.board.rankedPersonIds,
        );
        const tierFromServer = result.tierProfile
          ? {
              personId: result.tierProfile.personId,
              tier: result.tierProfile.tier ?? null,
            }
          : null;
        const tierToApply = tierFromServer ?? tier;
        if (tierToApply) {
          next = applyTierToCohort(next, tierToApply.personId, tierToApply.tier);
        }
        queue.rollback = next;
        cohortRef.current = next;
        rankedRef.current = next
          .filter(
            (row) =>
              row.profile.recruitClassYear === queue.classYear &&
              row.profile.coachRank !== undefined,
          )
          .sort(
            (a, b) =>
              (a.profile.coachRank as number) - (b.profile.coachRank as number),
          );
        liveMasterOrderRef.current = result.board.rankedPersonIds;
        if (queue.order === null) {
          onCohortChange(next);
        }
      }
    } finally {
      persistInFlightRef.current = false;
      const stillQueued = queueRef.current.order !== null;
      setPersistPending(stillQueued);
      if (!stillQueued) setPersistLock(false);
      if (stillQueued) void flushPersist();
    }
  }, [onCohortChange, onError, setPersistLock]);

  const persistBoard = useCallback(
    (
      nextMaster: string[],
      snapshot: RecruitDirectoryRow[],
      tier?: TierPersist | null,
    ) => {
      const queue = queueRef.current;
      queue.classYear = classYear;
      if (!persistInFlightRef.current) queue.rollback = snapshot;
      // Order-only enqueues must not wipe a pending cross-tier tierUpdate.
      enqueueRankBoardPersist(queue, { order: nextMaster, tier });
      void flushPersist();
    },
    [classYear, flushPersist],
  );

  const applyMasterOrder = useCallback(
    (
      nextMaster: string[],
      tier?: TierPersist | null,
      options?: { persist?: boolean; snapshot?: RecruitDirectoryRow[] },
    ) => {
      const snapshot = options?.snapshot ?? cohortRef.current;
      let next = applyCoachRanksToCohort(snapshot, classYear, nextMaster);
      if (tier) {
        next = applyTierToCohort(next, tier.personId, tier.tier);
      }
      // Sync immediately — pointerup / next live hop must not wait for React.
      cohortRef.current = next;
      rankedRef.current = next
        .filter(
          (row) =>
            row.profile.recruitClassYear === classYear &&
            row.profile.coachRank !== undefined,
        )
        .sort(
          (a, b) =>
            (a.profile.coachRank as number) - (b.profile.coachRank as number),
        );
      liveMasterOrderRef.current = nextMaster;
      onCohortChange(next);
      if (options?.persist === false) return;
      // Pass tier through as-is (undefined = order-only; object = include tier).
      persistBoard(nextMaster, snapshot, tier);
    },
    [classYear, onCohortChange, persistBoard],
  );

  const rankedMasterIds = useCallback(() => {
    return rankedPersonIdsForClass(classRows, classYear);
  }, [classRows, classYear]);

  useEffect(() => {
    if (!classYear || addPending || persistPending || draggingId) return;
    const repair = densifyExistingClassOrder(cohortRef.current, classYear);
    if (!repair.changed) return;
    applyMasterOrder(repair.rankedPersonIds);
  }, [
    addPending,
    applyMasterOrder,
    classYear,
    classRows,
    draggingId,
    persistPending,
  ]);

  const unrankPerson = useCallback(
    (personId: string) => {
      if (addPending || persistPending || draggingId) return;
      const originMasterIds = rankedMasterIds();
      if (!originMasterIds.includes(personId)) return;
      onError(undefined);
      applyMasterOrder(removeFromRanked(originMasterIds, personId));
    },
    [
      addPending,
      applyMasterOrder,
      draggingId,
      onError,
      persistPending,
      rankedMasterIds,
    ],
  );

  const rankPerson = useCallback(
    (personId: string, atRank?: number) => {
      if (addPending || persistPending || draggingId) return;
      const originMasterIds = rankedMasterIds();
      if (originMasterIds.includes(personId)) return;
      onError(undefined);
      const nextMaster =
        atRank === undefined
          ? appendUnranked(originMasterIds, personId)
          : insertUnrankedAt(originMasterIds, personId, atRank);
      applyMasterOrder(nextMaster);
    },
    [
      addPending,
      applyMasterOrder,
      draggingId,
      onError,
      persistPending,
      rankedMasterIds,
    ],
  );

  const movePersonToRank = useCallback(
    (personId: string, toRank: number) => {
      if (addPending || persistPending || draggingId) return;
      const originMasterIds = rankedMasterIds();
      const originVisibleIds = ranked.map((row) => row.person.id);
      const fromRank = originVisibleIds.indexOf(personId) + 1;
      if (fromRank < 1) return;
      if (toRank === fromRank) return;
      if (toRank < 1 || toRank > originVisibleIds.length) return;
      onError(undefined);
      applyMasterOrder(
        moveVisibleByRank(originMasterIds, originVisibleIds, fromRank, toRank),
      );
    },
    [
      addPending,
      applyMasterOrder,
      draggingId,
      onError,
      persistPending,
      ranked,
      rankedMasterIds,
    ],
  );

  const movePersonInBoard = useCallback(
    (personId: string, delta: -1 | 1) => {
      if (!reorderEnabled || addPending || persistPending || draggingId) return;
      const result = moveRankedVisualByDelta({
        rankedRows: ranked,
        personId,
        delta,
      });
      if (!result) return;
      onError(undefined);
      const originMasterIds = rankedMasterIds();
      const originVisibleIds = flattenRankedTier(ranked);
      const nextMaster =
        originVisibleIds.length === originMasterIds.length
          ? result.nextVisibleOrder
          : applyVisibleOrderToMaster(
              originMasterIds,
              originVisibleIds,
              result.nextVisibleOrder,
            );
      applyMasterOrder(nextMaster, { personId, tier: result.nextTier });
    },
    [
      addPending,
      applyMasterOrder,
      draggingId,
      onError,
      persistPending,
      ranked,
      rankedMasterIds,
      reorderEnabled,
    ],
  );

  const movePersonToTier = useCallback(
    (personId: string, toSection: TierSectionId) => {
      if (addPending || persistPending || draggingId) return;
      const classRanked = classRows.filter(
        (row) => row.profile.coachRank !== undefined,
      );
      const row = classRanked.find((entry) => entry.person.id === personId);
      if (!row) return;
      const currentSection = tierSectionIdForProfile(row.profile);
      if (currentSection === toSection) return;

      const result = appendRankedToTierSection({
        rankedRows: classRanked,
        personId,
        toSection,
      });
      onError(undefined);
      applyMasterOrder(result.nextVisibleOrder, {
        personId,
        tier: result.nextTier,
      });
    },
    [addPending, applyMasterOrder, classRows, draggingId, onError, persistPending],
  );

  /** Live optimistic move while dragging (preview only — no persist). */
  const applyLiveTarget = useCallback(
    (
      personId: string,
      source: DragSource,
      toSection: TierSectionId | "unranked",
      toIndexInSection: number,
    ) => {
      const origin = originRef.current;
      if (!origin || origin.personId !== personId) return;

      if (toSection === "unranked") {
        if (source !== "ranked") return;
        const currentIds = flattenRankedTier(rankedRef.current);
        if (!currentIds.includes(personId)) return;
        const nextMaster = removeFromRanked(origin.originMasterIds, personId);
        liveTierRef.current = null;
        applyMasterOrder(nextMaster, null, {
          persist: false,
          snapshot: origin.snapshot,
        });
        return;
      }

      if (source === "ranked") {
        const rankedRows = rankedRef.current.some((r) => r.person.id === personId)
          ? rankedRef.current
          : origin.snapshot.filter((r) => r.profile.coachRank !== undefined);

        const currentRow = rankedRows.find((r) => r.person.id === personId);
        const fromSection = currentRow
          ? tierSectionIdForProfile(currentRow.profile)
          : null;

        // Same tier: Practice Sequence moveItem on the section list.
        if (fromSection === toSection) {
          const sectionIds = rankedRows
            .filter((row) => tierSectionIdForProfile(row.profile) === toSection)
            .map((row) => row.person.id);
          const fromIndex = sectionIds.indexOf(personId);
          if (fromIndex < 0) return;
          const nextSectionIds = moveItem(
            sectionIds,
            fromIndex,
            Math.max(0, Math.min(toIndexInSection, sectionIds.length - 1)),
          );
          if (sameOrder(nextSectionIds, sectionIds)) return;

          const result = moveRankedToTierSection({
            rankedRows,
            personId,
            toSection,
            toIndexInSection: nextSectionIds.indexOf(personId),
          });
          const nextMaster =
            origin.originVisibleIds.length === origin.originMasterIds.length
              ? result.nextVisibleOrder
              : applyVisibleOrderToMaster(
                  origin.originMasterIds,
                  flattenRankedTier(rankedRows),
                  result.nextVisibleOrder,
                );
          liveTierRef.current = { personId, tier: result.nextTier };
          applyMasterOrder(nextMaster, liveTierRef.current, {
            persist: false,
            snapshot: origin.snapshot,
          });
          return;
        }

        const result = moveRankedToTierSection({
          rankedRows,
          personId,
          toSection,
          toIndexInSection,
        });
        const currentIds = flattenRankedTier(rankedRef.current);
        const currentTier = rankedRef.current.find((r) => r.person.id === personId)
          ?.profile.tier;
        const nextTierValue =
          result.nextTier === null ? undefined : result.nextTier;
        if (
          sameOrder(result.nextVisibleOrder, currentIds) &&
          currentTier === nextTierValue
        ) {
          return;
        }
        const nextMaster =
          origin.originVisibleIds.length === origin.originMasterIds.length
            ? result.nextVisibleOrder
            : applyVisibleOrderToMaster(
                origin.originMasterIds,
                flattenRankedTier(rankedRows),
                result.nextVisibleOrder,
              );
        liveTierRef.current = { personId, tier: result.nextTier };
        applyMasterOrder(nextMaster, liveTierRef.current, {
          persist: false,
          snapshot: origin.snapshot,
        });
        return;
      }

      // Unranked → tier section
      const without = rankedRef.current.filter((r) => r.person.id !== personId);
      const insertAt = (() => {
        let global = 0;
        for (const id of TIER_SECTION_ORDER) {
          const ids = without
            .filter((row) => tierSectionIdForProfile(row.profile) === id)
            .map((row) => row.person.id);
          if (id === toSection) {
            return global + Math.max(0, Math.min(toIndexInSection, ids.length));
          }
          global += ids.length;
        }
        return global;
      })();
      const nextMaster = insertUnrankedIntoVisible(
        origin.originMasterIds,
        flattenRankedTier(without),
        personId,
        insertAt,
      );
      liveTierRef.current = {
        personId,
        tier: tierValueForSection(toSection),
      };
      applyMasterOrder(nextMaster, liveTierRef.current, {
        persist: false,
        snapshot: origin.snapshot,
      });
    },
    [applyMasterOrder],
  );

  /**
   * Geometry hit-test over ALL tier sections (not adjacent-only).
   * Uses section bounding boxes so the dragged card under the pointer cannot
   * block detection of Tier 1 when starting from Tier 5.
   */
  function resolvePointerTarget(
    clientX: number,
    clientY: number,
    personId: string,
  ): { section: TierSectionId | "unranked"; indexInSection: number } | null {
    const geometric = resolveRankBoardPointerTarget(
      clientX,
      clientY,
      collectHitSections(personId),
    );
    if (geometric) return geometric;

    // Fallback: elementFromPoint / items (Practice Sequence style).
    const hit = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-rank-board-item],[data-tier-drop-zone]");
    if (!hit) return null;

    if (hit.hasAttribute("data-tier-drop-zone")) {
      const zone = hit.dataset.tierDropZone;
      if (zone === "unranked") {
        return { section: "unranked", indexInSection: 0 };
      }
      const section = parseTierSection(zone);
      if (!section) return null;
      const others = rankedRef.current.filter(
        (row) =>
          tierSectionIdForProfile(row.profile) === section &&
          row.person.id !== personId,
      ).length;
      return { section, indexInSection: others };
    }

    const section = parseTierSection(hit.dataset.tierSection);
    if (!section) return null;
    const targetId = hit.dataset.personId;
    if (!targetId || targetId === personId) {
      // Over self: still treat as this section using dataset index.
      return {
        section,
        indexInSection: Math.max(0, Number(hit.dataset.sectionIndex) || 0),
      };
    }

    let indexInSection = Number(hit.dataset.sectionIndex);
    if (!Number.isInteger(indexInSection)) {
      indexInSection = sectionIndexOf(rankedRef.current, section, targetId);
    }

    return {
      section,
      indexInSection: Math.max(0, indexInSection),
    };
  }

  function autoScrollAtPointer(clientY: number) {
    const root = document.querySelector("[data-rank-board-root]");
    const scroller = findScrollParent(root) ?? document.documentElement;
    const isDoc =
      scroller === document.documentElement || scroller === document.body;
    const top = isDoc ? 0 : scroller.getBoundingClientRect().top;
    const bottom = isDoc
      ? window.innerHeight
      : scroller.getBoundingClientRect().bottom;
    const delta = rankBoardEdgeScrollDelta(clientY, top, bottom);
    if (delta === 0) return;
    if (isDoc) {
      window.scrollBy(0, delta);
    } else {
      scroller.scrollTop += delta;
    }
  }

  function endDragSession(options?: { cancel?: boolean }) {
    sessionCleanupRef.current?.();
    sessionCleanupRef.current = null;

    const origin = originRef.current;
    const personId = draggingRef.current;
    const liveTier = liveTierRef.current;
    const liveOrder = liveMasterOrderRef.current;
    draggingRef.current = null;
    setDraggingId(null);
    setHoverSection(null);
    originRef.current = null;
    liveTierRef.current = null;
    liveMasterOrderRef.current = null;
    lastPointerRef.current = null;

    if (options?.cancel) {
      if (origin) {
        cohortRef.current = origin.snapshot;
        rankedRef.current = origin.snapshot
          .filter(
            (row) =>
              row.profile.recruitClassYear === origin.classYear &&
              row.profile.coachRank !== undefined,
          )
          .sort(
            (a, b) =>
              (a.profile.coachRank as number) - (b.profile.coachRank as number),
          );
        onCohortChange(origin.snapshot);
      }
      return;
    }

    if (!origin || !personId || origin.classYear !== classYear) return;

    const cohortOrder = rankedPersonIdsForClass(
      cohortRef.current.filter(
        (row) => row.profile.recruitClassYear === classYear,
      ),
      classYear,
    );
    // Prefer sync live order — cohortRef alone used to lose within-tier index
    // when pointerup raced ahead of React committing the last preview.
    const nextMaster = resolveOrderPersistAfterDrag({
      liveOrder,
      cohortOrder,
    });
    const originTier = origin.snapshot.find((row) => row.person.id === personId)
      ?.profile.tier;
    const currentTier = cohortRef.current.find((row) => row.person.id === personId)
      ?.profile.tier;
    const tierPersist = resolveTierPersistAfterDrag({
      personId,
      liveTier,
      originTier,
      currentTier,
    });
    const orderChanged = !sameOrder(nextMaster, origin.originMasterIds);
    if (!orderChanged && !tierPersist) return;

    // Single persist at drag end (never during drag-over).
    persistBoard(nextMaster, origin.snapshot, tierPersist);
  }

  function startDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    personId: string,
    source: DragSource,
  ) {
    if (event.button !== 0) return;
    if (addPending || persistPending) return;
    if (source === "ranked" && !reorderEnabled) return;
    event.preventDefault();
    event.stopPropagation();

    const originVisibleIds = flattenRankedTier(ranked);
    const originFromIndex =
      source === "ranked" ? originVisibleIds.indexOf(personId) : -1;
    if (source === "ranked" && originFromIndex < 0) return;
    if (source === "unranked" && originVisibleIds.includes(personId)) return;

    // Capture helps within-tier (same as Practice); window listeners keep the
    // session alive after cross-tier remount destroys this button.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers throw if capture fails; window listeners still work.
    }
    onError(undefined);

    originRef.current = {
      personId,
      source,
      classYear,
      snapshot: cohortRef.current,
      originMasterIds: rankedMasterIds(),
      originVisibleIds,
    };
    liveTierRef.current = null;
    liveMasterOrderRef.current = rankedMasterIds();
    draggingRef.current = personId;
    setDraggingId(personId);
    setHoverSection(null);
    lastPointerRef.current = { x: event.clientX, y: event.clientY };

    const pointerId = event.pointerId;

    const onWindowPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (draggingRef.current !== personId) return;
      const origin = originRef.current;
      if (!origin || origin.classYear !== classYear) return;

      lastPointerRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
      autoScrollAtPointer(moveEvent.clientY);

      const target = resolvePointerTarget(
        moveEvent.clientX,
        moveEvent.clientY,
        personId,
      );
      if (!target) return;
      setHoverSection(target.section);
      applyLiveTarget(
        personId,
        origin.source,
        target.section,
        target.indexInSection,
      );
    };

    const onWindowPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      endDragSession();
    };

    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);

    sessionCleanupRef.current = () => {
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }

  function updateDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    personId: string,
  ) {
    // Fallback when capture still holds (within-tier). Window listener is primary.
    if (draggingRef.current !== personId) return;
    const origin = originRef.current;
    if (!origin || origin.classYear !== classYear) return;

    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    autoScrollAtPointer(event.clientY);

    const target = resolvePointerTarget(event.clientX, event.clientY, personId);
    if (!target) return;
    setHoverSection(target.section);
    applyLiveTarget(personId, origin.source, target.section, target.indexInSection);
  }

  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Button may already be gone after cross-tier remount.
      }
    }
    // Window pointerup also ends the session; guard against double finish.
    if (!draggingRef.current) return;
    endDragSession();
  }

  function onHandlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    personId: string,
    source: DragSource,
  ) {
    startDrag(event, personId, source);
  }

  function onHandlePointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
    personId: string,
  ) {
    updateDrag(event, personId);
  }

  function onHandlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    finishDrag(event);
  }

  // Escape cancels to origin snapshot (no persist).
  useEffect(() => {
    if (!draggingId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      endDragSession({ cancel: true });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // endDragSession closes over latest classYear/persistBoard via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session-scoped
  }, [draggingId, classYear, onCohortChange]);

  // Tear down window listeners if the hook unmounts mid-drag.
  useEffect(() => {
    return () => {
      sessionCleanupRef.current?.();
      sessionCleanupRef.current = null;
    };
  }, []);

  return {
    dragging: draggingId !== null,
    persistPending,
    draggedPersonId: draggingId,
    hoverSection,
    reorderEnabled,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
    unrankPerson,
    rankPerson,
    movePersonToRank,
    movePersonInBoard,
    movePersonToTier,
  };
}
