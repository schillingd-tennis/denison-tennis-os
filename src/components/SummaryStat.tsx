export default function SummaryStat({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) return null;

  return (
    <div className="flex min-h-[84px] flex-col justify-center gap-1.5 rounded-control border border-border bg-surface px-4 py-4">
      <span className="truncate text-2xl font-semibold text-text-primary">{value}</span>
      <span className="text-xs font-medium tracking-wide text-text-secondary uppercase">
        {label}
      </span>
    </div>
  );
}
