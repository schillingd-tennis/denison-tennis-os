import type { LucideIcon } from "lucide-react";
import { Bell, CheckCircle2, Star, Users } from "lucide-react";

import type { RecruitingDirectoryKpis } from "../directorySummary";

const cards: {
  key: keyof RecruitingDirectoryKpis | "needAttention";
  label: string;
  icon: LucideIcon;
  tone: "crimson" | "research" | "success" | "warning";
  placeholder?: true;
}[] = [
  { key: "totalRecruits", label: "Total Recruits", icon: Users, tone: "crimson" },
  // Label is dashboard-facing copy only; metric remains Priority Elite (priority1Recruits).
  { key: "priority1Recruits", label: "Tier 1 Recruits", icon: Star, tone: "research" },
  { key: "commits", label: "Commits", icon: CheckCircle2, tone: "success" },
  { key: "needAttention", label: "Need Attention", icon: Bell, tone: "warning", placeholder: true },
];

const toneClass: Record<(typeof cards)[number]["tone"], string> = {
  crimson: "border-[var(--module-accent)]/15 bg-[var(--module-tint)]/70",
  research: "border-research/12 bg-research/[0.07]",
  success: "border-success/15 bg-success/[0.06]",
  warning: "border-warning/18 bg-warning/[0.08]",
};

const wellClass: Record<(typeof cards)[number]["tone"], string> = {
  crimson: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
  research: "bg-research/10 text-research",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
};

const valueClass: Record<(typeof cards)[number]["tone"], string> = {
  crimson: "text-[var(--module-accent)]",
  research: "text-research",
  success: "text-success",
  warning: "text-warning",
};

export default function RecruitingKpiRow({ kpis }: { kpis: RecruitingDirectoryKpis }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = card.placeholder ? "—" : kpis[card.key as keyof RecruitingDirectoryKpis];
        return (
          <div
            key={card.key}
            className={`flex min-h-[94px] items-center justify-between gap-3 rounded-card border px-5 py-3.5 ${toneClass[card.tone]}`}
          >
            <div className="min-w-0">
              <p className={`text-[28px] leading-none font-semibold tabular-nums tracking-tight ${valueClass[card.tone]}`}>
                {value}
              </p>
              <p className="mt-1.5 text-[11px] font-medium tracking-wide text-text-secondary uppercase">
                {card.label}
              </p>
            </div>
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${wellClass[card.tone]}`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </span>
          </div>
        );
      })}
    </div>
  );
}
