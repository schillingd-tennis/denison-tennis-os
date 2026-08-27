import { CalendarClock, CalendarDays, MessageSquare, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EMPTY_VALUE, formatDate } from "@/lib/formatting";

import styles from "./interactionsPage.module.css";

const TONE = {
  crimson: {
    card: "border-[var(--module-accent)]/15 bg-[var(--module-tint)]/70",
    icon: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    value: "text-[var(--module-accent)]",
  },
  blue: {
    card: "border-info/15 bg-info/[0.06]",
    icon: "bg-info/10 text-info",
    value: "text-info",
  },
  amber: {
    card: "border-warning/20 bg-warning/[0.09]",
    icon: "bg-warning/15 text-warning",
    value: "text-warning",
  },
  violet: {
    card: "border-research/15 bg-research/[0.07]",
    icon: "bg-research/10 text-research",
    value: "text-research",
  },
} as const;

function Tile({
  label,
  value,
  caption,
  icon: Icon,
  tone,
  empty,
}: {
  label: string;
  value: string;
  caption?: string | null;
  icon: LucideIcon;
  tone: keyof typeof TONE;
  empty?: boolean;
}) {
  const palette = TONE[tone];
  return (
    <article className={`flex min-h-[84px] min-w-0 items-center justify-between gap-3 rounded-control border px-3 py-2.5 ${palette.card}`}>
      <div className="min-w-0">
        <p className="text-[10px] font-medium tracking-wide text-text-secondary uppercase">{label}</p>
        <p className={`mt-2 truncate text-[22px] leading-none font-semibold tabular-nums ${empty ? "text-text-secondary/70" : palette.value}`}>
          {value}
        </p>
        {caption ? <p className="mt-1 truncate text-[11px] text-text-secondary">{caption}</p> : null}
      </div>
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${palette.icon}`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </span>
    </article>
  );
}

export default function InteractionsKpiRow({
  lastOccurredAt,
  thisWeekCount,
  followUpCount,
  textsSynced,
  scanCaption,
  truncated,
}: {
  lastOccurredAt: string | null;
  thisWeekCount: number;
  followUpCount: number;
  textsSynced: number;
  scanCaption: string | null;
  truncated: boolean;
}) {
  return (
    <section aria-label="Interaction summary" className={styles.kpis} data-interactions-kpis="">
      <Tile
        label="Last Interaction"
        icon={CalendarClock}
        tone="crimson"
        value={lastOccurredAt ? formatDate(lastOccurredAt) : EMPTY_VALUE}
        caption={truncated ? "Latest 5,000 loaded" : "Most recent"}
        empty={!lastOccurredAt}
      />
      <Tile
        label="Interactions This Week"
        icon={CalendarDays}
        tone="blue"
        value={String(thisWeekCount)}
        caption="Last 7 days"
      />
      <Tile
        label="Recruits Needing Follow-Up"
        icon={UserRound}
        tone="amber"
        value={String(followUpCount)}
        caption="10+ days"
      />
      <Tile
        label="Texts Synced"
        icon={MessageSquare}
        tone="violet"
        value={String(textsSynced)}
        caption={scanCaption}
      />
    </section>
  );
}
