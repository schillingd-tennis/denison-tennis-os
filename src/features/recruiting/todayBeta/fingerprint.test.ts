import assert from "node:assert/strict";
import test from "node:test";

import { buildResultFingerprint } from "./fingerprint";

test("buildResultFingerprint is stable for the same match values", () => {
  const input = {
    recruitPersonId: "recruit-xlsx-row-441",
    tournamentName: "USTA L1 National Championships",
    round: "Quarterfinal",
    opponentName: "John Smith",
    score: "6-4, 6-3",
  };

  const first = buildResultFingerprint(input);
  const second = buildResultFingerprint(input);
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("buildResultFingerprint changes when score changes", () => {
  const base = {
    recruitPersonId: "recruit-xlsx-row-441",
    tournamentName: "USTA L1 National Championships",
    round: "Quarterfinal",
    opponentName: "John Smith",
    score: "6-4, 6-3",
  };

  const changed = buildResultFingerprint({ ...base, score: "7-5, 6-2" });
  assert.notEqual(buildResultFingerprint(base), changed);
});
