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
          empty ? "text-text-secondary/45" : "text-text-primary"
        }`}
      >
        {display}
      </span>
      <span className="text-[11px] font-medium tracking-wide text-text-secondary uppercase">
        {label}
      </span>
    </div>
  );
}
