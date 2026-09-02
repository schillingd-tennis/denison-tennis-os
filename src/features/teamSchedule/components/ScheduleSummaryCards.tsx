import type { ScheduleKpis } from "../types";

const cards: { key: keyof ScheduleKpis; label: string; accent: string; caption?: (kpis: ScheduleKpis) => string }[] = [
  { key: "countableDates", label: "Countable Dates", accent: "bg-[var(--module-accent)]" },
  { key: "teamMatches", label: "Team Matches", accent: "bg-info" },
  { key: "ncacMatches", label: "NCAC Matches", accent: "bg-blue-500" },
  {
    key: "home",
    label: "Home / Away / Neutral",
    accent: "bg-warning",
    caption: (kpis) => `${kpis.home} / ${kpis.away} / ${kpis.neutral}`,
  },
  { key: "tentativeOrTbd", label: "TBD / Tentative", accent: "bg-amber-500" },
  { key: "tournamentsAndEvents", label: "Tournaments / Events", accent: "bg-success" },
];

export default function ScheduleSummaryCards({ kpis }: { kpis: ScheduleKpis }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const value =
          card.key === "home" ? `${kpis.home}/${kpis.away}/${kpis.neutral}` : String(kpis[card.key]);
        return (
          <div
            key={card.key}
            className="overflow-hidden rounded-card border border-[var(--module-border)] bg-surface"
          >
            <span aria-hidden="true" className={`block h-0.5 ${card.accent}`} />
            <div className="px-3 py-2">
              <p className="text-base leading-none font-semibold tabular-nums tracking-tight text-text-primary">
                {value}
              </p>
              <p className="mt-1 text-[10px] font-medium tracking-wide text-text-secondary uppercase">
                {card.label}
              </p>
              {card.caption ? (
                <p className="mt-0.5 truncate text-[10px] text-text-secondary">{card.caption(kpis)}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
