"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Trophy,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { useDrawerManager } from "@/components/workspace-drawer";
import InteractionForm, { type InteractionOption } from "@/features/interactions/components/InteractionForm";
import type { InteractionType, RecruitInteraction } from "@/features/interactions/types";
import { formatTournamentDates } from "@/features/tournaments/display";
import type { Tournament } from "@/features/tournaments/types";
import { formatDate, formatUtr, parseDisplayDate } from "@/lib/formatting";
import {
  RECRUITING_INTERACTIONS_ROUTE,
  RECRUITING_LIST_ROUTE,
  RECRUITING_TOURNAMENTS_ROUTE,
  recruitingPersonPath,
  recruitingTournamentPath,
} from "@/lib/module-routes";

import { DASHBOARD_COMMIT_CLASS_YEAR, type RankedDashboardRecruit } from "../dashboard";
import type { DenisonCommitRecruit } from "../directory";
import { writeStoredRecruitingDirectoryView } from "../directorySessionState";

type Tone = "red" | "violet" | "orange" | "green";

const TONE: Record<
  Tone,
  { tile: string; header: string; accent: string; meta: string; hover: string }
> = {
  red: {
    tile: "bg-[var(--module-accent)] text-surface",
    header: "bg-[linear-gradient(180deg,rgba(200,16,46,0.10),rgba(200,16,46,0.03))]",
    accent: "bg-[var(--module-accent)]",
    meta: "text-[var(--module-accent)]",
    hover: "hover:bg-[var(--module-accent)]/[0.04]",
  },
  violet: {
    tile: "bg-research text-surface",
    header: "bg-[linear-gradient(180deg,rgba(124,58,237,0.12),rgba(124,58,237,0.03))]",
    accent: "bg-research",
    meta: "text-research",
    hover: "hover:bg-research/[0.05]",
  },
  orange: {
    tile: "bg-warning text-surface",
    header: "bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(245,158,11,0.04))]",
    accent: "bg-warning",
    meta: "text-warning",
    hover: "hover:bg-warning/[0.07]",
  },
  green: {
    tile: "bg-success text-surface",
    header: "bg-[linear-gradient(180deg,rgba(22,163,74,0.12),rgba(22,163,74,0.03))]",
    accent: "bg-success",
    meta: "text-success",
    hover: "hover:bg-success/[0.06]",
  },
};

const INTERACTION_CHIP: Record<InteractionType, { icon: LucideIcon; chip: string; tile: string }> = {
  text: {
    icon: MessageCircle,
    chip: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    tile: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
  },
  message: {
    icon: MessageCircle,
    chip: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    tile: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
  },
  call: {
    icon: Phone,
    chip: "bg-info/10 text-info",
    tile: "bg-info/10 text-info",
  },
  email: {
    icon: Mail,
    chip: "bg-research/10 text-research",
    tile: "bg-research/10 text-research",
  },
  visit: {
    icon: MapPin,
    chip: "bg-success/10 text-success",
    tile: "bg-success/10 text-success",
  },
  meeting: {
    icon: Users,
    chip: "bg-warning/15 text-warning",
    tile: "bg-warning/15 text-warning",
  },
  note: {
    icon: StickyNote,
    chip: "bg-knowledge/10 text-knowledge",
    tile: "bg-knowledge/10 text-knowledge",
  },
  other: {
    icon: MessageCircle,
    chip: "bg-app-background text-text-secondary",
    tile: "bg-app-background text-text-secondary",
  },
};

const DIRECTION_LABEL: Record<string, string> = {
  inbound: "Inbound",
  outbound: "Outbound",
  two_way: "Two-way",
  unknown: "Unknown",
};

function previewNotes(notes: string | null): string | null {
  const text = notes?.replace(/\s+/g, " ").trim();
  return text || null;
}

function typeLabel(type: string): string {
  return type ? `${type[0]!.toUpperCase()}${type.slice(1)}` : "Interaction";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function shortDate(value: string): string {
  const date = parseDisplayDate(value);
  if (!date) return formatDate(value);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function monthDay(value: string | null): { month: string; day: string } | null {
  if (!value) return null;
  const date = parseDisplayDate(value);
  if (!date) return null;
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date).toUpperCase(),
    day: String(date.getDate()),
  };
}

