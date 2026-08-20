"use client";

import { useEffect, useState } from "react";

/** Tailwind `md` is 768px — stay aligned with OS mobile chrome. */
export const MOBILE_EDIT_MEDIA_QUERY = "(max-width: 767px)";

export function isMobileEditSurface(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_EDIT_MEDIA_QUERY).matches;
}

/**
 * True when the viewport is below the OS `md` breakpoint.
 * Used for display hints; focus/blur decisions should call `isMobileEditSurface()`
 * at event time so the first paint cannot select-all on phones.
 */
export function useIsMobileEditSurface(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_EDIT_MEDIA_QUERY);
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return mobile;
}
