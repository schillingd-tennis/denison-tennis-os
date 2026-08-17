import { typeClass, typeRole } from "@/components/typography";
import { EMPTY_VALUE, formatDisplay } from "@/lib/formatting";

export default function SummaryStat({
  label,
  value,
  tone = "module",
}: {
  label: string;
  value?: string;
  tone?: "module" | "info" | "success" | "warning";
}) {
  const display = formatDisplay(value);
  const empty = display === EMPTY_VALUE;

  return (
    <div
      className={`flex min-h-[76px] flex-col justify-center gap-1 rounded-control border px-4 py-3.5 ${
        tone === "info"
          ? "border-info/25 bg-info/5"
          : tone === "success"
            ? "border-success/25 bg-success/5"
            : tone === "warning"
              ? "border-warning/30 bg-warning/5"
              : "border-[var(--module-border)] bg-[var(--module-tint)]/55"
      }`}
    >
      <span
        className={`truncate text-xl font-semibold tabular-nums ${
          empty ? typeRole.metadataEmpty : "text-text-primary"
        }`}
      >
        {display}
      </span>
      <span className={typeClass("sectionLabel")}>{label}</span>
    </div>
  );
}
