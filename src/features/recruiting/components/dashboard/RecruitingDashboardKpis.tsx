import { AlertCircle, MessageCircle, Plane, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { DashboardKpis } from "../../dashboard";
import styles from "./recruitingDashboard.module.css";

const KPI_ITEMS: {
  id: keyof DashboardKpis;
  label: string;
  icon: LucideIcon;
  tint: string;
}[] = [
  {
    id: "activeRecruits",
    label: "Active Recruits",
    icon: Users,
    tint: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
  },
  {
    id: "needsAttention",
    label: "Needs Attention",
    icon: AlertCircle,
    tint: "bg-warning/15 text-warning",
  },
  {
    id: "visitsNext30Days",
    label: "Visits Next 30 Days",
    icon: Plane,
    tint: "bg-info/10 text-info",
  },
  {
    id: "newTexts",
    label: "New Messages",
    icon: MessageCircle,
    tint: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
  },
];

export default function RecruitingDashboardKpis({ kpis }: { kpis: DashboardKpis }) {
  return (
    <section
      data-recruiting-dashboard-section="kpis"
      aria-label="Recruiting summary"
      className={styles.kpis}
    >
      {KPI_ITEMS.map((item) => {
        const value = kpis[item.id];
        const Icon = item.icon;
        return (
          <article
            key={item.id}
            data-recruiting-dashboard-kpi={item.id}
            className="rounded-card border border-border bg-surface px-3 py-2.5 shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control ${item.tint}`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.1} />
              </span>
              <p className="truncate text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                {item.label}
              </p>
            </div>
            <p className="mt-1.5 text-[22px] leading-none font-semibold tracking-tight text-text-primary tabular-nums">
              {value == null ? "—" : value}
            </p>
            {value == null && item.id !== "newTexts" ? (
              <p className="mt-1 text-[10px] font-medium text-text-secondary">Coming soon</p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
