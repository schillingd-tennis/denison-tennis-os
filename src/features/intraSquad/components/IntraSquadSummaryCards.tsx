import { EMPTY_VALUE, formatPercent } from "@/lib/formatting";

import { averageMatchWeight, formatPlayedAtLabel, uniquePlayerCount } from "../display";
import type { IntraSquadMatch } from "../types";
import styles from "./intraSquadDashboard.module.css";

export default function IntraSquadSummaryCards({ matches }: { matches: IntraSquadMatch[] }) {
  const average = averageMatchWeight(matches);
  const last = matches[0] ?? null;
  const cards = [
    { id: "total", label: "Total Matches", value: String(matches.length) },
    { id: "players", label: "Active Players", value: String(uniquePlayerCount(matches)) },
    {
      id: "weight",
      label: "Avg Match Weight",
      value: average == null ? EMPTY_VALUE : average.toFixed(1),
    },
    {
      id: "last",
      label: "Last Match",
      value: last ? formatPlayedAtLabel(last.playedAt) : EMPTY_VALUE,
    },
  ];

  return (
    <section
      data-intra-squad-section="summary"
      aria-label="Intra Squad summary"
      className={styles.metricsCard}
    >
      {cards.map((card) => (
        <article key={card.id} className={styles.metric}>
          <p className="text-base leading-none font-semibold tabular-nums tracking-tight text-text-primary">
            {card.value}
          </p>
          <p className="mt-1 text-[10px] font-medium tracking-wide text-text-secondary uppercase">
            {card.label}
          </p>
        </article>
      ))}
    </section>
  );
}

export function formatWinPct(value: number | null): string {
  return value == null ? EMPTY_VALUE : formatPercent(value);
}
