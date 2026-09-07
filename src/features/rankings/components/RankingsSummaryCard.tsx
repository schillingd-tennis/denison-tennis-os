import { formatDate } from "@/lib/formatting";

import type { RankingSnapshotMetadata } from "../types";
import ItaLogoMark from "./ItaLogoMark";

export default function RankingsSummaryCard({
  metadata,
}: {
  metadata: RankingSnapshotMetadata;
}) {
  const rankingDateLabel = formatDate(metadata.rankingDate);
  return (
    <div
      data-rankings-summary
      className="overflow-hidden rounded-card border border-[var(--module-border)] bg-surface"
    >
      <span aria-hidden="true" className="block h-0.5 bg-[var(--module-accent)]" />
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <ItaLogoMark size="heading" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">NCAA Division III Men</p>
            <p className="mt-0.5 text-sm text-text-secondary">National Team Rankings</p>
            <p className="mt-1 text-xs text-text-secondary">
              {rankingDateLabel}
              <span className="mx-1.5 text-text-secondary/50" aria-hidden>
                ·
              </span>
              {metadata.totalRankedTeams} ranked teams
            </p>
          </div>
        </div>
        <a
          href={metadata.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center text-sm font-semibold text-[var(--module-accent)] hover:underline"
        >
          View ITA source
        </a>
      </div>
    </div>
  );
}
