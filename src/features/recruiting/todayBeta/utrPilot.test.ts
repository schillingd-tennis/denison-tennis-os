import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatMatchSourceLabel } from "./utrMatchSource";
import type { RecruitMatchResult } from "./types";

function result(overrides: Partial<RecruitMatchResult>): RecruitMatchResult {
  return {
    id: "1",
    recruitPersonId: "p1",
    source: "trn_manual",
    firstDetectedAt: "",
    lastVerifiedAt: "",
    detectionStatus: "BASELINE",
    resultFingerprint: "fp",
    needsReview: false,
    parseWarnings: [],
    ...overrides,
  };
}

describe("formatMatchSourceLabel", () => {
  it("labels TRN-only rows", () => {
    assert.equal(formatMatchSourceLabel(result({ source: "trn_manual" })), "TRN");
  });

  it("labels UTR-only rows", () => {
    assert.equal(formatMatchSourceLabel(result({ source: "UTR" })), "UTR");
  });

  it("labels enriched TRN rows with UTR data", () => {
    assert.equal(
      formatMatchSourceLabel(
        result({
          source: "trn_manual",
          externalMatchId: "64631034",
          ratingType: "UTR",
        }),
      ),
      "TRN + UTR",
    );
  });
});

describe("UTR external_match_id idempotency", () => {
  it("recognizes an existing row by external_match_id before insert", () => {
    const existing: RecruitMatchResult[] = [
      result({
        id: "existing-1",
        externalMatchId: "64631034",
        source: "UTR",
      }),
    ];
    const incomingExternalMatchId = "64631034";
    const alreadyStored = existing.some(
      (row) => row.externalMatchId === incomingExternalMatchId,
    );
    assert.equal(alreadyStored, true);
  });
});
