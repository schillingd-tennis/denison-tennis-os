import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTournamentInput } from "./mapping";
import { emptyTournamentInput } from "./editor";

test("normalizeTournamentInput keeps operational status independent of recruiting plan", () => {
  const result = normalizeTournamentInput({
    ...emptyTournamentInput(),
    name: "  ITA Kickoff  ",
    recruitingPlan: "watching",
    status: "confirmed",
    websiteUrl: "usta.com/event",
  });
  assert.equal("error" in result, false);
  if ("error" in result) return;
  assert.equal(result.status, "confirmed");
  assert.equal(result.recruitingPlan, "watching");
  assert.equal(result.websiteUrl, "https://usta.com/event");
});

test("normalizeTournamentInput requires a name", () => {
  const result = normalizeTournamentInput(emptyTournamentInput());
  assert.equal("error" in result, true);
});
