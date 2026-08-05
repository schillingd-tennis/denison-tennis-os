import { typeClass, typeRole } from "@/components/typography";
import { EMPTY_VALUE, formatDisplay } from "@/lib/formatting";

export default function SummaryStat({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  const display = formatDisplay(value);
  const empty = display === EMPTY_VALUE;

  return (
    <div className="flex min-h-[76px] flex-col justify-center gap-1 rounded-control border border-border bg-surface px-4 py-3.5">
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
