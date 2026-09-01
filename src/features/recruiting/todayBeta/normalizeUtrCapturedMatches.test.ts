import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeUtrCapturedMatches } from "./normalizeUtrCapture";
import type { UtrCapturedMatch } from "./types";

describe("normalizeUtrCapturedMatches tournament URL", () => {
  const baseCapture: UtrCapturedMatch = {
    source: "UTR",
    recruitName: "Finn Keenan",
    utrPlayerId: "2658468",
    tournamentName: "Ellesse Jr. Championship at the Cincinnati Open",
    matchDate: "2026-08-21",
    round: "16",
    opponentName: "Ezra Britton",
    score: "3-6 4-6",
    result: "LOSS",
    externalMatchId: "64631045",
  };

  it("passes through tournamentUrl from agent import rows", () => {
    const [row] = normalizeUtrCapturedMatches([
      {
        ...baseCapture,
        tournamentUrl: "https://app.utrsports.net/events/3465797",
      },
    ]);

    assert.equal(row?.tournamentUrl, "https://app.utrsports.net/events/3465797");
  });

  it("derives tournamentUrl from utrEventId when URL omitted", () => {
    const [row] = normalizeUtrCapturedMatches([
      {
        ...baseCapture,
        utrEventId: 3465797,
      },
    ]);

    assert.equal(row?.tournamentUrl, "https://app.utrsports.net/events/3465797");
  });
});
