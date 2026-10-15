import assert from "node:assert/strict";
import test from "node:test";

import { parseTournamentParticipants } from "./participantImport";

test("parses a tab-separated USTA participant roster and ignores letter dividers", () => {
  const rows = parseTournamentParticipants(`Participant name\tEvents\tCity, State\tGender
A
ACOSTA-STUEHMKE, Matias\tBoys' 16 & under Doubles, Boys' 18 & under Singles\tNew York, NY\tM
ANAND, Nikhil\tBoys' 18 & under Doubles, Boys' 18 & under Singles\tSpring, TX\tM
Total players: 2`);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    participantName: "Matias Acosta-Stuehmke",
    events: ["Boys' 16 & under Doubles", "Boys' 18 & under Singles"],
    city: "New York",
    state: "NY",
    gender: "M",
  });
});
