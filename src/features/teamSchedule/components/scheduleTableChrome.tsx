export const SCHEDULE_TABLE = {
  sectionBar: "flex items-baseline justify-between gap-3 border-b border-border/70 px-1 pb-2",
  sectionLabel: "text-sm font-semibold text-text-primary",
  sectionCount: "text-sm tabular-nums text-text-secondary",
} as const;

export function ScheduleTableSectionBar({ title, count }: { title: string; count: number }) {
  return (
    <div className={SCHEDULE_TABLE.sectionBar}>
      <h3 className={SCHEDULE_TABLE.sectionLabel}>{title}</h3>
      <span className={SCHEDULE_TABLE.sectionCount}>{count}</span>
    </div>
  );
}
