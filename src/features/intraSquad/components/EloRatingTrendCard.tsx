"use client";

import { useMemo, useState } from "react";

import EmptyState from "@/components/EmptyState";

import {
  ELO_STARTING_RATING,
  formatEloRating,
  topEloPlayers,
  type EloHistoryEvent,
  type EloRankingRow,
} from "../elo";
import { playerNameFor } from "../records";
import type { RosterPlayer } from "../types";
import styles from "./intraSquadDashboard.module.css";

const CHART_COLORS = [
  "#C8102E",
  "#1D4ED8",
  "#047857",
  "#B45309",
  "#7C3AED",
  "#0F766E",
  "#BE185D",
  "#334155",
];

type SeriesPoint = { playedAt: string; matchIndex: number; rating: number };

type PlayerSeries = {
  playerId: string;
  label: string;
  color: string;
  points: SeriesPoint[];
};

function buildSeries(
  rankings: readonly EloRankingRow[],
  selectedIds: readonly string[],
  roster: readonly RosterPlayer[],
): PlayerSeries[] {
  return selectedIds.map((playerId, index) => {
    const row = rankings.find((entry) => entry.playerId === playerId);
    const history = row?.history ?? [];
    const points: SeriesPoint[] = [
      { playedAt: "", matchIndex: 0, rating: ELO_STARTING_RATING },
      ...history.map((event: EloHistoryEvent, matchIndex) => ({
        playedAt: event.playedAt,
        matchIndex: matchIndex + 1,
        rating: event.ratingAfter,
      })),
    ];
    return {
      playerId,
      label: playerNameFor(playerId, roster),
      color: CHART_COLORS[index % CHART_COLORS.length]!,
      points,
    };
  });
}

function polylinePoints(
  points: SeriesPoint[],
  xFor: (index: number) => number,
  yFor: (rating: number) => number,
): string {
  return points.map((point, index) => `${xFor(index)},${yFor(point.rating)}`).join(" ");
}

export default function EloRatingTrendCard({
  rankings,
  roster,
}: {
  rankings: EloRankingRow[];
  roster: RosterPlayer[];
}) {
  const playersWithHistory = useMemo(
    () => rankings.filter((row) => row.matchesPlayed > 0),
    [rankings],
  );
  const defaultTop = useMemo(() => topEloPlayers(rankings, 5).map((row) => row.playerId), [rankings]);

  const [mode, setMode] = useState<"top5" | "all" | "player">("top5");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  const effectiveSelected = useMemo(() => {
    if (playersWithHistory.length === 0) return [] as string[];
    if (mode === "all") return playersWithHistory.map((row) => row.playerId);
    if (mode === "player") {
      const id = selectedPlayerId || playersWithHistory[0]?.playerId || "";
      return id ? [id] : [];
    }
    return defaultTop;
  }, [mode, selectedPlayerId, playersWithHistory, defaultTop]);

  const series = useMemo(
    () => buildSeries(rankings, effectiveSelected, roster),
    [rankings, effectiveSelected, roster],
  );

  const maxMatchIndex = Math.max(1, ...series.map((entry) => Math.max(0, ...entry.points.map((p) => p.matchIndex))));
  const allRatings = series.flatMap((entry) => entry.points.map((point) => point.rating));
  const minRating = allRatings.length ? Math.min(ELO_STARTING_RATING - 20, ...allRatings) : 1480;
  const maxRating = allRatings.length ? Math.max(ELO_STARTING_RATING + 20, ...allRatings) : 1520;
  const ratingPad = Math.max(10, (maxRating - minRating) * 0.08);
  const yMin = minRating - ratingPad;
  const yMax = maxRating + ratingPad;

  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 28, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  function xFor(index: number): number {
    if (maxMatchIndex <= 0) return pad.left;
    return pad.left + (index / maxMatchIndex) * innerW;
  }

  function yFor(rating: number): number {
    const t = (rating - yMin) / (yMax - yMin || 1);
    return pad.top + (1 - t) * innerH;
  }

  const baselineY = yFor(ELO_STARTING_RATING);
  const yTicks = [yMin, ELO_STARTING_RATING, yMax];

  return (
    <section data-intra-squad-section="elo-trend" className={styles.card}>
      <span aria-hidden="true" className={styles.cardAccent} />
      <div className={styles.cardBody}>
        <div className={`${styles.cardHeaderRow} mb-3`}>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Elo Rating Trend</h2>
            <p className="text-xs text-text-secondary">Rebuilt from match history · baseline 1500</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(
            [
              { id: "top5" as const, label: "Top 5" },
              { id: "all" as const, label: "All Players" },
              { id: "player" as const, label: "One Player" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={mode === option.id}
              onClick={() => setMode(option.id)}
              className={`h-8 rounded-control px-2.5 text-xs font-semibold ${
                mode === option.id
                  ? "bg-[var(--module-accent)] text-white"
                  : "border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
          {mode === "player" ? (
            <select
              className="h-8 min-w-[10rem] rounded-control border border-border bg-background px-2 text-xs text-text-primary"
              value={selectedPlayerId || playersWithHistory[0]?.playerId || ""}
              onChange={(event) => setSelectedPlayerId(event.target.value)}
              aria-label="Player for Elo trend"
            >
              {playersWithHistory.map((row) => (
                <option key={row.playerId} value={row.playerId}>
                  {playerNameFor(row.playerId, roster)}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {series.length === 0 ? (
          <div className={styles.eloShell}>
            <EmptyState
              compact
              title="No Elo history yet"
              description="Add an intra-squad match to chart Elo over time."
            />
          </div>
        ) : (
          <>
            <div className="min-w-0 overflow-x-auto">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-[13rem] w-full min-w-[20rem] text-text-secondary"
                role="img"
                aria-label="Elo rating trend chart"
              >
                <line
                  x1={pad.left}
                  y1={baselineY}
                  x2={width - pad.right}
                  y2={baselineY}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  strokeOpacity={0.45}
                />
                {yTicks.map((tick) => (
                  <text
                    key={tick}
                    x={pad.left - 6}
                    y={yFor(tick) + 3}
                    textAnchor="end"
                    className="fill-current"
                    style={{ fontSize: 10 }}
                  >
                    {formatEloRating(tick)}
                  </text>
                ))}
                <text
                  x={pad.left}
                  y={height - 8}
                  className="fill-current"
                  style={{ fontSize: 10 }}
                >
                  Start
                </text>
                <text
                  x={width - pad.right}
                  y={height - 8}
                  textAnchor="end"
                  className="fill-current"
                  style={{ fontSize: 10 }}
                >
                  Latest
                </text>
                {series.map((entry) => (
                  <g key={entry.playerId}>
                    <polyline
                      fill="none"
                      stroke={entry.color}
                      strokeWidth={2}
                      points={polylinePoints(entry.points, xFor, yFor)}
                    />
                    {entry.points.map((point, index) => (
                      <circle
                        key={`${entry.playerId}-${index}`}
                        cx={xFor(index)}
                        cy={yFor(point.rating)}
                        r={index === 0 ? 2.5 : 3}
                        fill={entry.color}
                      />
                    ))}
                  </g>
                ))}
              </svg>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {series.map((entry) => (
                <li key={entry.playerId} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: entry.color }}
                  />
                  <span className="text-text-primary">{entry.label}</span>
                  <span className="tabular-nums">
                    {formatEloRating(entry.points[entry.points.length - 1]?.rating ?? ELO_STARTING_RATING)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
