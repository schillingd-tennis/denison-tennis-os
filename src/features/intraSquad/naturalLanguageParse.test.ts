import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";

import { AI_PARSE_UNAVAILABLE, parseAiExtractionJson } from "./aiMatchExtract";
import { hybridParseQuickMatch, validateAiExtraction } from "./hybridParse";
import { normalizeIntraSquadInput } from "./mapping";
import { extractNaturalDate } from "./naturalDate";
import { extractNaturalWeight } from "./naturalWeight";
import { interpretMatchEntry } from "./parseMatchText";
import { currentRosterPlayers } from "./roster";
import type { RosterPlayer } from "./types";

function person(id: string, first: string, last: string): Person {
  return {
    id,
    firstName: first,
    lastName: last,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    relationships: [],
    roleId: "role-player",
    statusId: "status-current",
    role: { id: "role-player", key: ROLE_KEYS.player, label: "player" },
    status: { id: "status-current", key: STATUS_KEYS.current, label: "current" },
  };
}

const roster: RosterPlayer[] = currentRosterPlayers([
  person("arya", "Arya", "Ganapathy"),
  person("aidan", "Aidan", "Borosko"),
  person("nick", "Nick", "Meyers"),
  person("minato", "Minato", "Koido"),
  person("balraj", "Balraj", "Idnani"),
  person("kyle", "Kyle", "Patrick"),
  person("chika", "Chika", "Okurama"),
  person("jackson", "Jackson", "Smith"),
]);

const now = new Date(2026, 8, 3, 12, 0, 0);
const routeSource = readFileSync(
  path.join(process.cwd(), "src/app/api/team-operations/intra-squad/parse/route.ts"),
  "utf8",
);
const actionsSource = readFileSync(path.join(process.cwd(), "src/features/intraSquad/actions.ts"), "utf8");

describe("intra-squad natural-language deterministic phrases", () => {
  const cases = [
    {
      text: "Chika was leading Jackson 64, 32",
      status: "unfinished",
      primary: "chika",
      opponent: "jackson",
      score: "6-4, 3-2",
    },
    {
      text: "Chika was up on Jackson 6-4, 3-2 when they stopped",
      status: "unfinished",
      primary: "chika",
      opponent: "jackson",
      score: "6-4, 3-2",
    },
    {
      text: "Chika won the first 6-4 and was ahead of Jackson 3-2 in the second",
      status: "unfinished",
      primary: "chika",
      opponent: "jackson",
      score: "6-4, 3-2",
    },
    {
      text: "Arya and Aidan didn't finish. Arya won the first 6-3 and was up 4-2",
      status: "unfinished",
      primary: "arya",
      opponent: "aidan",
      score: "6-3, 4-2",
    },
    {
      text: "Nick beat Minato 36 60 62",
      status: "completed",
      primary: "nick",
      opponent: "minato",
      score: "3-6, 6-0, 6-2",
    },
    {
      text: "Nick came back to beat Minato 3-6, 6-0, 6-2",
      status: "completed",
      primary: "nick",
      opponent: "minato",
      score: "3-6, 6-0, 6-2",
    },
    {
      text: "Balraj won over Kyle 61 61",
      status: "completed",
      primary: "balraj",
      opponent: "kyle",
      score: "6-1, 6-1",
    },
    {
      text: "Kyle lost to Balraj 1-6, 1-6",
      status: "completed",
      primary: "balraj",
      opponent: "kyle",
      score: "6-1, 6-1",
    },
    {
      text: "Jackson was trailing Chika 4-6, 2-3",
      status: "unfinished",
      primary: "chika",
      opponent: "jackson",
      score: "6-4, 3-2",
    },
  ] as const;

  for (const row of cases) {
    it(`parses: ${row.text}`, () => {
      const interpreted = interpretMatchEntry(row.text, roster, { now });
      assert.ok("ok" in interpreted, "error" in interpreted ? interpreted.error : "");
      assert.equal(interpreted.status, row.status);
      assert.equal(interpreted.scoreText, row.score);
      if (row.status === "unfinished") {
        assert.equal(interpreted.leader.id, row.primary);
        assert.equal(interpreted.trailing.id, row.opponent);
      } else {
        assert.equal(interpreted.winner.id, row.primary);
        assert.equal(interpreted.loser.id, row.opponent);
      }
    });
  }

  it("parses Nick beat Minato yesterday 36 60 62 weight 3", async () => {
    const parsed = await hybridParseQuickMatch({
      text: "Nick beat Minato yesterday 36 60 62 weight 3",
      roster,
      selectedDate: "2026-09-03",
      selectedWeight: 1,
      now,
      allowAi: false,
    });
    assert.ok(parsed.ok);
    assert.equal(parsed.source, "deterministic");
    assert.equal(parsed.status, "completed");
    assert.equal(parsed.primary.id, "nick");
    assert.equal(parsed.opponent.id, "minato");
    assert.equal(parsed.scoreText, "3-6, 6-0, 6-2");
    assert.equal(parsed.weight, 3);
    assert.equal(parsed.weightFromText, true);
    assert.equal(parsed.playedAt, "2026-09-02");
    assert.equal(parsed.dateFromText, true);
  });
});

