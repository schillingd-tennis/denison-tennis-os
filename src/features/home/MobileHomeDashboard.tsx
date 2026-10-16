"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardPenLine, MapPin, Swords, Target, Trophy, UserRoundSearch } from "lucide-react";
import { MATCHES_ROUTE, RECRUITING_LIST_ROUTE, RECRUITING_TOURNAMENTS_ROUTE, TEAM_OPERATIONS_INTRA_SQUAD_ROUTE, TEAM_OPERATIONS_PRACTICE_ROUTE, TEAM_OPERATIONS_SCHEDULE_ROUTE, TEAM_OPERATIONS_SCOUTING_ROUTE, recruitingTournamentPath } from "@/lib/module-routes";

export type MobilePracticeSummary = { title: string; startTime: string; endTime: string; location: string; status: "draft" | "published" | "completed" } | null;
export type MobileTournamentSummary = { id: string; name: string; startDate: string | null; endDate: string | null; location: string | null; level: string | null; linkedRecruitCount: number };

const shortcuts = [
  { label: "Recruits", detail: "Profiles, notes, and follow-ups", href: RECRUITING_LIST_ROUTE, icon: UserRoundSearch },
  { label: "Intrasquad entry", detail: "Record today’s scores", href: TEAM_OPERATIONS_INTRA_SQUAD_ROUTE, icon: Swords },
  { label: "Scouting", detail: "Add or review reports", href: TEAM_OPERATIONS_SCOUTING_ROUTE, icon: Target },
  { label: "Match results", detail: "Enter official results", href: MATCHES_ROUTE, icon: Trophy },
] as const;

