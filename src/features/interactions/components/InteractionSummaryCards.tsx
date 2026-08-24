"use client";

import { AlertCircle, CalendarDays, CheckCircle2, MessageCircle, type LucideIcon } from "lucide-react";

import { EMPTY_VALUE } from "@/lib/formatting";
import type { RecruitInteraction } from "../types";
import { buildInteractionSummary } from "../contactSummary";

const tileTone = {
  info: {
    card: "border-info/15 bg-info/[0.06]",
    icon: "bg-info/10 text-info",
    value: "text-info",
  },
  warning: {
    card: "border-warning/20 bg-warning/[0.09]",
    icon: "bg-warning/15 text-warning",
    value: "text-warning",
  },
  success: {
    card: "border-success/15 bg-success/[0.06]",
    icon: "bg-success/10 text-success",
    value: "text-success",
  },
  crimson: {
    card: "border-[var(--module-accent)]/15 bg-[var(--module-tint)]/70",
    icon: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    value: "text-[var(--module-accent)]",
  },
  muted: {
    card: "border-border/70 bg-app-background/60",
    icon: "bg-black/[0.04] text-text-secondary",
    value: "text-text-primary",
  },
} as const;

type TileTone = keyof typeof tileTone;

function SummaryTile({
  label,
  icon: Icon,
  tone,
  value,
  caption,
  empty = false,
}: {
  label: string;
  icon: LucideIcon;
  tone: TileTone;
  value: string;
  caption?: string | null;
  empty?: boolean;
}) {
  const styles = tileTone[tone];
  return (
    <div
      className={`flex min-h-[84px] min-w-0 items-center justify-between gap-3 rounded-control border px-3 py-2.5 ${styles.card}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium tracking-wide text-text-secondary uppercase">{label}</p>
        <p
          className={`mt-2 truncate text-[24px] leading-none font-semibold tabular-nums ${
            empty ? "text-text-secondary/70" : styles.value
          }`}
        >
          {value}
        </p>
        {caption ? (
          <p className="mt-1 truncate text-[11px] text-text-secondary">{caption}</p>
        ) : null}
      </div>
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </span>
    </div>
  );
}

export default function InteractionSummaryCards({
  interactions,
}: {
  interactions: RecruitInteraction[];
}) {
  const summary = buildInteractionSummary(interactions);
  const contactTone =
    summary.contactStatus === "follow_up"
      ? "crimson"
      : summary.contactStatus === "current"
        ? "success"
        : "muted";
  const contactIcon =
    summary.contactStatus === "follow_up"
      ? AlertCircle
      : summary.contactStatus === "current"
        ? CheckCircle2
        : AlertCircle;
  const contactValue =
    summary.contactStatus === "none"
      ? EMPTY_VALUE
      : summary.contactDays == null
        ? EMPTY_VALUE
        : String(summary.contactDays);

  return (
    <section aria-label="Interaction summary" className="min-w-0">
      <div className="grid w-full min-w-0 grid-cols-1 items-stretch gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Last Text"
          icon={MessageCircle}
          tone="info"
          value={summary.lastTextDateLabel}
          caption={
            summary.lastTextEmpty
              ? "No texts recorded."
              : summary.lastTextDirectionLabel
          }
          empty={summary.lastTextEmpty}
        />
        <SummaryTile
          label="Days Since Last Text"
          icon={CalendarDays}
          tone="warning"
          value={summary.daysSinceLastText == null ? EMPTY_VALUE : String(summary.daysSinceLastText)}
          empty={summary.daysSinceLastText == null}
        />
        <SummaryTile
          label={summary.contactLabel}
          icon={contactIcon}
          tone={contactTone}
          value={contactValue}
          caption={
            summary.contactStatus === "follow_up" && summary.contactDays != null
              ? `${summary.contactDays} days since contact`
              : summary.contactStatus === "none"
                ? "No text or call on file."
                : null
          }
          empty={summary.contactStatus === "none"}
        />
      </div>
    </section>
  );
}