describe("intra-squad natural date and weight", () => {
  it("resolves yesterday/today/weekday and month dates", () => {
    assert.equal(extractNaturalDate("played yesterday", now).dateIso, "2026-09-02");
    assert.equal(extractNaturalDate("played today", now).dateIso, "2026-09-03");
    assert.equal(extractNaturalDate("last Friday", now).dateIso, "2026-08-28");
    assert.equal(extractNaturalDate("Sep 2", now).dateIso, "2026-09-02");
    assert.equal(extractNaturalDate("September 2, 2026", now).dateIso, "2026-09-02");
  });

  it("resolves natural weight phrases", () => {
    assert.equal(extractNaturalWeight("result weight 3").weight, 3);
    assert.equal(extractNaturalWeight("make that a 2").weight, 2);
    assert.equal(extractNaturalWeight("worth 1").weight, 1);
    assert.equal(extractNaturalWeight("three-point match").weight, 3);
    assert.equal(extractNaturalWeight("value 2").weightFromText, true);
  });
});

describe("intra-squad hybrid AI fallback", () => {
  it("does not call AI when deterministic succeeds", async () => {
    let aiCalls = 0;
    const parsed = await hybridParseQuickMatch({
      text: "Nick beat Minato 36 60 62",
      roster,
      selectedDate: "2026-09-03",
      selectedWeight: 1,
      now,
      aiExtract: async () => {
        aiCalls += 1;
        return { error: "should not run" };
      },
    });
    assert.ok(parsed.ok);
    assert.equal(parsed.source, "deterministic");
    assert.equal(aiCalls, 0);
  });

  it("invokes AI fallback for opaque coach phrasing", async () => {
    let aiCalls = 0;
    const parsed = await hybridParseQuickMatch({
      text: "pretty sure chika had jackson down a set and a break when practice ended",
      roster,
      selectedDate: "2026-09-03",
      selectedWeight: 1,
      now,
      aiExtract: async () => {
        aiCalls += 1;
        return {
          status: "unfinished",
          playerAName: "Chika",
          playerBName: "Jackson",
          winnerName: null,
          loserName: null,
          leaderName: "Chika",
          trailingName: "Jackson",
          score: "6-4, 3-2",
          weight: null,
          dateText: null,
          confidence: 0.91,
          interpretation: "Chika leading Jackson",
        };
      },
    });
    assert.equal(aiCalls, 1);
    assert.ok(parsed.ok);
    assert.equal(parsed.source, "ai");
    assert.equal(parsed.primary.id, "chika");
    assert.equal(parsed.opponent.id, "jackson");
    assert.equal(parsed.scoreText, "6-4, 3-2");
    assert.equal(parsed.needsConfirmation, false);
  });

  it("marks low-confidence AI interpretations for confirmation", async () => {
    const parsed = await hybridParseQuickMatch({
      text: "some unclear result between chika and jackson",
      roster,
      selectedDate: "2026-09-03",
      selectedWeight: 2,
      now,
      aiExtract: async () => ({
        status: "unfinished",
        playerAName: "Chika",
        playerBName: "Jackson",
        winnerName: null,
        loserName: null,
        leaderName: "Chika",
        trailingName: "Jackson",
        score: "6-4, 3-2",
        weight: 2,
        dateText: null,
        confidence: 0.55,
        interpretation: "Maybe Chika leading Jackson",
      }),
    });
    assert.ok(parsed.ok);
    assert.equal(parsed.needsConfirmation, true);
    assert.equal(parsed.weight, 2);
  });

  it("returns AI unavailable fallback message", async () => {
    const parsed = await hybridParseQuickMatch({
      text: "totally opaque tennis sentence with no grammar",
      roster,
      selectedDate: "2026-09-03",
      selectedWeight: 1,
      now,
      aiExtract: async () => ({ error: AI_PARSE_UNAVAILABLE }),
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error, AI_PARSE_UNAVAILABLE);
      assert.equal(parsed.aiAttempted, true);
    }
  });

  it("rejects invented players after AI extraction", () => {
    const validated = validateAiExtraction(
      {
        status: "completed",
        playerAName: "Nobody",
        playerBName: "Kyle",
        winnerName: "Nobody",
        loserName: "Kyle",
        leaderName: null,
        trailingName: null,
        score: "6-1, 6-1",
        weight: 1,
        dateText: null,
        confidence: 0.9,
        interpretation: "Nobody beat Kyle",
      },
      {
        roster,
        selectedDate: "2026-09-03",
        selectedWeight: 1,
        sourceText: "Nobody beat Kyle 6-1 6-1",
        now,
      },
    );
    assert.equal(validated.ok, false);
    if (!validated.ok) assert.match(validated.error, /Couldn’t resolve player/);
  });

  it("validates structured AI JSON output", () => {
    const parsed = parseAiExtractionJson(
      JSON.stringify({
        status: "completed",
        playerAName: "Nick",
        playerBName: "Minato",
        winnerName: "Nick",
        loserName: "Minato",
        leaderName: null,
        trailingName: null,
        score: "3-6, 6-0, 6-2",
        weight: 3,
        dateText: "yesterday",
        confidence: 0.88,
        interpretation: "Nick def. Minato",
      }),
    );
    assert.ok(!("error" in parsed));
    assert.equal(parsed.winnerName, "Nick");
    assert.equal(parsed.weight, 3);
  });

  it("parse endpoint does not write matches", () => {
    assert.match(routeSource, /hybridParseQuickMatch/);
    assert.doesNotMatch(routeSource, /saveIntraSquadMatch/);
    assert.doesNotMatch(routeSource, /insert\(/);
  });

  it("validated save path never accepts raw AI prose", () => {
    assert.match(actionsSource, /saveValidatedQuickMatchAction/);
    assert.match(actionsSource, /normalizeIntraSquadInput/);
    const stored = normalizeIntraSquadInput({
      playedAt: "2026-09-03",
      status: "completed",
      winnerPlayerId: "nick",
      loserPlayerId: "minato",
      scoreText: "3-6, 6-0, 6-2",
      weight: 3,
      sourceText: "opaque AI sentence",
    });
    assert.ok(!("error" in stored));
    assert.equal(stored.input.scoreText, "3-6, 6-0, 6-2");
  });

  it("AI unavailable still leaves deterministic parsing working", async () => {
    const parsed = await hybridParseQuickMatch({
      text: "Balraj won over Kyle 61 61",
      roster,
      selectedDate: "2026-09-03",
      selectedWeight: 1,
      now,
      aiExtract: async () => ({ error: AI_PARSE_UNAVAILABLE }),
    });
    assert.ok(parsed.ok);
    assert.equal(parsed.source, "deterministic");
  });
});
