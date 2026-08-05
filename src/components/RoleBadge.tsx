/**
 * Identity metadata label (BP-022D).
 *
 * Quiet supporting text — not a button, pill, chip, or control.
 * Filled pills are reserved for Notifications / Alerts / Counts.
 */
export type RoleBadgeTone = "neutral" | "denison" | "info" | "success";

export default function RoleBadge({
  label,
  /** @deprecated — identity metadata stays neutral; tone is ignored. */
  tone: _tone = "neutral",
  className = "",
}: {
  label: string;
  tone?: RoleBadgeTone;
  className?: string;
}) {
  void _tone;

  return (
    <span
      className={`block max-w-full truncate text-[11px] font-normal text-text-secondary ${className}`}
      title={label}
    >
      {label}
    </span>
  );
}
