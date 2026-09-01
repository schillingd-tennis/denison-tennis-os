import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildLatestResultOpponentContext,
  buildOpponentPersonIndex,
  formatLatestResultGradYear,
  formatLatestResultMatchDate,
  formatLatestResultTrnRank,
  formatLatestResultUtr,
} from "./latestResultOpponentContext";
import { formatMatchSourceLabel } from "./utrMatchSource";
import type { Person } from "@/features/people/types";
import type { RecruitProfile } from "@/features/recruiting/types";
import type { RecruitMatchResult } from "./types";

const NOW = new Date("2026-09-01T12:00:00.000Z");

function person(overrides: Partial<Person> & Pick<Person, "id" | "firstName" | "lastName">): Person {
  return {
    roles: [],
    relationships: [],
    ...overrides,
  };
}

function profile(overrides: Partial<RecruitProfile> & Pick<RecruitProfile, "personId">): RecruitProfile {
  return {
    ...overrides,
  } as RecruitProfile;
}

function result(overrides: Partial<RecruitMatchResult>): RecruitMatchResult {
  return {
    id: overrides.id ?? "m1",
    recruitPersonId: "recruit-1",
    source: "trn_manual",
    result: "WIN",
    firstDetectedAt: "2026-08-01T12:00:00.000Z",
    lastVerifiedAt: "2026-08-01T12:00:00.000Z",
    detectionStatus: "BASELINE",
    resultFingerprint: "fp",
    needsReview: false,
    parseWarnings: [],
    ...overrides,
  };
}

describe("latestResultOpponentContext", () => {
  const opponentIndex = buildOpponentPersonIndex({
    people: [
      person({
        id: "opp-1",
        firstName: "Adam",
        lastName: "Roman",
        trnRank: 37,
      }),
      person({
        id: "opp-2",
        firstName: "Kayden",
        lastName: "Kral",
        trnRank: 142,
      }),
    ],
    profiles: [
      profile({ personId: "opp-1", recruitClassYear: 2027 }),
      profile({ personId: "opp-2", recruitClassYear: 2028 }),
    ],
  });

  it("1. exposes match date label on LatestResultEntry opponent context", () => {
    const context = buildLatestResultOpponentContext({
      result: result({ tournamentDate: "2026-09-01" }),
      opponentIndex,
      now: NOW,
    });
    assert.equal(context.matchDateLabel, "Sep 1");
  });

  it("6. existing opponent_ranking appears as TRN Rank", () => {
    const context = buildLatestResultOpponentContext({
      result: result({ opponentRanking: "188", opponentName: "Unknown Person" }),
      opponentIndex,
      now: NOW,
    });
    assert.equal(context.opponentTrnRank, "#188");
    assert.equal(formatLatestResultTrnRank(context.opponentTrnRank), "#188");
  });

  it("7. UTR opponent rating is not displayed as TRN Rank", () => {
    const context = buildLatestResultOpponentContext({
      result: result({
        source: "UTR",
        opponentName: "Unknown Person",
        opponentRating: "10.84",
        ratingType: "UTR",
      }),
      opponentIndex,
      now: NOW,
    });
    assert.equal(context.opponentTrnRank, null);
    assert.equal(context.opponentUtr, "10.84");
    assert.equal(formatLatestResultTrnRank(context.opponentTrnRank), "—");
  });

  it("8. exact known opponent can supply TRN ranking", () => {
    const context = buildLatestResultOpponentContext({
      result: result({ source: "UTR", opponentName: "Adam Roman" }),
      opponentIndex,
      now: NOW,
    });
    assert.equal(context.opponentTrnRank, "#37");
  });

  it("9. exact known opponent can supply grad year", () => {
    const context = buildLatestResultOpponentContext({
      result: result({ opponentName: "Kayden Kral" }),
      opponentIndex,
      now: NOW,
    });
    assert.equal(context.opponentGradYear, 2028);
    assert.equal(formatLatestResultGradYear(context.opponentGradYear), "2028");
  });

  it("10. opponent UTR appears from opponent_rating when rating_type=UTR", () => {
    const context = buildLatestResultOpponentContext({
      result: result({
        source: "UTR",
        opponentRating: "11.33",
        recruitRating: "10.99",
        ratingType: "UTR",
      }),
      opponentIndex,
      now: NOW,
    });
    assert.equal(context.opponentUtr, "11.33");
  });

  it("11. recruit UTR appears from recruit_rating when rating_type=UTR", () => {
    const context = buildLatestResultOpponentContext({
      result: result({
        source: "UTR",
        opponentRating: "11.33",
        recruitRating: "10.99",
        ratingType: "UTR",
      }),
      opponentIndex,
      now: NOW,
    });
    assert.equal(context.recruitUtr, "10.99");
  });

  it("12. unresolved TRN rank shows —", () => {
    const context = buildLatestResultOpponentContext({
      result: result({ opponentName: "Unknown Person" }),
      opponentIndex,
      now: NOW,
    });
    assert.equal(formatLatestResultTrnRank(context.opponentTrnRank), "—");
  });

  it("13. unresolved grad year shows —", () => {
    const context = buildLatestResultOpponentContext({
      result: result({ opponentName: "Unknown Person" }),
      opponentIndex,
      now: NOW,
    });
    assert.equal(formatLatestResultGradYear(context.opponentGradYear), "—");
  });

  it("14. missing UTR shows —", () => {
    const context = buildLatestResultOpponentContext({
      result: result({ source: "trn_manual" }),
      opponentIndex,
      now: NOW,
    });
    assert.equal(formatLatestResultUtr(context.opponentUtr), "—");
    assert.equal(formatLatestResultUtr(context.recruitUtr), "—");
  });

  it("15. TRN + UTR source appears for enriched result", () => {
    const enriched = result({
      source: "trn_manual",
      externalMatchId: "64631034",
      ratingType: "UTR",
      recruitRating: "10.99",
      opponentRating: "10.42",
    });
    assert.equal(formatMatchSourceLabel(enriched), "TRN + UTR");
  });

  it("does not fuzzy-match loosely for TRN rank enrichment", () => {
    const context = buildLatestResultOpponentContext({
      result: result({ opponentName: "Adam R." }),
      opponentIndex,
      now: NOW,
    });
    assert.equal(context.opponentTrnRank, null);
    assert.equal(context.opponentGradYear, null);
  });

  it("shows year when match date is outside current year", () => {
    const label = formatLatestResultMatchDate(
      result({ tournamentDate: "2025-05-23" }),
      NOW,
    );
    assert.equal(label, "May 23, 2025");
  });

  it("ambiguous exact-name matches do not enrich opponent context", () => {
    const ambiguousIndex = buildOpponentPersonIndex({
      people: [
        person({ id: "a", firstName: "Jordan", lastName: "Lee", trnRank: 10 }),
        person({ id: "b", firstName: "Jordan", lastName: "Lee", trnRank: 20 }),
      ],
      profiles: [
        profile({ personId: "a", recruitClassYear: 2027 }),
        profile({ personId: "b", recruitClassYear: 2028 }),
      ],
    });

    const context = buildLatestResultOpponentContext({
      result: result({ opponentName: "Jordan Lee" }),
      opponentIndex: ambiguousIndex,
      now: NOW,
    });
    assert.equal(context.opponentTrnRank, null);
    assert.equal(context.opponentGradYear, null);
  });
});
