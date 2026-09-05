/**
 * Rank Board multi-container pointer helpers.
 *
 * Hit-testing and edge auto-scroll are pure so drag can span Tier 1…5 +
 * Unassigned in one gesture (not adjacent-only).
 */

import type { TierSectionId } from "../tier";

export const RANK_BOARD_SCROLL_EDGE_PX = 48;
export const RANK_BOARD_SCROLL_MAX_DELTA = 28;

/**
 * Vertical edge auto-scroll delta for a Rank Board viewport.
 * Negative = scroll up; positive = scroll down; 0 = idle.
 */
export function rankBoardEdgeScrollDelta(
  clientY: number,
  viewportTop: number,
  viewportBottom: number,
  edgePx: number = RANK_BOARD_SCROLL_EDGE_PX,
  maxDelta: number = RANK_BOARD_SCROLL_MAX_DELTA,
): number {
  const height = viewportBottom - viewportTop;
  if (height <= 0 || edgePx <= 0 || maxDelta <= 0) return 0;
  const edge = Math.min(edgePx, height / 2);
  if (clientY < viewportTop + edge) {
    const t = (viewportTop + edge - clientY) / edge;
    return -Math.max(1, Math.round(maxDelta * Math.min(1, t)));
  }
  if (clientY > viewportBottom - edge) {
    const t = (clientY - (viewportBottom - edge)) / edge;
    return Math.max(1, Math.round(maxDelta * Math.min(1, t)));
  }
  return 0;
}

/**
 * Insert index among mid-Ys of other items in a section (0…length).
 * Pointer above the first midpoint → 0; below the last → length (append).
 */
export function insertIndexFromMidYs(
  pointerY: number,
  midYs: readonly number[],
): number {
  for (let i = 0; i < midYs.length; i++) {
    if (pointerY < midYs[i]!) return i;
  }
  return midYs.length;
}

export type RankBoardPointerTarget = {
  section: TierSectionId | "unranked";
  indexInSection: number;
};

export type RankBoardHitRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type RankBoardHitItem = {
  personId: string;
  midY: number;
  rect: RankBoardHitRect;
};

export type RankBoardHitSection = {
  section: TierSectionId | "unranked";
  rect: RankBoardHitRect;
  /** Mid-Ys of items other than the dragged person, top→bottom. */
  otherMidYs: number[];
  collapsed: boolean;
  empty: boolean;
};

function pointInRect(x: number, y: number, rect: RankBoardHitRect): boolean {
  return (
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  );
}

/**
 * Collision: pointerWithin any registered section (T1–T5, Unassigned, Unranked).
 * Not limited to source ±1. Empty and collapsed sections remain valid.
 */
export function resolveRankBoardPointerTarget(
  clientX: number,
  clientY: number,
  sections: readonly RankBoardHitSection[],
): RankBoardPointerTarget | null {
  for (const entry of sections) {
    if (!pointInRect(clientX, clientY, entry.rect)) continue;
    return {
      section: entry.section,
      indexInSection: insertIndexFromMidYs(clientY, entry.otherMidYs),
    };
  }
  return null;
}

/**
 * Simulate a continuous multi-tier gesture as successive live previews.
 * Pure model used by tests — mirrors applyLiveTarget chaining.
 */
export function previewMultiTierDrag(
  move: (args: {
    toSection: TierSectionId;
    toIndexInSection: number;
  }) => { nextVisibleOrder: string[]; nextTier: number | null },
  hops: readonly { toSection: TierSectionId; toIndexInSection: number }[],
): { nextVisibleOrder: string[]; nextTier: number | null } | null {
  if (hops.length === 0) return null;
  let last: { nextVisibleOrder: string[]; nextTier: number | null } | null =
    null;
  for (const hop of hops) {
    last = move(hop);
  }
  return last;
}
