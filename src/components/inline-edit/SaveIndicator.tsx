"use client";

import type { InlineSaveStatus } from "./types";

/**
 * Lightweight, non-blocking save feedback for auto-save surfaces.
 * Renders nothing while idle so it can sit permanently in a toolbar slot.
 */
export default function SaveIndicator({
  status,
  error,
  className,
}: {
  status: InlineSaveStatus;
  error?: string;
  className?: string;
}) {
  if (status === "idle") return null;

  let content: string;
  let toneClass: string;

  if (status === "saving") {
    content = "Saving…";
    toneClass = "text-text-secondary";
  } else if (status === "saved") {
    content = "Saved ✓";
    toneClass = "text-success";
  } else {
    content = error ?? "Error";
    toneClass = "text-danger";
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={`text-xs font-medium ${toneClass} ${className ?? ""}`}
    >
      {content}
    </span>
  );
}
