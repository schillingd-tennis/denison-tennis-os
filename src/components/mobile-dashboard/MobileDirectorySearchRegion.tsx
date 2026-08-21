"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from "react";

import { useVisualViewportMetrics } from "@/hooks/useVisualViewportMetrics";

const MOBILE_MQ = "(max-width: 767px)";
/** Treat the keyboard as open when inset reports, or VV height drops vs focus baseline. */
const KEYBOARD_INSET_THRESHOLD = 24;
const KEYBOARD_BASELINE_DROP = 80;

function useIsMobileDirectoryViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function readVisibleHeight(): number {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.height ?? window.innerHeight;
}

/**
 * Mobile directory search + results region.
 *
 * When the shared SearchInput is focused and the keyboard opens, results are
 * constrained to the visible visual viewport beneath the toolbar so matches
 * stay tappable without dismissing the keyboard. Desktop is a pass-through
 * flex column (same gap as before).
 *
 * Keyboard detection uses both `keyboardInset` and a focus-time VV baseline —
 * required because some iOS Safari builds shrink `window.innerHeight` with the
 * keyboard, which zeroes the inset formula.
 */
export default function MobileDirectorySearchRegion({
  toolbar,
  children,
}: {
  toolbar: ReactNode;
  children: ReactNode;
}) {
  const isMobile = useIsMobileDirectoryViewport();
  const [searchFocused, setSearchFocused] = useState(false);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const [focusBaseline, setFocusBaseline] = useState(0);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAlignForKeyboardRef = useRef(false);

  const observeViewport = isMobile && searchFocused;
  const viewport = useVisualViewportMetrics(observeViewport);

  const clearBlurTimer = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearBlurTimer(), [clearBlurTimer]);

  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    const measure = () => setToolbarHeight(el.getBoundingClientRect().height);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [toolbar]);

  const onFocusCapture = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.dataset.directorySearch !== "true") return;
      clearBlurTimer();
      // Snapshot before the keyboard finishes opening.
      setFocusBaseline(readVisibleHeight());
      didAlignForKeyboardRef.current = false;
      setSearchFocused(true);
    },
    [clearBlurTimer],
  );

  const onBlurCapture = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.dataset.directorySearch !== "true") return;
      // Delay so a tap on a result can fire before we release the layout.
      clearBlurTimer();
      blurTimerRef.current = setTimeout(() => {
        setSearchFocused(false);
        setFocusBaseline(0);
        didAlignForKeyboardRef.current = false;
        blurTimerRef.current = null;
      }, 320);
    },
    [clearBlurTimer],
  );

  const keyboardOpen =
    observeViewport &&
    viewport.height > 0 &&
    (viewport.keyboardInset > KEYBOARD_INSET_THRESHOLD ||
      (focusBaseline > 0 && viewport.height < focusBaseline - KEYBOARD_BASELINE_DROP));

  // Align toolbar into the visual viewport once when the keyboard opens —
  // not on every VV scroll (avoids jumpiness while typing).
  useEffect(() => {
    if (!keyboardOpen || typeof window === "undefined") return;
    if (didAlignForKeyboardRef.current) return;
    const vv = window.visualViewport;
    const el = toolbarRef.current;
    if (!vv || !el) return;

    const top = el.getBoundingClientRect().top;
    const delta = top - vv.offsetTop - 4;
    if (Math.abs(delta) > 6) {
      window.scrollBy({ top: delta, left: 0, behavior: "auto" });
    }
    didAlignForKeyboardRef.current = true;
  }, [keyboardOpen, viewport.height]);

  const resultsMaxHeight =
    keyboardOpen && viewport.height > 0
      ? Math.max(140, Math.floor(viewport.height - toolbarHeight - 12))
      : undefined;

  const resultsStyle: CSSProperties | undefined =
    resultsMaxHeight !== undefined
      ? {
          maxHeight: resultsMaxHeight,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          // Extra clearance so the last card clears the keyboard top edge.
          paddingBottom: Math.max(16, Math.min(viewport.keyboardInset, 24) || 16),
        }
      : undefined;

  // When results first become constrained, keep the list top in view.
  const wasConstrainedRef = useRef(false);
  useEffect(() => {
    const constrained = resultsMaxHeight !== undefined;
    if (constrained && !wasConstrainedRef.current) {
      resultsRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
    wasConstrainedRef.current = constrained;
  }, [resultsMaxHeight]);
  return (
    <div
      className="flex flex-col gap-2.5"
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
    >
      <div ref={toolbarRef} className="shrink-0">
        {toolbar}
      </div>
      <div
        ref={resultsRef}
        className="relative z-0 isolate min-w-0"
        style={resultsStyle}
      >
        {children}
      </div>
    </div>
  );
}
