/** Canonical Ranked row height — keep in sync with `RECRUITING_TABLE.td` (`h-14`). */
export const RANKED_ROW_HEIGHT = 56;

/** Adjacent-slot dead zone so the pointer can sit near a row edge without oscillating. */
export const RANKED_DROP_HYSTERESIS_PX = 8;

/**
 * Map a pointer Y to a Ranked drop index using frozen slot geometry.
 *
 * Slots are equal-height bands of `rowHeight`. The full band is the drop
 * target (`floor`). Adjacent moves require `hysteresis` px into the new
 * band; jumps of 2+ slots apply immediately so a fast drag can skip.
 */
export function rankedDropIndex(
  pointerY: number,
  listTop: number,
  rowHeight: number,
  count: number,
  currentIndex: number,
  hysteresis: number = RANKED_DROP_HYSTERESIS_PX,
): number {
  if (count <= 1) return 0;
  const height = rowHeight > 0 ? rowHeight : RANKED_ROW_HEIGHT;
  const raw = Math.max(
    0,
    Math.min(count - 1, Math.floor((pointerY - listTop) / height)),
  );
  if (raw === currentIndex) return currentIndex;
  if (Math.abs(raw - currentIndex) > 1) return raw;
  if (raw > currentIndex) {
    return pointerY - listTop >= raw * height + hysteresis ? raw : currentIndex;
  }
  return pointerY - listTop < (raw + 1) * height - hysteresis ? raw : currentIndex;
}

/**
 * Vertical shift for a row that stays in origin DOM order while a gap opens
 * at `toIndex`. The dragged row is handled separately (follows the pointer).
 */
export function rankedRowShiftY(
  index: number,
  fromIndex: number,
  toIndex: number,
  rowHeight: number,
): number {
  if (fromIndex === toIndex) return 0;
  if (fromIndex < toIndex && index > fromIndex && index <= toIndex) {
    return -rowHeight;
  }
  if (fromIndex > toIndex && index >= toIndex && index < fromIndex) {
    return rowHeight;
  }
  return 0;
}

/**
 * Insert index into a Ranked list of `rankedCount` rows.
 * Unlike `rankedDropIndex`, this allows `rankedCount` (append after the last row).
 */
export function rankedInsertIndex(
  pointerY: number,
  listTop: number,
  rowHeight: number,
  rankedCount: number,
  currentIndex: number,
  hysteresis: number = RANKED_DROP_HYSTERESIS_PX,
): number {
  if (rankedCount <= 0) return 0;
  const height = rowHeight > 0 ? rowHeight : RANKED_ROW_HEIGHT;
  const raw = Math.max(
    0,
    Math.min(rankedCount, Math.floor((pointerY - listTop) / height)),
  );
  if (raw === currentIndex) return currentIndex;
  if (Math.abs(raw - currentIndex) > 1) return raw;
  if (raw > currentIndex) {
    return pointerY - listTop >= raw * height + hysteresis ? raw : currentIndex;
  }
  return pointerY - listTop < (raw + 1) * height - hysteresis ? raw : currentIndex;
}

/** Existing Ranked rows shift down from `insertIndex` to open a row-sized gap. */
export function rankedInsertShiftY(
  index: number,
  insertIndex: number,
  rowHeight: number,
): number {
  return index >= insertIndex ? rowHeight : 0;
}

/** Remaining Ranked rows close the hole after a row is dragged out. */
export function rankedRemoveShiftY(
  index: number,
  fromIndex: number,
  rowHeight: number,
): number {
  return index > fromIndex ? -rowHeight : 0;
}

/** Pixel offset of a Ranked insert/reorder slot from the tbody top. */
export function rankedDropSlotTop(
  index: number,
  rowHeight: number,
): number {
  const height = rowHeight > 0 ? rowHeight : RANKED_ROW_HEIGHT;
  return Math.max(0, index) * height;
}

/**
 * Choose Ranked vs Unranked from pointer Y.
 *
 * Each section's full vertical box is a drop target so the pointer does not
 * need to hit a row edge. Hysteresis only applies in the gap between them.
 */
export function boardDropZone(
  pointerY: number,
  rankedBottom: number,
  unrankedTop: number,
  currentZone: "ranked" | "unranked",
  hysteresis: number = 12,
): "ranked" | "unranked" {
  if (pointerY <= rankedBottom) return "ranked";
  if (pointerY >= unrankedTop) return "unranked";
  const gapMid = (rankedBottom + unrankedTop) / 2;
  if (currentZone === "ranked") {
    return pointerY > gapMid + hysteresis ? "unranked" : "ranked";
  }
  return pointerY < gapMid - hysteresis ? "ranked" : "unranked";
}
