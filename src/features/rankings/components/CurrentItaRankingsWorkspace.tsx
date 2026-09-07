"use client";

import { useMemo, useState } from "react";

import {
  DesktopOnlySummary,
  DirectoryToolbar,
  MobileDirectorySearchRegion,
} from "@/components/mobile-dashboard";
import SearchInput from "@/components/SearchInput";

import { filterRankingEntries } from "../search";
import { resolveRankingSchoolLogo } from "../schoolLogos";
import type { RankingSnapshot } from "../types";
import {
  snapshotHasConferenceOrRegion,
  snapshotHasPreviousRank,
  snapshotHasRecord,
} from "../validate";
import RankingsShell from "./RankingsShell";
import RankingsSummaryCard from "./RankingsSummaryCard";
import SchoolLogoMark from "./SchoolLogoMark";

function formatRecord(wins: number | null | undefined, losses: number | null | undefined): string | null {
  if (wins == null && losses == null) return null;
  return `${wins ?? 0}-${losses ?? 0}`;
}

function formatRankingNumber(value: number | null | undefined): string {
  return value == null ? "—" : value.toFixed(2);
}

export default function CurrentItaRankingsWorkspace({
  snapshot,
}: {
  snapshot: RankingSnapshot;
}) {
  const [query, setQuery] = useState("");
  const showPrevious = snapshotHasPreviousRank(snapshot);
  const showRecord = snapshotHasRecord(snapshot);
  const showConference = snapshotHasConferenceOrRegion(snapshot);

  const filtered = useMemo(
    () => filterRankingEntries(snapshot.entries, query),
    [snapshot.entries, query],
  );

  return (
    <RankingsShell activeId="current-ita">
      <DesktopOnlySummary>
        <RankingsSummaryCard metadata={snapshot.metadata} />
      </DesktopOnlySummary>

      <MobileDirectorySearchRegion
        toolbar={
          <DirectoryToolbar
            search={
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search by school or conference"
                aria-label="Search rankings"
              />
            }
            views={null}
            filters={null}
          />
        }
      >
        <div className="md:hidden">
          <RankingsSummaryCard metadata={snapshot.metadata} />
        </div>

        <div className="overflow-x-auto rounded-card border border-[var(--module-border)] bg-surface">
          <table className="w-full min-w-[46rem] table-fixed text-left text-sm">
            <thead className="bg-app-background">
              <tr className="border-b border-border text-[10px] font-semibold tracking-wide text-text-secondary uppercase">
                <th className="w-14 px-3 py-2">Rank</th>
                <th className="px-3 py-2">School</th>
                {showPrevious ? <th className="w-20 px-3 py-2">Prev</th> : null}
                {showRecord ? <th className="w-20 px-3 py-2">Record</th> : null}
                <th className="w-20 px-3 py-2">Points</th>
                <th className="w-20 px-3 py-2">WTN</th>
                {showConference ? <th className="hidden px-3 py-2 md:table-cell">Conference</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const logo = resolveRankingSchoolLogo(entry.schoolName);
                const record = formatRecord(entry.wins, entry.losses);
                const conference = entry.conference?.trim() || entry.region?.trim() || null;
                return (
                  <tr
                    key={`${entry.rank}-${entry.schoolId ?? entry.schoolName}`}
                    data-rankings-row
                    data-school={logo.displayName}
                    data-rank={entry.rank}
                    data-denison={logo.isDenison ? "true" : undefined}
                    className={[
                      "border-b border-border/70 last:border-b-0",
                      logo.isDenison
                        ? "bg-[color-mix(in_srgb,var(--module-accent)_08%,transparent)]"
                        : "hover:bg-app-background/80",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2 align-middle text-sm font-semibold tabular-nums text-text-primary">
                      {entry.rank}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <SchoolLogoMark resolution={logo} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-primary">{logo.displayName}</p>
                          {showConference && conference ? (
                            <p className="truncate text-[11px] text-text-secondary md:hidden">
                              {conference}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    {showPrevious ? (
                      <td className="px-3 py-2 align-middle tabular-nums text-text-secondary">
                        {entry.previousRank ?? ""}
                      </td>
                    ) : null}
                    {showRecord ? (
                      <td className="px-3 py-2 align-middle tabular-nums text-text-secondary">
                        {record ?? ""}
                      </td>
                    ) : null}
                    <td className="px-3 py-2 align-middle tabular-nums text-text-secondary">
                      {formatRankingNumber(entry.points)}
                    </td>
                    <td className="px-3 py-2 align-middle tabular-nums text-text-secondary">
                      {formatRankingNumber(entry.wtn)}
                    </td>
                    {showConference ? (
                      <td className="hidden px-3 py-2 align-middle text-text-secondary md:table-cell">
                        <span className="line-clamp-2">{conference ?? ""}</span>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-secondary">
              No schools match this search.
            </p>
          ) : null}
        </div>
      </MobileDirectorySearchRegion>
    </RankingsShell>
  );
}
