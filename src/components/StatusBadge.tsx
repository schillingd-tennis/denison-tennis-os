export type StatusTone = "neutral" | "denison" | "success" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-app-background text-text-secondary",
  denison: "bg-denison-red text-surface",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

export default function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: StatusTone;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
