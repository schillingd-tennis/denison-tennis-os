import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  subtext: string;
  icon: LucideIcon;
  iconTint: string;
};

export default function TodaySummaryCard({ label, value, subtext, icon: Icon, iconTint }: Props) {
  return (
    <article className="flex min-h-[4.75rem] items-start gap-3 rounded-card border border-border/80 bg-surface px-3 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconTint}`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.1} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-text-secondary">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[1.35rem] leading-none font-semibold tabular-nums text-text-primary">
          {value}
        </p>
        <p className="mt-1 truncate text-[11px] text-text-secondary">{subtext}</p>
      </div>
    </article>
  );
}
