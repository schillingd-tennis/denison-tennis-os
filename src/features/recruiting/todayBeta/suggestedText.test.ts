import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSuggestedText,
  countNewWinsInSameTournament,
  isLateRound,
  recruitFirstNameFromDisplay,
  selectSuggestedTextCategory,
} from "./suggestedText";
import type { RecruitMatchResult } from "./types";

function match(overrides: Partial<RecruitMatchResult> = {}): RecruitMatchResult {
  return {
    id: "m1",
    recruitPersonId: "p1",
    source: "trn_manual",
    result: "WIN",
    opponentName: "Test Opponent",
    opponentRanking: "75",
    tournamentName: "USTA L1",
    round: "QF",
    firstDetectedAt: "2026-08-31T12:00:00.000Z",
    lastVerifiedAt: "2026-08-31T12:00:00.000Z",
    detectionStatus: "NEW",
    resultFingerprint: "fp1",
    needsReview: false,
    parseWarnings: [],
    ...overrides,
  };
}

describe("suggestedText", () => {
  it("selects STRONG WIN for WIN vs #75", () => {
    assert.equal(
      selectSuggestedTextCategory({ matchResult: match({ opponentRanking: "75" }) }),
      "strong_win",
    );
    assert.equal(
      buildSuggestedText({ recruitFirstName: "Isaac", matchResult: match({ opponentRanking: "75" }) })
        .text,
      "Great win today Isaac. That's a really good player you beat. Congrats!",
    );
  });

  it("selects GOOD WIN for WIN vs #150", () => {
    assert.equal(
      selectSuggestedTextCategory({ matchResult: match({ opponentRanking: "150" }) }),
      "good_win",
    );
    assert.equal(
      buildSuggestedText({ recruitFirstName: "Isaac", matchResult: match({ opponentRanking: "150" }) })
        .text,
      "Great win Isaac. Really good result today — congrats!",
    );
  });

  it("selects ROUTINE WIN for WIN vs #350", () => {
    assert.equal(
      selectSuggestedTextCategory({ matchResult: match({ opponentRanking: "350" }) }),
      "routine_win",
    );
    assert.equal(
      buildSuggestedText({ recruitFirstName: "Isaac", matchResult: match({ opponentRanking: "350" }) })
        .text,
      "Congrats on the win today Isaac. Keep it going!",
    );
  });

  it("selects ROUTINE WIN when opponent ranking is missing", () => {
    assert.equal(
      selectSuggestedTextCategory({ matchResult: match({ opponentRanking: undefined }) }),
      "routine_win",
    );
  });

  it("selects TOUGH LOSS for LOSS vs #40", () => {
    assert.equal(
      selectSuggestedTextCategory({
        matchResult: match({ result: "LOSS", opponentRanking: "40" }),
      }),
      "tough_loss_strong_opponent",
    );
    assert.equal(
      buildSuggestedText({
        recruitFirstName: "Isaac",
        matchResult: match({ result: "LOSS", opponentRanking: "40" }),
      }).text,
      "Tough one today Isaac, but that's a really good player. Keep competing.",
    );
  });

  it("returns no message for LOSS to weak opponent", () => {
    const result = buildSuggestedText({
      recruitFirstName: "Isaac",
      matchResult: match({ result: "LOSS", opponentRanking: "250" }),
    });
    assert.equal(result.category, null);
    assert.equal(result.text, null);
  });

  it("selects STRONG TOURNAMENT RUN for SF result", () => {
    assert.equal(isLateRound("SF"), true);
    assert.equal(
      selectSuggestedTextCategory({ matchResult: match({ round: "SF", opponentRanking: "75" }) }),
      "strong_tournament_run",
    );
  });

  it("selects STRONG TOURNAMENT RUN for multiple NEW wins in same tournament", () => {
    const tournament = "DENISON OS TEST EVENT";
    const primary = match({ tournamentName: tournament, round: "QF", opponentRanking: "180" });
    const earlier = match({
      id: "m2",
      round: "16",
      opponentRanking: "200",
      tournamentName: tournament,
    });

    assert.equal(countNewWinsInSameTournament(primary, [primary, earlier]), 2);
    assert.equal(
      selectSuggestedTextCategory({
        matchResult: primary,
        newMatchResults: [primary, earlier],
      }),
      "strong_tournament_run",
    );
    assert.equal(
      buildSuggestedText({
        recruitFirstName: "Isaac",
        matchResult: primary,
        newMatchResults: [primary, earlier],
      }).text,
      "Great run this week Isaac. Really impressive tournament.",
    );
  });

  it("handles missing recruit name without failing", () => {
    const result = buildSuggestedText({
      recruitFirstName: "",
      matchResult: match({ opponentRanking: "75" }),
    });
    assert.equal(result.text, "Great win today. That's a really good player you beat. Congrats!");
  });

  it("derives first name from display name", () => {
    assert.equal(recruitFirstNameFromDisplay("Isaac Lewis"), "Isaac");
    assert.equal(recruitFirstNameFromDisplay("Isaac Lewis", "Ike"), "Ike");
    assert.equal(recruitFirstNameFromDisplay(""), "");
  });
});
