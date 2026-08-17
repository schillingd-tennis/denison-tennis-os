import {
  Mail,
  Phone,
  StickyNote,
  TrendingUp,
  UserRoundPen,
} from "lucide-react";

import { typeRole } from "@/components/typography";

import type { ActivityItem } from "./types";

/** Intentional sample feed until a real activity domain exists (BP-031F). */
export const PLACEHOLDER_ACTIVITY: ActivityItem[] = [
  {
    id: "sample-email",
    title: "Email sent",
    timestamp: "Yesterday",
    description: "Season schedule shared",
    icon: Mail,
  },
  {
    id: "sample-call",
    title: "Phone call",
    timestamp: "Aug 4",
    description: "Discussed fall training",
    icon: Phone,
  },
  {
    id: "sample-profile",
    title: "Profile updated",
    timestamp: "Aug 2",
    description: "Major changed to Economics",
    icon: UserRoundPen,
  },
  {
    id: "sample-utr",
    title: "UTR updated",
    timestamp: "Jul 30",
    description: "11.66",
    icon: TrendingUp,
  },
  {
    id: "sample-note",
    title: "Note added",
    timestamp: "Jul 28",
    description: "Practice focus: serve +1",
    icon: StickyNote,
  },
];

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.icon;
  return (
    <li className="flex gap-3 border-b border-border/50 py-3 last:border-b-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-background text-text-secondary">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{item.title}</p>
        <time className={`mt-0.5 block text-xs ${typeRole.metadataEmpty}`}>
          {item.timestamp}
        </time>
        {item.description ? (
          <p className="mt-0.5 text-xs leading-snug text-text-secondary">
            {item.description}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Recent activity feed (BP-031F / BP-032A).
 * Full-width workspace section — reusable for players, recruits, coaches, alumni.
 * Prefer typed Communication → ActivityItem mapping from the Communication Engine.
 * Falls back to intentional placeholder rows when `items` is empty.
 */
export default function RecentActivity({
  items,
  title = "Recent Activity",
  subtitle = "Latest updates for this player",
  className,
}: {
  items?: ActivityItem[];
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const rows =
    items && items.length > 0 ? items.slice(0, 5) : PLACEHOLDER_ACTIVITY;

  return (
    <section
      className={`rounded-card border border-[var(--module-border)] bg-surface px-5 py-5 shadow-[0_8px_24px_rgba(17,24,39,0.04)] ${className ?? ""}`}
      aria-label={title}
    >
      <div className="mb-4">
        <h2 className={typeRole.sectionTitle}>{title}</h2>
        {subtitle ? (
          <p className={`mt-1.5 text-sm ${typeRole.metadataEmpty}`}>{subtitle}</p>
        ) : null}
      </div>
      <ol className="grid gap-x-10 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </ol>
    </section>
  );
}
