import { EMPTY_VALUE, formatDate, formatTime } from "@/lib/formatting";

import {
  RECRUITING_PLAN_LABELS,
  TOURNAMENT_LIFECYCLE_LABELS,
  type RecruitingPlan,
  type Tournament,
  type TournamentLifecycleStatus,
} from "./types";

export function formatTournamentDates(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return EMPTY_VALUE;
  if (startDate && endDate && startDate !== endDate) {
    return `${formatDate(startDate)} – ${formatDate(endDate)}`;
  }
  return formatDate(startDate ?? endDate);
}

export function tournamentLocationLine(tournament: Tournament): string | null {
  const parts = [tournament.location, tournament.venue].filter((value): value is string => Boolean(value?.trim()));
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function planLabel(plan: RecruitingPlan): string {
  return RECRUITING_PLAN_LABELS[plan];
}

export function lifecycleLabel(status: TournamentLifecycleStatus | null): string | null {
  return status ? TOURNAMENT_LIFECYCLE_LABELS[status] : null;
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value?.trim()) return EMPTY_VALUE;
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export const planToneClass: Record<RecruitingPlan, string> = {
  traveling: "bg-[var(--module-tint)] text-[var(--module-accent)] ring-1 ring-[var(--module-accent)]/15",
  watching: "bg-info/[0.08] text-info ring-1 ring-info/15",
  considering: "bg-warning/[0.12] text-warning ring-1 ring-warning/25",
  completed: "bg-app-background text-text-secondary ring-1 ring-black/[0.04]",
};

export const planAccentClass: Record<RecruitingPlan, string> = {
  traveling: "bg-[var(--module-accent)]",
  watching: "bg-info",
  considering: "bg-warning",
  completed: "bg-text-secondary/40",
};
