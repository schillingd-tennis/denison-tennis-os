/**
 * Filled notification pill (BP-022B).
 *
 * Reserved exclusively for alerts and counts — never for role identity or
 * Current/Alumni status. Examples: "3 New Messages", "2 Tasks Due".
 */
export type NotificationPillTone =
  | "denison"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

const toneClasses: Record<NotificationPillTone, string> = {
  denison: "bg-denison-red text-surface",
  info: "bg-info text-surface",
  success: "bg-success text-surface",
  warning: "bg-warning text-text-primary",
  danger: "bg-danger text-surface",
  neutral: "bg-text-secondary text-surface",
};

export default function NotificationPill({
  label,
  tone = "denison",
  className = "",
}: {
  label: string;
  tone?: NotificationPillTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${toneClasses[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
