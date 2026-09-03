"use client";

import { useState } from "react";

import styles from "./intraSquadDashboard.module.css";

export default function HowRankingsWorkCard() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <section data-intra-squad-section="how-rankings" className={styles.card}>
      <span aria-hidden="true" className={styles.cardAccent} />
      <div className={`${styles.cardBody} gap-2`}>
        <h2 className="text-sm font-semibold text-text-primary">How Rankings Work</h2>
        <p className="text-sm text-text-secondary">
          Three independent systems: Weighted Points (simple accounting), Match Value (quality of
          competitive evidence), and Elo (opponent-adjusted rating).
        </p>
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">Weighted Points:</span> Completed Win =
          +1 × weight · Completed Loss = −1 × weight · Unfinished Lead = +0.5 × weight · Unfinished
          Trail = −0.5 × weight
        </p>
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">Match Value:</span> Full completed = ±1.00
          × weight · One-set completed = ±0.60 × weight · Unfinished = sets first (±0.45 per set
          advantage), then current-set games (±0.20 max), capped at ±0.90, then × weight.
        </p>
        <p className="text-sm text-text-secondary">
          Unfinished matches do not count in official W-L or Win %.
        </p>
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">Elo:</span> Every player starts at 1500.
          Ratings move after each match based on opponent strength, result (including unfinished
          partial credit), and match weight.
        </p>
        <button
          type="button"
          className="self-start text-xs font-semibold text-info hover:underline"
          onClick={() => setShowDetails((open) => !open)}
          aria-expanded={showDetails}
        >
          {showDetails ? "Hide details" : "Learn more"}
        </button>
        {showDetails ? (
          <div className="rounded-control border border-border/70 bg-background/50 px-3 py-2 text-xs text-text-secondary">
            <p>
              Elo expected score = 1 ÷ (1 + 10^((opponent − player) ÷ 400)). New rating = old + K ×
              (actual − expected). K by weight: 1 → 24, 2 → 36, 3 → 48.
            </p>
            <p className="mt-1">
              Match Value unfinished = (setAdvantage × 0.45) + clamp(gameDiff ÷ 4, ±1) × 0.20,
              clamped to ±0.90, then × weight. A completed set keeps meaningful value even if the
              current set is behind. Dominance modifier is reserved for later (currently 1.0).
            </p>
            <p className="mt-1">
              Elo and Match Value always rebuild from match history — edits and deletes recalculate
              automatically.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
