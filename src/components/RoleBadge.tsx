/**
 * Identity metadata label (BP-022D / BP-024A).
 *
 * Quiet supporting text — not a button, pill, chip, or control.
 * Filled pills are reserved for Notifications / Alerts / Counts.
 */
import { typeClass } from "@/components/typography";

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
    <span className={typeClass("identityMeta", `block ${className}`)} title={label}>
      {label}
    </span>
  );
}