function dateParts(value: string | null) {
  if (!value) return { month: "TBD", day: "—" };
  const parsed = new Date(value + "T12:00:00");
  return { month: parsed.toLocaleDateString("en-US", { month: "short" }).toUpperCase(), day: parsed.toLocaleDateString("en-US", { day: "numeric" }) };
}
function dateRange(start: string | null, end: string | null) {
  if (!start) return "Date TBD";
  const format = (value: string) => new Date(value + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return !end || end === start ? format(start) : format(start) + "–" + format(end);
}
function timeRange(practice: NonNullable<MobilePracticeSummary>) {
  const format = (value: string) => {
    if (!value) return "TBD";
    const [hours = "0", minutes = "00"] = value.split(":");
    return new Date(2000, 0, 1, Number(hours), Number(minutes)).toLocaleTimeString("en-US", { hour: "numeric", minute: minutes === "00" ? undefined : "2-digit" });
  };
  return !practice.startTime && !practice.endTime ? "Time TBD" : format(practice.startTime) + "–" + format(practice.endTime);
}

export default function MobileHomeDashboard({ practice, tournaments }: { practice: MobilePracticeSummary; tournaments: MobileTournamentSummary[] }) {
  return <div className="-mx-4 -my-4 min-h-full bg-app-background pb-3 md:hidden" data-mobile-home-dashboard="">
    <div className="space-y-5 px-4 py-4">
      <section className="overflow-hidden rounded-[18px] bg-denison-red text-white shadow-[0_10px_24px_rgba(200,16,46,0.22)]" aria-labelledby="mobile-practice-heading">
        <div className="p-4"><p className="text-[11px] font-semibold tracking-[0.13em] text-white/75 uppercase">Today’s practice</p><h2 id="mobile-practice-heading" className="mt-1.5 text-xl font-semibold tracking-tight">{practice?.title ?? "No practice plan saved"}</h2>
          {practice ? <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/85"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{timeRange(practice)}</span><span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{practice.location || "Location TBD"}</span></div> : <p className="mt-2 text-sm text-white/80">Create today’s plan or open the practice workspace.</p>}
        </div>
        <Link href={TEAM_OPERATIONS_PRACTICE_ROUTE + "?tab=daily-plan"} className="flex min-h-12 items-center justify-between border-t border-white/20 bg-white/10 px-4 text-sm font-semibold">{practice ? "Open practice plan" : "Go to Practice"}<ArrowRight className="h-4 w-4" /></Link>
      </section>
      <section aria-labelledby="mobile-quick-actions-heading">
        <div className="mb-2.5 flex items-center justify-between"><h2 id="mobile-quick-actions-heading" className="text-base font-semibold text-text-primary">Quick actions</h2><Link href={TEAM_OPERATIONS_SCHEDULE_ROUTE} className="text-xs font-semibold text-denison-red">Full schedule</Link></div>
        <div className="grid grid-cols-2 gap-2.5">{shortcuts.map(({ label, detail, href, icon: Icon }) => <Link key={href} href={href} className="min-h-[108px] rounded-card border border-border bg-surface p-3.5 shadow-sm transition active:scale-[0.98]"><span className="flex h-9 w-9 items-center justify-center rounded-control bg-red-50 text-denison-red"><Icon className="h-[18px] w-[18px]" /></span><span className="mt-2.5 block text-sm font-semibold text-text-primary">{label}</span><span className="mt-1 block text-[11px] leading-snug text-text-secondary">{detail}</span></Link>)}</div>
      </section>
      <section aria-labelledby="mobile-tournaments-heading">
        <div className="mb-2.5 flex items-center justify-between gap-3"><div><h2 id="mobile-tournaments-heading" className="text-base font-semibold text-text-primary">Upcoming recruiting trips</h2><p className="mt-0.5 text-[11px] text-text-secondary">Tournaments marked Plan to Attend</p></div><Link href={RECRUITING_TOURNAMENTS_ROUTE} className="shrink-0 text-xs font-semibold text-denison-red">View all</Link></div>
        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">{tournaments.length ? tournaments.map((tournament) => { const parts = dateParts(tournament.startDate); return <Link key={tournament.id} href={recruitingTournamentPath(tournament.id)} className="flex min-h-[76px] items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"><span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-control bg-red-50 text-denison-red"><span className="text-[9px] font-bold tracking-wide">{parts.month}</span><strong className="text-lg leading-none">{parts.day}</strong></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text-primary">{tournament.name}</span><span className="mt-1 block truncate text-[11px] text-text-secondary">{dateRange(tournament.startDate, tournament.endDate)} · {tournament.location || "Location TBD"}</span><span className="mt-1 block text-[10px] font-semibold text-success">Plan to attend{tournament.level ? " · " + tournament.level : ""}</span></span><span className="shrink-0 text-right text-[10px] font-semibold text-text-secondary">{tournament.linkedRecruitCount}<br />recruits</span></Link>; }) : <div className="px-4 py-8 text-center"><ClipboardPenLine className="mx-auto h-6 w-6 text-text-secondary" /><p className="mt-2 text-sm font-semibold text-text-primary">No upcoming trips selected</p><Link href={RECRUITING_TOURNAMENTS_ROUTE} className="mt-2 inline-block text-xs font-semibold text-denison-red">Choose tournaments</Link></div>}</div>
      </section>
    </div>
    <nav className="sticky bottom-0 z-20 grid grid-cols-4 border-t border-border bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur" aria-label="Mobile dashboard navigation"><Link href="/" className="flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-denison-red"><CalendarDays className="h-5 w-5" />Today</Link><Link href={RECRUITING_LIST_ROUTE} className="flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-text-secondary"><UserRoundSearch className="h-5 w-5" />Recruits</Link><Link href={TEAM_OPERATIONS_INTRA_SQUAD_ROUTE} className="flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-text-secondary"><Swords className="h-5 w-5" />Intrasquad</Link><Link href={TEAM_OPERATIONS_SCHEDULE_ROUTE} className="flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-text-secondary"><ClipboardPenLine className="h-5 w-5" />Schedule</Link></nav>
  </div>;
}
