import type { TournamentKpis } from "../types";

const cards: { key: keyof TournamentKpis; label: string; accent: string }[] = [
  { key: "travelingTo", label: "Traveling To", accent: "bg-[var(--module-accent)]" },
  { key: "watching", label: "Watching", accent: "bg-info" },
  { key: "upcoming", label: "Upcoming", accent: "bg-warning" },
  { key: "linkedRecruits", label: "Linked Recruits", accent: "bg-success" },
];

export default function TournamentKpiRow({ kpis }: { kpis: TournamentKpis }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.key} className="overflow-hidden rounded-card border border-[var(--module-border)] bg-surface">
          <span aria-hidden="true" className={`block h-0.5 ${card.accent}`} />
          <div className="px-4 py-3">
            <p className="text-[22px] leading-none font-semibold tracking-tight text-text-primary tabular-nums">
              {kpis[card.key]}
            </p>
            <p className="mt-1.5 text-[11px] font-medium tracking-wide text-text-secondary uppercase">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
