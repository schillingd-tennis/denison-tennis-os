import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { resultOutcomeLabel, RESULT_OUTCOME_TONE_CLASS } from "./latestResults";

const here = dirname(fileURLToPath(import.meta.url));
const todayBetaPageSource = readFileSync(
  join(here, "components/TodayBetaPage.tsx"),
  "utf8",
);

function resultOutcomeTextBlock(source: string): string {
  const start = source.indexOf("function ResultOutcomeText");
  assert.ok(start >= 0, "ResultOutcomeText must exist");
  const end = source.indexOf("function LatestResultRecruitCell", start);
  assert.ok(end > start, "LatestResultRecruitCell must follow ResultOutcomeText");
  return source.slice(start, end);
}

describe("Latest Results outcome display", () => {
  const block = resultOutcomeTextBlock(todayBetaPageSource);

  it("1. WIN renders text Win", () => {
    assert.equal(resultOutcomeLabel("WIN"), "Win");
    assert.match(block, /resultOutcomeLabel\(result\)/);
  });

  it("2. LOSS renders text Loss", () => {
    assert.equal(resultOutcomeLabel("LOSS"), "Loss");
  });

  it("3. WIN element contains an explicit red text class", () => {
    assert.match(block, /result === "WIN"[\s\S]*className="font-semibold text-red-700"/);
    assert.equal(RESULT_OUTCOME_TONE_CLASS.WIN, "font-semibold text-red-700");
  });

  it("4. LOSS element contains an explicit green text class", () => {
    assert.match(block, /result === "LOSS"[\s\S]*className="font-semibold text-green-700"/);
    assert.equal(RESULT_OUTCOME_TONE_CLASS.LOSS, "font-semibold text-green-700");
  });

  it("5. UNKNOWN remains neutral", () => {
    assert.equal(resultOutcomeLabel("UNKNOWN"), "Unknown");
    assert.match(block, /className="font-semibold text-text-secondary"/);
  });

  it("6. expanded rows use the same styling via LatestResultDataCells", () => {
    assert.match(todayBetaPageSource, /<ResultOutcomeText result=\{result\.result\} \/>/);
    assert.match(
      todayBetaPageSource,
      /<LatestResultDataCells entry=\{entry\} recruitName=\{row\.recruitName\} nested \/>/,
    );
    assert.match(todayBetaPageSource, /LATEST_RESULT_RESULT_CELL_CLASS/);
    assert.doesNotMatch(
      todayBetaPageSource.slice(
        todayBetaPageSource.indexOf("LATEST_RESULT_RESULT_CELL_CLASS"),
        todayBetaPageSource.indexOf("LATEST_RESULT_RESULT_CELL_CLASS") + 200,
      ),
      /text-text-primary/,
    );
  });
});
