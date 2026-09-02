export const SCHEDULE_TABLE = {
  sectionBar: "flex items-baseline justify-between gap-3 border-b border-border/70 px-1 pb-2",
  sectionLabel: "text-sm font-semibold text-text-primary",
  sectionCount: "text-sm tabular-nums text-text-secondary",
} as const;

/** Uniform typography for Site, Time, Type, Status, DH, and Officials. */
export const SCHEDULE_OP_FIELD = {
  text: "text-xs font-normal text-text-primary",
  textMuted: "text-xs font-normal text-text-secondary",
  badge: "inline-flex rounded-full px-2 py-0.5 text-xs font-normal leading-none",
  editor:
    "w-full min-w-0 rounded-control border border-[var(--module-accent)] bg-surface px-1.5 py-0.5 text-xs font-normal leading-snug text-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]",
} as const;

/** Primary opponent/event name — semibold hierarchy restored. */
export const SCHEDULE_OPPONENT_PRIMARY = "truncate text-xs font-semibold text-text-primary";

/** Schedule table column header — title case, not uppercase. */
export const SCHEDULE_TABLE_HEADER = "px-3 py-2 text-[11px] font-semibold tracking-wide text-text-secondary";

/** Date column cell — centered date block under Date header. */
export const SCHEDULE_DATE_TD = "px-3 py-2 align-top text-center";

export const SCHEDULE_DATE_CELL = "inline-block min-w-[3.5rem] text-center leading-none";

/** Opponent/event cell row — logo vertically centered against text block. */
export const SCHEDULE_OPPONENT_CELL = "flex min-w-[10rem] items-center gap-2";

/**
 * Identity mark wrapper — visual-only left shift via transform.
 * Margin/padding on this wrapper had no visible effect because the rendered
 * left edge is anchored by the table cell's padding-left (px-3 = 12px).
 * translateX moves the painted logo without shifting flex siblings (text).
 */
export const SCHEDULE_LOGO_OFFSET = "flex shrink-0 items-center -translate-x-[9px]";

/** Opponent / Event `<td>` — allow translated logo to extend into cell padding without clipping. */
export const SCHEDULE_OPPONENT_TD = "align-top overflow-visible py-2 pl-3 pr-3";

export function ScheduleTableSectionBar({ title, count }: { title: string; count: number }) {
  return (
    <div className={SCHEDULE_TABLE.sectionBar}>
      <h3 className={SCHEDULE_TABLE.sectionLabel}>{title}</h3>
      <span className={SCHEDULE_TABLE.sectionCount}>{count}</span>
    </div>
  );
}
