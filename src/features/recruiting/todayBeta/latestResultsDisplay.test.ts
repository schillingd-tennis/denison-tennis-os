import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { additionalRecentResults } from "./latestResults";
import { normalizeUtrApiResults } from "./normalizeUtrCapture";
import { buildUtrEventUrl, resolveTournamentUrl } from "./tournamentLink";
import type { LatestResultEntry, LatestResultRow, RecruitMatchResult } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
const todayBetaPageSource = readFileSync(
  join(here, "components/TodayBetaPage.tsx"),
  "utf8",
);

function recruitCellBlock(source: string): string {
  const start = source.indexOf("function LatestResultRecruitCell");
  assert.ok(start >= 0);
  const end = source.indexOf("function LatestResultTournamentCell", start);
  assert.ok(end > start);
  return source.slice(start, end);
}

function tournamentCellBlock(source: string): string {
  const start = source.indexOf("function LatestResultTournamentCell");
  assert.ok(start >= 0);
  const end = source.indexOf("function LatestResultDataCells", start);
  assert.ok(end > start);
  return source.slice(start, end);
}

function resultOutcomeBlock(source: string): string {
  const start = source.indexOf("function ResultOutcomeText");
  assert.ok(start >= 0);
  const end = source.indexOf("function LatestResultRecruitCell", start);
  assert.ok(end > start);
  return source.slice(start, end);
}

