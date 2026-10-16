import assert from "node:assert/strict";
import test from "node:test";
import { indexRecruitNames, normalizeRecruitName, splitParticipantName } from "./participantRecruitMatching";

test("normalizes names for safe exact matching", () => {
  assert.equal(normalizeRecruitName("  Alec  Rodr\u00edguez-Fields "), "alec rodriguez fields");
});
test("preserves duplicate matches for ambiguity review", () => {
  const index = indexRecruitNames([{ personId: "one", displayName: "Alec Rodriguez" }, { personId: "two", displayName: "ALEC  RODRIGUEZ" }]);
  assert.equal(index.get("alec rodriguez")?.length, 2);
});
test("splits a display name for a potential recruit", () => {
  assert.deepEqual(splitParticipantName("Matias Acosta-Stuehmke"), { firstName: "Matias", lastName: "Acosta-Stuehmke" });
});
