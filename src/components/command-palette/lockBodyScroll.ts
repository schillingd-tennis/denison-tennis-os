/**
 * BP-024C — Prevent background scroll without mutating layout.
 *
 * Do NOT set `document.body.style.overflow = "hidden"`. That removes the
 * scrollbar and changes viewport width (cards/toolbar/header shift). Even
 * with padding compensation, residual inline styles can survive HMR /
 * interrupted unmounts.
 *
 * Instead: block wheel/touchmove on the document while the palette is open,
 * except inside an allowlisted scroll container (the results list).
 */

let lockCount = 0;
let wheelHandler: ((event: WheelEvent) => void) | null = null;
let touchHandler: ((event: TouchEvent) => void) | null = null;

function eventTargetNode(event: Event): Node | null {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  for (const entry of path) {
    if (entry instanceof Node) return entry;
  }
  return event.target instanceof Node ? event.target : null;
}

function isInsideAllowlist(target: Node | null, allowSelect: string): boolean {
  if (!target || !(target instanceof Element)) {
    return Boolean(target && document.querySelector(allowSelect)?.contains(target));
  }
  return Boolean(target.closest(allowSelect));
}

/**
 * @param allowScrollSelector CSS selector for elements that may still scroll
 *   (e.g. `[data-command-palette-scroll]`).
 */
export function lockBodyScroll(allowScrollSelector = "[data-command-palette-scroll]"): void {
  if (typeof document === "undefined") return;

  if (lockCount === 0) {
    wheelHandler = (event: WheelEvent) => {
      if (isInsideAllowlist(eventTargetNode(event), allowScrollSelector)) return;
      event.preventDefault();
    };
    touchHandler = (event: TouchEvent) => {
      if (isInsideAllowlist(eventTargetNode(event), allowScrollSelector)) return;
      event.preventDefault();
    };

    document.addEventListener("wheel", wheelHandler, { passive: false, capture: true });
    document.addEventListener("touchmove", touchHandler, { passive: false, capture: true });
  }

  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  if (wheelHandler) {
    document.removeEventListener("wheel", wheelHandler, true);
    wheelHandler = null;
  }
  if (touchHandler) {
    document.removeEventListener("touchmove", touchHandler, true);
    touchHandler = null;
  }

  // Clear any legacy overflow/padding locks from older builds / HMR.
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
}

/** Test/helper: force-clear listeners + legacy inline styles. */
export function resetBodyScrollLock(): void {
  lockCount = 0;
  if (typeof document === "undefined") return;
  if (wheelHandler) {
    document.removeEventListener("wheel", wheelHandler, true);
    wheelHandler = null;
  }
  if (touchHandler) {
    document.removeEventListener("touchmove", touchHandler, true);
    touchHandler = null;
  }
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
}
