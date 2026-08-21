"use client";

import { useEffect, useState } from "react";

export type VisualViewportMetrics = {
  /** Layout viewport height (window.innerHeight). */
  windowHeight: number;
  /** Visible portion height (visualViewport.height). */
  height: number;
  /** visualViewport.offsetTop — page scroll within the layout viewport. */
  offsetTop: number;
  /**
   * Approximate keyboard / browser-chrome occlusion at the bottom of the
   * layout viewport. Clamped to ≥ 0.
   *
   * Note: on some iOS Safari versions `window.innerHeight` shrinks with the
   * keyboard, so this alone can read ~0. Pair with a focus-time baseline.
   */
  keyboardInset: number;
};

const EMPTY: VisualViewportMetrics = {
  windowHeight: 0,
  height: 0,
  offsetTop: 0,
  keyboardInset: 0,
};

function readMetrics(): VisualViewportMetrics {
  if (typeof window === "undefined") return EMPTY;
  const vv = window.visualViewport;
  const windowHeight = window.innerHeight;
  if (!vv) {
    return {
      windowHeight,
      height: windowHeight,
      offsetTop: 0,
      keyboardInset: 0,
    };
  }
  const height = vv.height;
  const offsetTop = vv.offsetTop;
  const keyboardInset = Math.max(0, windowHeight - height - offsetTop);
  return { windowHeight, height, offsetTop, keyboardInset };
}

/**
 * Observes `window.visualViewport` for mobile keyboard / dynamic chrome.
 * Disabled when `enabled` is false (e.g. desktop) so listeners stay idle.
 */
export function useVisualViewportMetrics(enabled: boolean): VisualViewportMetrics {
  const [metrics, setMetrics] = useState<VisualViewportMetrics>(EMPTY);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const update = () => setMetrics(readMetrics());
    update();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [enabled]);

  if (!enabled) return EMPTY;
  return metrics;
}
