import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildUtrCrossSourceEnrichmentPatch } from "./repository";

describe("UTR cross-source enrichment", () => {
  it("prefers UTR structured match date when enriching a stale TRN row", () => {
    const patch = buildUtrCrossSourceEnrichmentPatch({
      externalMatchId: "64631045",
      recruitUtr: "10.5",
      opponentUtr: "10.8",
      matchDate: "2026-08-21",
    });

    assert.equal(patch.external_match_id, "64631045");
    assert.equal(patch.tournament_date, "2026-08-21");
    assert.equal(patch.tournament_date_raw, "2026-08-21");
    assert.equal(patch.rating_type, "UTR");
  });

  it("writes tournament_url when UTR event URL is known", () => {
    const patch = buildUtrCrossSourceEnrichmentPatch({
      externalMatchId: "64631045",
      matchDate: "2026-08-21",
      tournamentUrl: "https://app.utrsports.net/events/3465797",
    });

    assert.equal(patch.tournament_url, "https://app.utrsports.net/events/3465797");
  });

  it("normalizes UTR ISO timestamps onto tournament_date", () => {
    const patch = buildUtrCrossSourceEnrichmentPatch({
      matchDate: "2026-08-21T00:00:00",
      externalMatchId: "64646746",
    });

    assert.equal(patch.tournament_date, "2026-08-21");
  });
});
