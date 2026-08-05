/**
 * Compact status indicator for dense list / card rows (BP-020E).
 *
 * Tone map is intentionally open-ended so Team (and future modules) can
 * add Recruit / Alumni / Coach / Injured / Inactive without changing the
 * visual component — only the caller's tone mapping.
 */
export type StatusDotTone =
  | "active"
  | "recruit"
  | "alumni"
  | "coach"
  | "injured"
  | "inactive"
  | "muted";

const toneClasses: Record<StatusDotTone, string> = {
  // ● Current / Active — filled Denison red (BP-022B).
  active: "bg-denison-red",
  // Reserved for future roster / player statuses.
  recruit: "bg-info",
  // ○ Alumni — hollow ring, not a filled pill.
  alumni: "border border-text-secondary/45 bg-transparent",
  coach: "bg-text-secondary/55",
  injured: "bg-warning",
  inactive: "bg-text-secondary/30",
  muted: "bg-border",
};

/**
 * Reusable ~8–10px status dot for Team List, Team Cards, and future OS surfaces.
 * `pointer-events-none` so it never steals row / card click targets.
 */
export default function StatusDot({
  tone,
  label,
  className = "",
}: {
  tone: StatusDotTone;
  /** Accessible name announced to screen readers (e.g. "Active"). */
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`pointer-events-none inline-block h-2.5 w-2.5 shrink-0 rounded-full ${toneClasses[tone]} ${className}`}
    />
  );
}
