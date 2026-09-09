import { CalendarDays, ChevronRight, ClipboardList, Dumbbell, Swords } from "lucide-react";
import Link from "next/link";

import ModulePageShell from "@/components/ModulePageShell";
import {
  TEAM_OPERATIONS_INTRA_SQUAD_ROUTE,
  TEAM_OPERATIONS_PRACTICE_ROUTE,
  TEAM_OPERATIONS_SCHEDULE_ROUTE,
  TEAM_OPERATIONS_SCOUTING_ROUTE,
} from "@/lib/module-routes";

const CARDS = [
  {
    href: TEAM_OPERATIONS_SCHEDULE_ROUTE,
    title: "Schedule",
    description: "Competition calendar, travel, and match logistics.",
    icon: CalendarDays,
  },
  {
    href: TEAM_OPERATIONS_PRACTICE_ROUTE,
    title: "Practice",
    description: "Daily plans, drill library, and day-rule tracking.",
    icon: Dumbbell,
  },
  {
    href: TEAM_OPERATIONS_INTRA_SQUAD_ROUTE,
    title: "Intra Squad",
    description: "Singles results, rankings, and challenge matches.",
    icon: Swords,
  },
  {
    href: TEAM_OPERATIONS_SCOUTING_ROUTE,
    title: "Scouting",
    description: "Opponent players, team dossiers, and match reports.",
    icon: ClipboardList,
  },
] as const;

export default function TeamOperationsIndexPage() {
  return (
    <ModulePageShell
      title="Team Operations"
      subtitle="Schedule, practice, intra-squad competition, and opponent scouting."
    >
      <div className="grid gap-3">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex items-center justify-between rounded-card border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(17,24,39,0.04)] transition-colors hover:border-[var(--module-accent)]/35 hover:bg-[var(--module-tint)]/30"
            >
              <span className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-card bg-[var(--module-tint)] text-[var(--module-accent)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <strong className="block text-base text-text-primary">{card.title}</strong>
                  <span className="mt-1 block text-sm text-text-secondary">{card.description}</span>
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-text-secondary transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </ModulePageShell>
  );
}
