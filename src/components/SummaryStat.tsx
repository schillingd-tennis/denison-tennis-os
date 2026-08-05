import { typeClass, typeRole } from "@/components/typography";

export default function SummaryStat({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  const display = value?.trim() ? value : "—";
  const empty = display === "—";

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