describe("Latest Results display refinements", () => {
  const recruitBlock = recruitCellBlock(todayBetaPageSource);
  const tournamentBlock = tournamentCellBlock(todayBetaPageSource);
  const outcomeBlock = resultOutcomeBlock(todayBetaPageSource);

  it("1. primary row shows recruit name in LatestResultRecruitCell", () => {
    assert.match(recruitBlock, /\{recruitName\}/);
  });

  it("2. primary row shows recruit UTR when available", () => {
    assert.match(recruitBlock, /\{utr\} UTR/);
  });

  it("3. nested row returns null (blank Recruit cell)", () => {
    assert.match(recruitBlock, /if \(nested\)[\s\S]*return null/);
  });

  it("4–5. nested LatestResultDataCells passes nested flag to Recruit cell", () => {
    assert.match(
      todayBetaPageSource,
      /<LatestResultDataCells entry=\{entry\} recruitName=\{row\.recruitName\} nested \/>/,
    );
  });

  it("6. WIN uses resultOutcomeLabel", () => {
    assert.match(outcomeBlock, /resultOutcomeLabel\(result\)/);
  });

  it("7. Win uses red font class", () => {
    assert.match(outcomeBlock, /result === "WIN"[\s\S]*text-red-700/);
  });

  it("8. Loss uses green font class", () => {
    assert.match(outcomeBlock, /result === "LOSS"[\s\S]*text-green-700/);
  });

  it("9–11. tournament link opens in new tab with safe rel", () => {
    assert.match(tournamentBlock, /target="_blank"/);
    assert.match(tournamentBlock, /rel="noopener noreferrer"/);
    assert.match(tournamentBlock, /resolveTournamentUrl/);
  });

  it("12. external-link arrow appears only when URL exists", () => {
    assert.match(tournamentBlock, /if \(!url\)/);
    assert.match(tournamentBlock, /↗/);
  });

  it("13. tournament without URL remains plain text", () => {
    assert.match(tournamentBlock, /return <span className="truncate">\{title\}<\/span>/);
  });

  it("14. Show 4 more recent still works", () => {
    const row: LatestResultRow = {
      recruitPersonId: "p1",
      recruitName: "Finn Keenan",
      latestResult: {
        result: { id: "1" } as RecruitMatchResult,
        opponent: { opponentName: "A" } as LatestResultEntry["opponent"],
      },
      recentResults: [
        {
          result: { id: "1" } as RecruitMatchResult,
          opponent: { opponentName: "A" } as LatestResultEntry["opponent"],
        },
        {
          result: { id: "2" } as RecruitMatchResult,
          opponent: { opponentName: "B" } as LatestResultEntry["opponent"],
        },
        {
          result: { id: "3" } as RecruitMatchResult,
          opponent: { opponentName: "C" } as LatestResultEntry["opponent"],
        },
        {
          result: { id: "4" } as RecruitMatchResult,
          opponent: { opponentName: "D" } as LatestResultEntry["opponent"],
        },
        {
          result: { id: "5" } as RecruitMatchResult,
          opponent: { opponentName: "E" } as LatestResultEntry["opponent"],
        },
      ],
    };
    assert.equal(additionalRecentResults(row).length, 4);
    assert.match(todayBetaPageSource, /Show \$\{moreRecentCount\} more recent/);
  });

  it("visual grouping: primary rows use tinted background without top group divider", () => {
    assert.match(todayBetaPageSource, /LATEST_RESULT_PRIMARY_ROW_CLASS = "bg-app-background\/60"/);
    assert.doesNotMatch(todayBetaPageSource, /LATEST_RESULT_PRIMARY_ROW_BORDER_GROUP/);
    assert.match(todayBetaPageSource, /isLastRecruitInTable=\{index === sortedRows\.length - 1\}/);
  });

  it("visual grouping: nested rows use surface background and same cell padding as primary", () => {
    assert.match(todayBetaPageSource, /LATEST_RESULT_NESTED_ROW_CLASS = "border-t border-border\/40 bg-surface"/);
    assert.doesNotMatch(todayBetaPageSource, /LATEST_RESULT_NESTED_MATCH_DATE_CELL_CLASS/);
    const dataCellsBlock = todayBetaPageSource.slice(
      todayBetaPageSource.indexOf("function LatestResultDataCells"),
      todayBetaPageSource.indexOf("function LatestResultFeedRow"),
    );
    assert.doesNotMatch(dataCellsBlock, /pl-5/);
  });

  it("visual grouping: end-of-group divider follows Show/Hide and nested rows", () => {
    assert.match(todayBetaPageSource, /LATEST_RESULT_GROUP_END_ROW_CLASS = "border-b-2 border-border"/);
    assert.match(
      todayBetaPageSource,
      /latestResultGroupEndClass\(!hasNested, isLastRecruitInTable\)/,
    );
    assert.match(
      todayBetaPageSource,
      /latestResultGroupEndClass\(index === moreRecent\.length - 1, isLastRecruitInTable\)/,
    );
  });

  it("visual grouping: toggle row shares primary tint, not group divider", () => {
    assert.match(todayBetaPageSource, /LATEST_RESULT_TOGGLE_ROW_CLASS = "border-t border-border\/40 bg-app-background\/40"/);
    assert.match(
      todayBetaPageSource,
      /\$\{LATEST_RESULT_TOGGLE_ROW_CLASS\} \$\{latestResultGroupEndClass\(!hasNested, isLastRecruitInTable\)\}/,
    );
  });

  it("UTR normalization attaches tournament URL from event id", () => {
    const rows = normalizeUtrApiResults({
      payload: {
        events: [
          {
            id: 3465797,
            name: "Ellesse Jr. Championship at the Cincinnati Open",
            startDate: "2026-08-21T00:00:00",
            draws: [
              {
                results: [
                  {
                    id: 64631045,
                    date: "2026-08-21T00:00:00",
                    isWinner: false,
                    players: {
                      winner1: { id: "1", firstName: "Ezra", lastName: "Britton" },
                      loser1: { id: "2658468", firstName: "Finn", lastName: "Keenan" },
                    },
                    score: {
                      "1": { winner: 6, loser: 3 },
                      "2": { winner: 6, loser: 4 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      recruitPersonId: "recruit-xlsx-row-380",
      utrPlayerId: "2658468",
      recruitName: "Finnegan Keenan",
    });

    assert.equal(rows[0]?.tournamentUrl, buildUtrEventUrl(3465797));
    assert.equal(
      resolveTournamentUrl({ tournamentUrl: rows[0]?.tournamentUrl }),
      "https://app.utrsports.net/events/3465797",
    );
  });
});
