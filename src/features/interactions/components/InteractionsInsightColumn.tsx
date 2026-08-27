import { Activity, AlertCircle } from "lucide-react";
import Link from "next/link";

import type { SyncStatus } from "@/features/interactions/appleMessagesSync/ports";
import { recruitingPersonPath } from "@/lib/module-routes";

import type { ActivityCounts, FollowUpRecruit } from "../centralInsights";
import { followUpDaysLabel } from "../centralInsights";
import InteractionsAppleMessagesPanel from "./InteractionsAppleMessagesPanel";

function ActivityRow({
  label,
  count,
  max,
  barClass,
}: {
  label: string;
  count: number;
  max: number;
  barClass: string;
}) {
  const width = max > 0 && count > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="w-12 shrink-0 text-[13px] text-text-secondary">{label}</span>
      <div className="h-2 min-w-0 flex-1 rounded-full bg-black/[0.04]">
        <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-[13px] font-medium tabular-nums text-text-primary">{count}</span>
    </div>
  );
}

export default function InteractionsInsightColumn({
  followUps,
  activity,
  appleStatus,
  appleError,
}: {
  followUps: FollowUpRecruit[];
  activity: ActivityCounts;
  appleStatus: SyncStatus;
  appleError: string | null;
  signedIn?: boolean;
}) {
  const max = Math.max(activity.texts, activity.calls, activity.emails, activity.visits, 0);
  return (
    <aside className="flex min-w-0 flex-col gap-5" data-interactions-insights="">
      <section className="rounded-card border border-black/[0.06] bg-surface px-4 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-control bg-[var(--module-accent)]/10 text-[var(--module-accent)]">
            <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <h3 className="text-sm font-semibold text-text-primary">Communication Alerts</h3>
        </div>
        {followUps.length === 0 ? (
          <p className="mt-3 text-[13px] text-text-secondary">No follow-ups overdue.</p>
        ) : (
          <ul className="mt-3">
            {followUps.map((row) => (
              <li key={row.recruitPersonId} className="border-b border-black/[0.06] last:border-b-0">
                <Link
                  href={recruitingPersonPath(row.recruitPersonId)}
                  className="flex items-baseline justify-between gap-3 py-2.5 text-[13px] text-text-primary hover:underline"
                >
                  <span className="min-w-0 truncate font-medium">{row.recruitName}</span>
                  <span className="shrink-0 text-[13px] text-[var(--module-accent)]">
                    {followUpDaysLabel(row.daysSinceContact)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card border border-black/[0.06] bg-surface px-4 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-control bg-black/[0.04] text-text-secondary">
            <Activity className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <h3 className="text-sm font-semibold text-text-primary">Activity by Type</h3>
        </div>
        <div className="mt-3 flex flex-col">
          <ActivityRow label="Text" count={activity.texts} max={max} barClass="bg-[var(--module-accent)]" />
          <ActivityRow label="Call" count={activity.calls} max={max} barClass="bg-info" />
          <ActivityRow label="Email" count={activity.emails} max={max} barClass="bg-research" />
          <ActivityRow label="Visit" count={activity.visits} max={max} barClass="bg-warning" />
        </div>
      </section>

      <InteractionsAppleMessagesPanel status={appleStatus} error={appleError} />
    </aside>
  );
}