function DashboardCard({
  title,
  meta,
  tone,
  icon: Icon,
  footer,
  children,
}: {
  title: string;
  meta?: string;
  tone: Tone;
  icon: LucideIcon;
  footer?: { href: string; label: string; onClick?: () => void };
  children: ReactNode;
}) {
  const palette = TONE[tone];
  return (
    <section
      aria-label={title}
      className="relative overflow-hidden rounded-card border border-border bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${palette.accent}`} />
      <header
        className={`flex h-11 items-center gap-2.5 border-b border-border/60 pr-3.5 pl-[17px] ${palette.header}`}
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control ${palette.tile}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.1} />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-text-primary">
          {title}
        </h2>
        {meta ? <span className={`shrink-0 text-[11px] font-semibold ${palette.meta}`}>{meta}</span> : null}
      </header>
      <div className="min-w-0">{children}</div>
      {footer ? (
        <div className="border-t border-border/60 px-3.5 py-1.5">
          {footer.onClick ? (
            <button
              type="button"
              onClick={footer.onClick}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--module-accent)] hover:underline"
            >
              {footer.label}
              <ArrowRight className="h-3 w-3" strokeWidth={2.2} />
            </button>
          ) : (
            <Link
              href={footer.href}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--module-accent)] hover:underline"
            >
              {footer.label}
              <ArrowRight className="h-3 w-3" strokeWidth={2.2} />
            </Link>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default function RecruitingDashboard({
  recentInteractions,
  interactionRecruits,
  interactionTournaments,
  topRanked,
  upcomingTournaments,
  commits,
}: {
  recentInteractions: RecruitInteraction[];
  interactionRecruits: InteractionOption[];
  interactionTournaments: InteractionOption[];
  topRanked: RankedDashboardRecruit[];
  upcomingTournaments: Tournament[];
  commits: DenisonCommitRecruit[];
}) {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();

  function openInteraction(interaction: RecruitInteraction) {
    openDrawer({
      id: `edit-recruit-interaction-${interaction.id}`,
      title: "Interaction",
      subtitle: "Recruiting · Interactions",
      hideFooter: true,
      content: (
        <InteractionForm
          key={interaction.id}
          interaction={interaction}
          recruits={interactionRecruits}
          tournaments={interactionTournaments}
          onSaved={closeDrawer}
          onCancel={closeDrawer}
        />
      ),
    });
  }

  function openRankView() {
    writeStoredRecruitingDirectoryView("rank");
    router.push(RECRUITING_LIST_ROUTE);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="relative pl-3.5">
        <span
          aria-hidden="true"
          className="absolute top-0.5 bottom-0.5 left-0 w-[3px] rounded-full bg-[var(--module-accent)]"
        />
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Recruiting Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">Recruiting activity at a glance</p>
      </header>

      <div data-recruiting-dashboard-grid="">
        <div data-recruiting-dashboard-col="">
          <section>
            <DashboardCard
              title="Recent Interactions"
              meta="Last 10"
              tone="red"
              icon={MessageCircle}
              footer={{ href: RECRUITING_INTERACTIONS_ROUTE, label: "View all interactions" }}
            >
              {recentInteractions.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-text-secondary">No interactions yet.</p>
              ) : (
                <ul data-dashboard-recent-list="">
                  {recentInteractions.map((interaction) => {
                    const notes = previewNotes(interaction.notes);
                    const style = INTERACTION_CHIP[interaction.interactionType] ?? INTERACTION_CHIP.other;
                    const TypeIcon = style.icon;
                    const direction = interaction.direction
                      ? DIRECTION_LABEL[interaction.direction]
                      : null;
                    return (
                      <li key={interaction.id} className={`flex gap-2.5 px-3.5 py-1.5 ${TONE.red.hover}`}>
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-control ${style.tile}`}
                        >
                          <TypeIcon className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <Link
                              href={recruitingPersonPath(interaction.recruitPersonId)}
                              className="min-w-0 truncate text-[13px] font-semibold text-text-primary hover:text-[var(--module-accent)] hover:underline"
                            >
                              {interaction.recruitName}
                            </Link>
                            <time className="ml-auto shrink-0 text-[11px] text-text-secondary">
                              {shortDate(interaction.occurredAt)}
                            </time>
                          </div>
                          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                            <span
                              className={`inline-flex h-[18px] items-center rounded-full px-1.5 text-[10px] font-semibold tracking-wide uppercase ${style.chip}`}
                            >
                              {typeLabel(interaction.interactionType)}
                            </span>
                            {direction && direction !== "Unknown" ? (
                              <span className="truncate text-[11px] text-text-secondary">{direction}</span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => openInteraction(interaction)}
                            className="mt-0.5 w-full truncate text-left text-[12px] text-text-secondary hover:text-text-primary hover:underline"
                          >
                            {notes ?? "Open interaction"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DashboardCard>
          </section>

          <section>
            <DashboardCard
              title="Upcoming Tournaments"
              meta="Next 5"
              tone="orange"
              icon={CalendarDays}
              footer={{ href: RECRUITING_TOURNAMENTS_ROUTE, label: "View all tournaments" }}
            >
              {upcomingTournaments.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-text-secondary">No upcoming tournaments.</p>
              ) : (
                <ul>
                  {upcomingTournaments.map((tournament) => {
                    const date = monthDay(tournament.startDate);
                    return (
                      <li key={tournament.id}>
                        <Link
                          href={recruitingTournamentPath(tournament.id)}
                          className={`flex items-center gap-2.5 px-3.5 py-1.5 ${TONE.orange.hover}`}
                        >
                          {date ? (
                            <span className="flex h-[38px] w-9 shrink-0 flex-col items-center justify-center rounded-control bg-warning/15 text-warning">
                              <span className="text-[8px] font-bold tracking-[0.12em]">{date.month}</span>
                              <span className="text-[14px] leading-none font-bold tabular-nums">{date.day}</span>
                            </span>
                          ) : (
                            <span className="flex h-[38px] w-9 shrink-0 items-center justify-center rounded-control bg-warning/15 text-[10px] font-bold text-warning">
                              TBD
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-text-primary">{tournament.name}</p>
                            <p className="mt-0.5 truncate text-[11px] text-text-secondary">
                              {formatTournamentDates(tournament.startDate, tournament.endDate)} ·{" "}
                              {tournament.location?.trim() || "TBD"}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/12 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                            <Users className="h-3 w-3" strokeWidth={2.1} />
                            {tournament.linkedRecruits.length}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DashboardCard>
          </section>
        </div>

        <div data-recruiting-dashboard-col="">
          <section>
            <DashboardCard
              title="Top Ranked Recruits"
              meta="Top 5"
              tone="violet"
              icon={Trophy}
              footer={{
                href: RECRUITING_LIST_ROUTE,
                label: "View rankings",
                onClick: openRankView,
              }}
            >
              {topRanked.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-text-secondary">No ranked recruits yet.</p>
              ) : (
                <ol>
                  {topRanked.map((recruit) => {
                    const first = recruit.coachRank === 1;
                    return (
                      <li key={recruit.personId}>
                        <Link
                          href={recruitingPersonPath(recruit.personId)}
                          className={`flex items-center gap-2.5 px-3.5 py-1.5 ${TONE.violet.hover} ${
                            first ? "bg-research/[0.05]" : ""
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                              first ? "bg-research text-surface" : "bg-research/12 text-research"
                            }`}
                          >
                            {recruit.coachRank}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-text-primary">
                              {recruit.name}
                            </span>
                            <p className="mt-0.5 text-[11px] text-text-secondary">
                              {[
                                recruit.classYear ? String(recruit.classYear) : null,
                                recruit.trnRank !== undefined ? `TRN #${recruit.trnRank}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                          </div>
                          {recruit.utr !== undefined ? (
                            <span className="shrink-0 text-right">
                              <span className="block text-[13px] font-semibold tabular-nums text-text-primary">
                                {formatUtr(recruit.utr)}
                              </span>
                              <span className="text-[10px] font-medium tracking-wide text-text-secondary uppercase">
                                UTR
                              </span>
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </DashboardCard>
          </section>

          <section>
            <DashboardCard title="Denison Commits" tone="green" icon={BadgeCheck}>
              <div className="mx-3.5 mt-2.5 flex items-center gap-3 rounded-control bg-success/[0.08] px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-success text-surface">
                  <BadgeCheck className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[22px] leading-none font-semibold tabular-nums text-success">
                    {commits.length}
                  </p>
                  <p className="mt-1 text-[10px] font-bold tracking-[0.14em] text-success/85 uppercase">
                    Denison Commits
                  </p>
                  <p className="text-[10px] font-semibold tracking-wide text-success/70 uppercase">
                    Class of {DASHBOARD_COMMIT_CLASS_YEAR}
                  </p>
                </div>
              </div>
              {commits.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-text-secondary">No recruits committed yet.</p>
              ) : (
                <ul className="mt-1">
                  {commits.map((recruit) => (
                    <li key={recruit.personId}>
                      <Link
                        href={recruitingPersonPath(recruit.personId)}
                        className={`flex items-center gap-2.5 px-3.5 py-1.5 ${TONE.green.hover}`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/12 text-[10px] font-bold text-success">
                          {initials(recruit.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-text-primary">
                            {recruit.name}
                          </span>
                          {recruit.classYear ? (
                            <span className="text-[11px] text-text-secondary">{recruit.classYear}</span>
                          ) : null}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-success/70" strokeWidth={2.1} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardCard>
          </section>
        </div>
      </div>
    </div>
  );
}
