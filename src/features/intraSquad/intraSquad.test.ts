import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";

import {
  freshQuickMatchDateState,
  playedAtForMatchForm,
  resolveQuickMatchDate,
  todayLocalIsoDate,
} from "./dates";
import { formatPlayedAtLabel, intraSquadDashboardStats, sortMatchesNewestFirst } from "./display";
import { inputToRow, normalizeIntraSquadInput } from "./mapping";
import { interpretMatchEntry, parseMatchSkeleton, parseMatchText } from "./parseMatchText";
import { invertScoreSets } from "./parseScore";
import {
  formatPersistError,
  formatUnknownPlayerError,
  IntraSquadRepositoryError,
  ROSTER_UNAVAILABLE_ERROR,
} from "./persistErrors";
import { computeProvisionalRankings } from "./rankings";
import { computePlayerRecords, formatUnfinishedRecord, playerResultsFromMatch } from "./records";
import { eloScoreForOutcome, formatResultCredit, rankingCreditForOutcome } from "./resultModel";
import { resolveMatchPlayers, resolvePlayerName } from "./resolvePlayers";
import { currentRosterPlayers } from "./roster";
import { UNFINISHED_MISSING_SCORE, type IntraSquadMatch, type RosterPlayer } from "./types";

const migrationSql = readFileSync(
  path.join(process.cwd(), "supabase/migrations/0043_intra_squad_matches.sql"),
  "utf8",
);
const unfinishedMigrationSql = readFileSync(
  path.join(process.cwd(), "supabase/migrations/0044_intra_squad_unfinished_matches.sql"),
  "utf8",
);
const datesSource = readFileSync(path.join(process.cwd(), "src/features/intraSquad/dates.ts"), "utf8");
const workspaceSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadWorkspace.tsx"),
  "utf8",
);
const cssSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/intraSquadDashboard.module.css"),
  "utf8",
);
const quickEntrySource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/QuickMatchEntry.tsx"),
  "utf8",
);
const matchListSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadMatchList.tsx"),
  "utf8",
);
const matchFormSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadMatchForm.tsx"),
  "utf8",
);
const pageSource = readFileSync(
  path.join(process.cwd(), "src/app/team-operations/intra-squad/page.tsx"),
  "utf8",
);
const loadSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/loadWorkspace.ts"),
  "utf8",
);
const deleteButtonSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/DeleteMatchButton.tsx"),
  "utf8",
);
const rowActionsSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/MatchRowActions.tsx"),
  "utf8",
);
const deleteConfirmSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadDeleteConfirm.tsx"),
  "utf8",
);

function isoToUsSlash(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

function person(
  id: string,
  first: string,
  last: string,
  roleKey: string = ROLE_KEYS.player,
  statusKey: string = STATUS_KEYS.current,
): Person {
  return {
    id,
    firstName: first,
    lastName: last,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    relationships: [],
    roleId: `role-${roleKey}`,
    statusId: `status-${statusKey}`,
    role: { id: `role-${roleKey}`, key: roleKey, label: roleKey },
    status: { id: `status-${statusKey}`, key: statusKey, label: statusKey },
  };
}

const people = [
  person("arya", "Arya", "Ganapathy Kallambella"),
  person("aidan", "Aidan", "Borosko"),
  person("nick", "Nick", "Meyers"),
  person("minato", "Minato", "Koido"),
  person("balraj", "Balraj", "Idnani"),
  person("kyle", "Kyle", "Patrick"),
  person("chika", "Chika", "Okurama"),
  person("jackson", "Jackson", "Smith"),
  person("nick-coach", "Nick", "Williams", ROLE_KEYS.coach, STATUS_KEYS.current),
  person("alex-a", "Alex", "One"),
  person("alex-b", "Alex", "Two"),
];

const roster: RosterPlayer[] = currentRosterPlayers(people);

function match(overrides: Partial<IntraSquadMatch> & Pick<IntraSquadMatch, "id">): IntraSquadMatch {
  return {
    playedAt: "2026-09-03",
    status: "completed",
    winnerPlayerId: null,
    loserPlayerId: null,
    leaderPlayerId: null,
    trailingPlayerId: null,
    scoreText: "6-1, 6-1",
    scoreSets: [
      { winnerGames: 6, loserGames: 1 },
      { winnerGames: 6, loserGames: 1 },
    ],
    weight: 1,
    sourceText: null,
    createdAt: "2026-09-03T12:00:00.000Z",
    updatedAt: "2026-09-03T12:00:00.000Z",
    ...overrides,
  };
}

describe("intra-squad migration", () => {
  it("creates an additive intra_squad_matches table", () => {
    assert.match(migrationSql, /create table if not exists public\.intra_squad_matches/);
    assert.match(migrationSql, /winner_player_id text not null references public\.production_people/);
    assert.match(migrationSql, /weight integer not null default 1/);
    assert.match(migrationSql, /weight in \(1, 2, 3\)/);
    assert.doesNotMatch(migrationSql, /drop table/i);
    assert.doesNotMatch(migrationSql, /truncate/i);
  });

  it("adds unfinished status and leader/trailing columns additively", () => {
    assert.match(unfinishedMigrationSql, /add column if not exists status text not null default 'completed'/);
    assert.match(unfinishedMigrationSql, /leader_player_id/);
    assert.match(unfinishedMigrationSql, /trailing_player_id/);
    assert.match(unfinishedMigrationSql, /alter column winner_player_id drop not null/);
    assert.match(unfinishedMigrationSql, /status in \('completed', 'unfinished'\)/);
    assert.doesNotMatch(unfinishedMigrationSql, /drop table/i);
    assert.doesNotMatch(unfinishedMigrationSql, /truncate/i);
  });
});

describe("intra-squad natural-language parser", () => {
  it("1. parses Arya def. Aidan 6-1, 6-1", () => {
    const parsed = parseMatchText("Arya def. Aidan 6-1, 6-1");
    assert.ok(!("error" in parsed));
    assert.equal(parsed.winnerName, "Arya");
    assert.equal(parsed.loserName, "Aidan");
    assert.equal(parsed.scoreText, "6-1, 6-1");
    assert.deepEqual(parsed.scoreSets, [
      { winnerGames: 6, loserGames: 1 },
      { winnerGames: 6, loserGames: 1 },
    ]);
    assert.equal(parsed.weight, 1);
    assert.equal(parsed.weightFromText, false);
  });

  it("2. parses Nick def. Minato 2-6, 6-2, 6-4 without assuming the winner took every set", () => {
    const parsed = parseMatchText("Nick def. Minato 2-6, 6-2, 6-4");
    assert.ok(!("error" in parsed));
    assert.equal(parsed.winnerName, "Nick");
    assert.equal(parsed.loserName, "Minato");
    assert.deepEqual(parsed.scoreSets, [
      { winnerGames: 2, loserGames: 6 },
      { winnerGames: 6, loserGames: 2 },
      { winnerGames: 6, loserGames: 4 },
    ]);
  });

  it("3. parses explicit weight 3", () => {
    const parsed = parseMatchText("Nick def. Minato 2-6, 6-2, 6-4 (weight 3)");
    assert.ok(!("error" in parsed));
    assert.equal(parsed.weight, 3);
    assert.equal(parsed.weightFromText, true);
    const inline = parseMatchText("Arya def Aidan 6-1, 6-1 weight 2");
    assert.ok(!("error" in inline));
    assert.equal(inline.weight, 2);
  });

  it("4. uses the selected weight when text contains no weight", () => {
    const parsed = parseMatchText("Arya beat Aidan 6-1 6-1", { defaultWeight: 2 });
    assert.ok(!("error" in parsed));
    assert.equal(parsed.weight, 2);
    assert.equal(parsed.weightFromText, false);
  });

  it("supports defeated / beats and case-insensitive verbs", () => {
    const defeated = parseMatchText("Nick defeated Minato 2-6 6-2 6-4");
    assert.ok(!("error" in defeated));
    const mixed = parseMatchText("arya DEF aidan 6-1, 6-1");
    assert.ok(!("error" in mixed));
    assert.equal(mixed.winnerName, "arya");
    assert.equal(mixed.loserName, "aidan");
  });

  it("1. parses Nick def. Minato 3-6, 6-0, 6-2", () => {
    const parsed = parseMatchText("Nick def. Minato 3-6, 6-0, 6-2");
    assert.ok(!("error" in parsed));
    assert.equal(parsed.winnerName, "Nick");
    assert.equal(parsed.loserName, "Minato");
    assert.equal(parsed.scoreText, "3-6, 6-0, 6-2");
    const interpreted = interpretMatchEntry("Nick def. Minato 3-6, 6-0, 6-2", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.winner.id, "nick");
    assert.equal(interpreted.loser.id, "minato");
    assert.equal(interpreted.scoreText, "3-6, 6-0, 6-2");
  });

  it("parses def without a period, spaces-only scores, defeated, and beat", () => {
    for (const raw of [
      "Nick def Minato 3-6 6-0 6-2",
      "Nick defeated Minato 3-6, 6-0, 6-2",
      "Nick beat Minato 3-6, 6-0, 6-2",
    ]) {
      const parsed = parseMatchText(raw);
      assert.ok(!("error" in parsed), raw);
      assert.equal(parsed.winnerName, "Nick");
      assert.equal(parsed.loserName, "Minato");
      assert.deepEqual(parsed.scoreSets, [
        { winnerGames: 3, loserGames: 6 },
        { winnerGames: 6, loserGames: 0 },
        { winnerGames: 6, loserGames: 2 },
      ]);
    }
  });
});

describe("intra-squad malformed score vs player names", () => {
  it("2. compact/malformed score tokens are not appended to the loser name", () => {
    const skeleton = parseMatchSkeleton("Nick def. Minato 36, 6-0, 6-2", { roster });
    assert.ok(!("error" in skeleton));
    assert.equal(skeleton.winnerName, "Nick");
    assert.equal(skeleton.loserName, "Minato");
    assert.equal(skeleton.loserName.includes("36"), false);
    assert.match(skeleton.scoreRaw, /36/);
  });

  it("3. invalid compact scores are rejected with a set-specific error", () => {
    const parsed = parseMatchText("Nick def. Minato 88, 6-0, 6-2");
    assert.ok("error" in parsed);
    assert.equal(parsed.error, "Couldn’t parse the set “88”.");
    const interpreted = interpretMatchEntry("Nick def. Minato 88, 6-0, 6-2", roster);
    assert.ok("error" in interpreted);
    assert.equal(interpreted.error, "Couldn’t parse the set “88”.");
    assert.equal("ok" in interpreted, false);
  });

  it("rejects ambiguous compact scores such as 88 / 123 / 100", () => {
    for (const raw of ["Arya def. Aidan 88, 88", "Arya def. Aidan 123", "Arya def. Aidan 100, 61"]) {
      const interpreted = interpretMatchEntry(raw, roster);
      assert.ok("error" in interpreted, raw);
      assert.match(interpreted.error, /Couldn’t parse the set/);
    }
  });

  it("4. resolves roster names before score validation", () => {
    const skeleton = parseMatchSkeleton("Nick def. Minato 88, 6-0, 6-2", { roster });
    assert.ok(!("error" in skeleton));
    const resolved = resolveMatchPlayers(skeleton.winnerName, skeleton.loserName, roster);
    assert.equal(resolved.status, "resolved");
    if (resolved.status === "resolved") {
      assert.equal(resolved.winner.id, "nick");
      assert.equal(resolved.loser.id, "minato");
    }
    const interpreted = interpretMatchEntry("Nick def. Minato 88, 6-0, 6-2", roster);
    assert.ok("error" in interpreted);
    assert.doesNotMatch(interpreted.error, /Unknown player/);
    assert.doesNotMatch(interpreted.error, /Minato 88/);
  });

  it("C. parses Arya def. Aidan 6-1, 6-1 with roster resolution", () => {
    const interpreted = interpretMatchEntry("Arya def. Aidan 6-1, 6-1", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.winner.id, "arya");
    assert.equal(interpreted.loser.id, "aidan");
    assert.equal(interpreted.scoreText, "6-1, 6-1");
  });
});

describe("intra-squad compact tennis score shorthand", () => {
  it("parses Balraj def. Kyle 61, 61 as 6-1, 6-1", () => {
    const interpreted = interpretMatchEntry("Balraj def. Kyle 61, 61", roster);
    assert.ok(!("error" in interpreted));
    assert.equal(interpreted.winner.id, "balraj");
    assert.equal(interpreted.loser.id, "kyle");
    assert.equal(interpreted.scoreText, "6-1, 6-1");
    assert.deepEqual(interpreted.scoreSets, [
      { winnerGames: 6, loserGames: 1 },
      { winnerGames: 6, loserGames: 1 },
    ]);
  });

  it("parses Nick def. Minato 36, 60, 62 as 3-6, 6-0, 6-2", () => {
    const interpreted = interpretMatchEntry("Nick def. Minato 36, 60, 62", roster);
    assert.ok(!("error" in interpreted));
    assert.equal(interpreted.winner.id, "nick");
    assert.equal(interpreted.loser.id, "minato");
    assert.equal(interpreted.scoreText, "3-6, 6-0, 6-2");
  });

  it("parses Arya def. Aidan 64 63 as 6-4, 6-3", () => {
    const interpreted = interpretMatchEntry("Arya def. Aidan 64 63", roster);
    assert.ok(!("error" in interpreted));
    assert.equal(interpreted.winner.id, "arya");
    assert.equal(interpreted.loser.id, "aidan");
    assert.equal(interpreted.scoreText, "6-4, 6-3");
  });

  it("still accepts explicit hyphenated scores", () => {
    const interpreted = interpretMatchEntry("Balraj def. Kyle 6-1, 6-1", roster);
    assert.ok(!("error" in interpreted));
    assert.equal(interpreted.scoreText, "6-1, 6-1");
  });

  it("does not let compact score tokens become part of player names", () => {
    const skeleton = parseMatchSkeleton("Balraj def. Kyle 61, 61", { roster });
    assert.ok(!("error" in skeleton));
    assert.equal(skeleton.loserName, "Kyle");
    assert.equal(skeleton.loserName.includes("61"), false);
  });

  it("valid compact score normalizes for save while preserving selected date", () => {
    const interpreted = interpretMatchEntry("Balraj def. Kyle 61, 61", roster);
    assert.ok(!("error" in interpreted));
    const stored = normalizeIntraSquadInput({
      playedAt: "2026-09-02",
      winnerPlayerId: interpreted.winner.id,
      loserPlayerId: interpreted.loser.id,
      scoreText: interpreted.scoreText,
      scoreSets: interpreted.scoreSets,
      weight: 1,
      sourceText: "Balraj def. Kyle 61, 61",
    });
    assert.ok(!("error" in stored));
    assert.equal(stored.input.scoreText, "6-1, 6-1");
    assert.equal(stored.input.playedAt, "2026-09-02");
    assert.equal(stored.input.sourceText, "Balraj def. Kyle 61, 61");
    assert.equal(stored.input.winnerPlayerId, "balraj");
    assert.equal(stored.input.loserPlayerId, "kyle");
  });
});

describe("intra-squad player resolution", () => {
  it("5. invalid same player rejected", () => {
    const parsed = parseMatchText("Arya def. Arya 6-1, 6-1");
    assert.ok(!("error" in parsed));
    const resolved = resolveMatchPlayers(parsed.winnerName, parsed.loserName, roster);
    assert.equal(resolved.status, "same-player");
  });

  it("6. unknown player rejected", () => {
    const resolved = resolvePlayerName("Nobody", roster);
    assert.equal(resolved.status, "unknown");
  });

  it("7. ambiguous first name does not guess", () => {
    const resolved = resolvePlayerName("Alex", roster);
    assert.equal(resolved.status, "ambiguous");
    if (resolved.status === "ambiguous") {
      assert.equal(resolved.candidates.length, 2);
    }
  });

  it("resolves common first names to current roster players only", () => {
    assert.equal(resolvePlayerName("Arya", roster).status, "resolved");
    assert.equal(resolvePlayerName("Aidan", roster).status, "resolved");
    assert.equal(resolvePlayerName("Minato", roster).status, "resolved");
    const nick = resolvePlayerName("Nick", roster);
    assert.equal(nick.status, "resolved");
    if (nick.status === "resolved") assert.equal(nick.player.id, "nick");
    assert.ok(!roster.some((player) => player.id === "nick-coach"));
  });
});

describe("intra-squad dates", () => {
  it("8. today date defaults correctly using local calendar components", () => {
    const now = new Date(2026, 8, 3, 23, 30, 0);
    assert.equal(todayLocalIsoDate(now), "2026-09-03");
    assert.match(datesSource, /now\.getFullYear\(\)/);
    assert.match(datesSource, /now\.getMonth\(\)/);
    assert.match(datesSource, /now\.getDate\(\)/);
    assert.doesNotMatch(datesSource, /toISOString\(\)/);
  });

  it("5. new form defaults to local today even if state still holds a stale date", () => {
    const now = new Date(2026, 8, 3, 9, 0, 0);
    const fresh = freshQuickMatchDateState(now);
    assert.equal(fresh.dateTouched, false);
    assert.equal(resolveQuickMatchDate(fresh, now), "2026-09-03");
    assert.equal(
      resolveQuickMatchDate({ playedAt: "2026-08-27", dateTouched: false }, now),
      "2026-09-03",
    );
    assert.equal(isoToUsSlash(resolveQuickMatchDate(fresh, now)), "09/03/2026");
  });

  it("6. displayed Today date and date input always agree", () => {
    const now = new Date(2026, 8, 3, 9, 0, 0);
    const iso = resolveQuickMatchDate({ playedAt: "2026-08-27", dateTouched: false }, now);
    assert.equal(iso, "2026-09-03");
    assert.equal(formatPlayedAtLabel(iso, now), "Today · Sep 3, 2026");
    assert.equal(isoToUsSlash(iso), "09/03/2026");
    assert.match(quickEntrySource, /const dateValue = resolveQuickMatchDate\(dateState\)/);
    assert.match(quickEntrySource, /const dateLabel = formatPlayedAtLabel\(dateValue\)/);
    assert.match(quickEntrySource, /value=\{preview\?\.dateFromText \? preview\.playedAt : dateValue\}/);
    assert.match(quickEntrySource, /data-intra-squad-date-label/);
    assert.match(quickEntrySource, /data-intra-squad-date-input/);
  });

  it("7. historical selected date persists for that match", () => {
    const now = new Date(2026, 8, 3, 9, 0, 0);
    const historical = resolveQuickMatchDate({ playedAt: "2026-09-01", dateTouched: true }, now);
    assert.equal(historical, "2026-09-01");
    assert.equal(formatPlayedAtLabel(historical, now), "Sep 1, 2026");
    const parsed = normalizeIntraSquadInput({
      playedAt: "2026-09-01",
      winnerPlayerId: "arya",
      loserPlayerId: "aidan",
      scoreText: "6-1, 6-1",
      weight: 1,
      sourceText: "Arya def. Aidan 6-1, 6-1",
    });
    assert.ok(!("error" in parsed));
    assert.equal(parsed.input.playedAt, "2026-09-01");
  });

  it("8. successful add resets next form to current local date", () => {
    const now = new Date(2026, 8, 3, 9, 0, 0);
    const afterHistoricalSave = freshQuickMatchDateState(now);
    assert.equal(resolveQuickMatchDate(afterHistoricalSave, now), "2026-09-03");
    assert.match(quickEntrySource, /setDateState\(freshQuickMatchDateState\(\)\)/);
    assert.match(quickEntrySource, /setWeight\(1\)/);
    assert.match(quickEntrySource, /setText\(""\)/);
  });

  it("9. editing an existing match does not overwrite its date with today", () => {
    const now = new Date(2026, 8, 3, 9, 0, 0);
    assert.equal(
      playedAtForMatchForm({ playedAt: "2026-04-12" }, now),
      "2026-04-12",
    );
    assert.equal(playedAtForMatchForm(undefined, now), "2026-09-03");
    assert.match(matchFormSource, /playedAtForMatchForm\(match\)/);
    assert.doesNotMatch(matchFormSource, /todayLocalIsoDate\(\)/);
  });

  it("9. historical chosen date persists through normalize", () => {
    const parsed = normalizeIntraSquadInput({
      playedAt: "2026-04-12",
      winnerPlayerId: "arya",
      loserPlayerId: "aidan",
      scoreText: "6-1, 6-1",
      weight: 1,
      sourceText: "Arya def. Aidan 6-1, 6-1",
    });
    assert.ok(!("error" in parsed));
    assert.equal(parsed.input.playedAt, "2026-04-12");
  });
});

describe("intra-squad records and rankings", () => {
  it("10. one canonical match updates both player records", () => {
    const stored = match({ id: "m1", winnerPlayerId: "arya", loserPlayerId: "aidan", weight: 2 });
    const [winner, loser] = playerResultsFromMatch(stored);
    assert.equal(winner.outcome, "W");
    assert.equal(winner.opponentId, "aidan");
    assert.equal(loser.outcome, "L");
    assert.equal(loser.opponentId, "arya");
    assert.equal(loser.perspectiveScoreText, invertScoreSets(stored.scoreSets).map((set) => `${set.winnerGames}-${set.loserGames}`).join(", "));
    const records = computePlayerRecords([stored]);
    assert.equal(records.length, 2);
  });

  it("11. Arya win increments Arya W and Aidan L", () => {
    const records = computePlayerRecords([
      match({ id: "m1", winnerPlayerId: "arya", loserPlayerId: "aidan" }),
    ]);
    const arya = records.find((row) => row.playerId === "arya");
    const aidan = records.find((row) => row.playerId === "aidan");
    assert.equal(arya?.wins, 1);
    assert.equal(arya?.losses, 0);
    assert.equal(aidan?.wins, 0);
    assert.equal(aidan?.losses, 1);
  });

  it("12. weight 3 creates +3 / -3 weighted result", () => {
    const stored = match({ id: "m1", winnerPlayerId: "arya", loserPlayerId: "aidan", weight: 3 });
    const [winner, loser] = playerResultsFromMatch(stored);
    assert.equal(winner.weightedValue, 3);
    assert.equal(loser.weightedValue, -3);
    const records = computePlayerRecords([stored]);
    assert.equal(records.find((row) => row.playerId === "arya")?.weightedNet, 3);
    assert.equal(records.find((row) => row.playerId === "aidan")?.weightedNet, -3);
  });

  it("13. editing weight recalculates standings", () => {
    const original = match({ id: "m1", winnerPlayerId: "arya", loserPlayerId: "aidan", weight: 1 });
    const before = computePlayerRecords([original]);
    assert.equal(before.find((row) => row.playerId === "arya")?.weightedNet, 1);
    const edited: IntraSquadMatch = { ...original, weight: 3 };
    const after = computePlayerRecords([edited]);
    assert.equal(after.find((row) => row.playerId === "arya")?.weightedNet, 3);
    assert.equal(after.find((row) => row.playerId === "aidan")?.weightedNet, -3);
  });

  it("14. deleting match recalculates records", () => {
    const matches = [
      match({ id: "m1", winnerPlayerId: "arya", loserPlayerId: "aidan", weight: 2 }),
      match({ id: "m2", winnerPlayerId: "nick", loserPlayerId: "minato", weight: 1 }),
    ];
    assert.equal(computePlayerRecords(matches).length, 4);
    const remaining = matches.filter((row) => row.id !== "m1");
    const records = computePlayerRecords(remaining);
    assert.equal(records.find((row) => row.playerId === "arya"), undefined);
    assert.equal(records.find((row) => row.playerId === "nick")?.wins, 1);
  });

  it("15. newest matches sort first", () => {
    const matches = [
      match({ id: "old", winnerPlayerId: "arya", loserPlayerId: "aidan", playedAt: "2026-09-01", createdAt: "2026-09-01T10:00:00.000Z" }),
      match({ id: "new", winnerPlayerId: "nick", loserPlayerId: "minato", playedAt: "2026-09-03", createdAt: "2026-09-03T10:00:00.000Z" }),
      match({
        id: "newer-same-day",
        winnerPlayerId: "arya",
        loserPlayerId: "minato",
        playedAt: "2026-09-03",
        createdAt: "2026-09-03T18:00:00.000Z",
      }),
    ];
    assert.deepEqual(
      sortMatchesNewestFirst(matches).map((row) => row.id),
      ["newer-same-day", "new", "old"],
    );
  });

  it("16. Top 5 provisional ranking is deterministic", () => {
    const matches = [
      match({ id: "1", winnerPlayerId: "arya", loserPlayerId: "aidan", weight: 3 }),
      match({ id: "2", winnerPlayerId: "arya", loserPlayerId: "minato", weight: 1 }),
      match({ id: "3", winnerPlayerId: "nick", loserPlayerId: "aidan", weight: 2 }),
      match({ id: "4", winnerPlayerId: "minato", loserPlayerId: "aidan", weight: 1 }),
    ];
    const records = computePlayerRecords(matches);
    const ranked = computeProvisionalRankings(matches, records, roster);
    assert.deepEqual(
      ranked.map((row) => row.playerId),
      ["arya", "nick", "minato", "aidan"],
    );
    assert.equal(ranked[0]?.rank, 1);
    assert.equal(ranked[0]?.weightedNet, 4);
  });
});

describe("intra-squad UI wiring", () => {
  it("17. mobile Quick Match Entry remains first/prominent", () => {
    assert.match(workspaceSource, /data-intra-squad-quick-entry/);
    assert.match(workspaceSource, /data-intra-squad-dashboard/);
    assert.match(cssSource, /grid-area:\s*quick/);
    assert.match(cssSource, /"quick"/);
    assert.match(cssSource, /"metrics"/);
    assert.match(cssSource, /"rankings"/);
    assert.match(quickEntrySource, /Quick Match Entry/);
    assert.match(quickEntrySource, /addMatch/);
    assert.match(matchListSource, /md:hidden/);
  });

  it("desktop uses a full-width two-column grid at 1024px", () => {
    assert.match(cssSource, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
    assert.match(cssSource, /min-width: 1024px/);
    assert.match(cssSource, /"quick rankings"/);
    assert.match(cssSource, /"recent elo"/);
    assert.doesNotMatch(cssSource, /max-width:\s*(4|5|6)\d{2}px/);
    assert.doesNotMatch(workspaceSource, /lg:items-start/);
    assert.match(cssSource, /flex-direction: row/);
    assert.match(quickEntrySource, /data-intra-squad-weight-controls/);
    assert.match(quickEntrySource, /data-intra-squad-parse-preview/);
    assert.match(quickEntrySource, /interpretMatchEntry/);
  });

  it("rejects invalid input without saving", () => {
    const parsed = parseMatchText("just some names");
    assert.ok("error" in parsed);
  });
});

describe("intra-squad add match and delete", () => {
  it("1. Add Match button is a single submit handler", () => {
    assert.match(quickEntrySource, /data-intra-squad-quick-form=""/);
    assert.match(quickEntrySource, /onSubmit=\{onSubmit\}/);
    assert.match(quickEntrySource, /data-intra-squad-add-match=""/);
    assert.match(quickEntrySource, /type="submit"/);
    assert.match(quickEntrySource, /if \(submitLockRef\.current\) return/);
    assert.match(quickEntrySource, /Adding\.\.\./);
    assert.match(quickEntrySource, /Understanding\.\.\./);
    assert.match(quickEntrySource, /disabled=\{buttonDisabled\}/);
    assert.match(quickEntrySource, /!hasText \|\| busyPhase !== null/);
    assert.match(quickEntrySource, /saveValidatedQuickMatchAction/);
  });

  it("Add Match enables from non-empty text without requiring preview", () => {
    assert.match(quickEntrySource, /const hasText = trimmedText\.length > 0/);
    assert.match(quickEntrySource, /buttonDisabled = !hasText \|\| busyPhase !== null/);
    assert.doesNotMatch(quickEntrySource, /canAdd/);
    assert.doesNotMatch(quickEntrySource, /disabled=\{saving \|\| !canAdd\}/);
    assert.match(quickEntrySource, /setBusyPhase\("understanding"\)/);
    assert.match(quickEntrySource, /interpretMatchEntry\(trimmed, roster/);
  });

  it("2. valid Balraj def. Kyle 6-1, 6-1 saves through normalize", () => {
    const interpreted = interpretMatchEntry("Balraj def. Kyle 6-1, 6-1", roster);
    assert.ok(!("error" in interpreted));
    const stored = normalizeIntraSquadInput({
      playedAt: "2026-09-03",
      winnerPlayerId: interpreted.winner.id,
      loserPlayerId: interpreted.loser.id,
      scoreText: interpreted.scoreText,
      scoreSets: interpreted.scoreSets,
      weight: 1,
      sourceText: "Balraj def. Kyle 6-1, 6-1",
    });
    assert.ok(!("error" in stored));
    assert.equal(stored.input.winnerPlayerId, "balraj");
    assert.equal(stored.input.loserPlayerId, "kyle");
    assert.equal(stored.input.scoreText, "6-1, 6-1");
    assert.equal(stored.input.playedAt, "2026-09-03");
  });

  it("3. Balraj resolves", () => {
    const resolved = resolvePlayerName("Balraj", roster);
    assert.equal(resolved.status, "resolved");
    if (resolved.status === "resolved") assert.equal(resolved.player.id, "balraj");
  });

  it("4. Kyle resolves", () => {
    const resolved = resolvePlayerName("Kyle", roster);
    assert.equal(resolved.status, "resolved");
    if (resolved.status === "resolved") assert.equal(resolved.player.id, "kyle");
  });

  it("parses Balraj def. Kyle with or without commas", () => {
    for (const raw of ["Balraj def. Kyle 6-1, 6-1", "Balraj def. Kyle 6-1 6-1"]) {
      const interpreted = interpretMatchEntry(raw, roster);
      assert.ok(!("error" in interpreted), raw);
      assert.equal(interpreted.winner.id, "balraj");
      assert.equal(interpreted.loser.id, "kyle");
      assert.equal(interpreted.scoreText, "6-1, 6-1");
    }
  });

  it("saves Balraj def. Kyle 61, 61 after compact normalization", () => {
    const interpreted = interpretMatchEntry("Balraj def. Kyle 61, 61", roster);
    assert.ok(!("error" in interpreted));
    assert.equal(interpreted.scoreText, "6-1, 6-1");
  });

  it("5. selected date is stored", () => {
    const parsed = normalizeIntraSquadInput({
      playedAt: "2026-09-03",
      winnerPlayerId: "balraj",
      loserPlayerId: "kyle",
      scoreText: "6-1, 6-1",
      weight: 1,
      sourceText: "Balraj def. Kyle 6-1, 6-1",
    });
    assert.ok(!("error" in parsed));
    assert.equal(parsed.input.playedAt, "2026-09-03");
    assert.match(quickEntrySource, /playedAt: next\.playedAt/);
  });

  it("6. successful save updates dashboard stats", () => {
    const before = intraSquadDashboardStats([]);
    assert.equal(before.totalMatches, 0);
    assert.equal(before.activePlayers, 0);
    const after = intraSquadDashboardStats([
      match({ id: "new", winnerPlayerId: "balraj", loserPlayerId: "kyle", playedAt: "2026-09-03" }),
    ]);
    assert.equal(after.totalMatches, 1);
    assert.equal(after.activePlayers, 2);
    assert.equal(after.avgMatchWeight, 1);
    assert.equal(after.lastMatch?.id, "new");
    assert.match(workspaceSource, /onSaved=\{commitSavedMatch\}/);
    assert.match(workspaceSource, /rebuildIntraSquadDerivedState/);
    assert.match(workspaceSource, /router\.refresh\(\)/);
  });

  it("7. successful save clears and resets the form", () => {
    assert.match(quickEntrySource, /setText\(""\)/);
    assert.match(quickEntrySource, /setWeight\(1\)/);
    assert.match(quickEntrySource, /setDateState\(freshQuickMatchDateState\(\)\)/);
  });

  it("8. save failure shows a visible error", () => {
    assert.equal(
      formatPersistError(new Error("Failed to create intra-squad match: RLS")),
      "Couldn’t save match. Database insert failed.",
    );
    assert.equal(formatUnknownPlayerError("Kyle"), "Couldn’t resolve player “Kyle”.");
    assert.match(quickEntrySource, /data-intra-squad-parse-error/);
    assert.match(quickEntrySource, /submitError/);
    assert.match(quickEntrySource, /Understanding match/);
    assert.match(quickEntrySource, /Edit Interpretation/);
  });

  it("empty roster does not report unknown player for a valid score", () => {
    const interpreted = interpretMatchEntry("Balraj def. Kyle 6-1, 6-1", []);
    assert.ok("error" in interpreted);
    assert.equal(interpreted.error, ROSTER_UNAVAILABLE_ERROR);
  });

  it("page load does not drop matches when people fail", () => {
    assert.match(loadSource, /Promise\.allSettled/);
    assert.match(pageSource, /loadIntraSquadWorkspaceData/);
    assert.doesNotMatch(pageSource, /matches=\{\[\]\}/);
  });

  it("9. trash icon exists in Recent Matches", () => {
    assert.match(workspaceSource, /onDelete=\{openDelete\}/);
    assert.match(matchListSource, /DeleteMatchButton|MatchRowActions/);
    assert.match(deleteButtonSource, /Trash2/);
    assert.match(deleteButtonSource, /Delete match/);
    assert.match(deleteButtonSource, /data-intra-squad-delete-match/);
  });

  it("10. trash click does not open the row editor", () => {
    assert.match(deleteButtonSource, /event\.stopPropagation\(\)/);
    assert.match(rowActionsSource, /onClick=\{stopRow\}/);
    assert.match(rowActionsSource, /onMouseDown=\{stopRow\}/);
  });

  it("11. confirmation is required before delete", () => {
    assert.match(deleteConfirmSource, /Delete Match\?/);
    assert.match(deleteConfirmSource, /deleteIntraSquadMatchAction\(match\.id\)/);
    assert.match(workspaceSource, /IntraSquadDeleteConfirm/);
    assert.doesNotMatch(deleteButtonSource, /deleteIntraSquadMatchAction/);
  });

  it("12. cancel leaves the match intact", () => {
    assert.match(deleteConfirmSource, /data-intra-squad-delete-cancel/);
    assert.match(deleteConfirmSource, />\s*Cancel\s*</);
    assert.match(deleteConfirmSource, /onClick=\{onCancelled\}/);
  });

  it("13-18. confirm deletes the canonical match and recalculates", () => {
    const nick = match({
      id: "nick-minato",
      winnerPlayerId: "nick",
      loserPlayerId: "minato",
      playedAt: "2026-08-27",
      scoreText: "3-6, 6-0, 6-2",
    });
    const temp = match({
      id: "temp-balraj",
      winnerPlayerId: "balraj",
      loserPlayerId: "kyle",
      sourceText: "Balraj def. Kyle 6-1, 6-1 [e2e-test]",
    });
    const before = [... [nick, temp]];
    const beforeStats = intraSquadDashboardStats(before);
    const beforeRecords = computePlayerRecords(before);
    const beforeRanked = computeProvisionalRankings(before, beforeRecords, roster);
    assert.equal(beforeStats.totalMatches, 2);
    assert.equal(beforeRecords.find((row) => row.playerId === "balraj")?.wins, 1);
    assert.equal(beforeRecords.find((row) => row.playerId === "kyle")?.losses, 1);

    const after = before.filter((row) => row.id !== temp.id);
    const afterStats = intraSquadDashboardStats(after);
    const afterRecords = computePlayerRecords(after);
    const afterRanked = computeProvisionalRankings(after, afterRecords, roster);

    assert.equal(after.some((row) => row.id === temp.id), false);
    assert.equal(after.some((row) => row.id === nick.id), true);
    assert.equal(afterStats.totalMatches, 1);
    assert.equal(afterStats.lastMatch?.id, "nick-minato");
    assert.equal(afterRecords.find((row) => row.playerId === "balraj"), undefined);
    assert.equal(afterRecords.find((row) => row.playerId === "kyle"), undefined);
    assert.equal(afterRecords.find((row) => row.playerId === "nick")?.wins, 1);
    assert.equal(afterRecords.find((row) => row.playerId === "minato")?.losses, 1);
    assert.ok(afterRanked.every((row) => row.playerId !== "balraj"));
    assert.notEqual(beforeRanked.length, afterRanked.length);
    assert.match(deleteConfirmSource, /recalculate rankings/);
  });

  it("19. temporary test match cleanup leaves prior matches", () => {
    const kept = match({ id: "real", winnerPlayerId: "nick", loserPlayerId: "minato" });
    const temp = match({
      id: "temp",
      winnerPlayerId: "balraj",
      loserPlayerId: "kyle",
      sourceText: "Balraj def. Kyle 6-1, 6-1 [e2e-test]",
    });
    const cleaned = [kept, temp].filter((row) => !row.sourceText?.includes("[e2e-test]"));
    assert.deepEqual(cleaned.map((row) => row.id), ["real"]);
  });

  it("Match Log includes edit and delete actions", () => {
    assert.match(workspaceSource, /showLogActions/);
    assert.match(rowActionsSource, /Edit match/);
    assert.match(rowActionsSource, /DeleteMatchButton/);
  });
});

describe("intra-squad unfinished matches", () => {
  function unfinishedMatch(
    overrides: Partial<IntraSquadMatch> & Pick<IntraSquadMatch, "id"> = { id: "uf-1" },
  ): IntraSquadMatch {
    return match({
      id: "uf-1",
      status: "unfinished",
      winnerPlayerId: null,
      loserPlayerId: null,
      leaderPlayerId: "chika",
      trailingPlayerId: "jackson",
      scoreText: "6-4, 3-2",
      scoreSets: [
        { winnerGames: 6, loserGames: 4 },
        { winnerGames: 3, loserGames: 2 },
      ],
      sourceText: "Chika was leading Jackson 64, 32",
      ...overrides,
    });
  }

  it("1. parses Chika was leading Jackson 6-4, 3-2", () => {
    const interpreted = interpretMatchEntry("Chika was leading Jackson 6-4, 3-2", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.status, "unfinished");
    assert.equal(interpreted.leader.id, "chika");
    assert.equal(interpreted.trailing.id, "jackson");
    assert.equal(interpreted.scoreText, "6-4, 3-2");
  });

  it("2. parses shorthand Chika was leading Jackson 64, 32", () => {
    const interpreted = interpretMatchEntry("Chika was leading Jackson 64, 32", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.status, "unfinished");
    assert.equal(interpreted.leader.id, "chika");
    assert.equal(interpreted.trailing.id, "jackson");
    assert.equal(interpreted.scoreText, "6-4, 3-2");
  });

  it("3. parses Chika led Jackson 64 32", () => {
    const interpreted = interpretMatchEntry("Chika led Jackson 64 32", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.status, "unfinished");
    assert.equal(interpreted.scoreText, "6-4, 3-2");
  });

  it("4. parses explicit weight Chika leading Jackson 64 32 weight 3", () => {
    const interpreted = interpretMatchEntry("Chika leading Jackson 64 32 weight 3", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.weight, 3);
    assert.equal(interpreted.weightFromText, true);
    assert.equal(interpreted.status, "unfinished");
  });

  it("parses vs/and unfinished phrases", () => {
    for (const raw of [
      "Chika vs Jackson unfinished, Chika leading 6-4, 3-2",
      "Chika and Jackson unfinished, Chika leading 6-4, 3-2",
      "Chika leading Jackson 6-4 3-2",
    ]) {
      const interpreted = interpretMatchEntry(raw, roster);
      assert.ok("ok" in interpreted, raw);
      assert.equal(interpreted.status, "unfinished");
      assert.equal(interpreted.leader.id, "chika");
      assert.equal(interpreted.trailing.id, "jackson");
      assert.equal(interpreted.scoreText, "6-4, 3-2");
    }
  });

  it("5-6. unfinished status and leader/trailing IDs are stored", () => {
    const interpreted = interpretMatchEntry("Chika was leading Jackson 64, 32", roster);
    assert.ok("ok" in interpreted);
    const stored = normalizeIntraSquadInput({
      playedAt: "2026-09-03",
      status: "unfinished",
      leaderPlayerId: interpreted.leader.id,
      trailingPlayerId: interpreted.trailing.id,
      scoreText: interpreted.scoreText,
      scoreSets: interpreted.scoreSets,
      weight: 1,
      sourceText: "Chika was leading Jackson 64, 32",
    });
    assert.ok(!("error" in stored));
    assert.equal(stored.input.status, "unfinished");
    assert.equal(stored.input.leaderPlayerId, "chika");
    assert.equal(stored.input.trailingPlayerId, "jackson");
    assert.equal(stored.input.winnerPlayerId, null);
    assert.equal(stored.input.loserPlayerId, null);
    assert.equal(stored.input.scoreText, "6-4, 3-2");
    assert.equal(stored.input.sourceText, "Chika was leading Jackson 64, 32");
  });

  it("7-9. unfinished ranking credit is ±0.5 × weight", () => {
    const cases = [
      { weight: 1 as const, credit: 0.5 },
      { weight: 2 as const, credit: 1 },
      { weight: 3 as const, credit: 1.5 },
    ];
    for (const { weight, credit } of cases) {
      assert.equal(rankingCreditForOutcome("leading", weight), credit);
      assert.equal(rankingCreditForOutcome("trailing", weight), -credit);
      const stored = unfinishedMatch({ id: `w${weight}`, weight });
      const [leader, trailer] = playerResultsFromMatch(stored);
      assert.equal(leader.outcome, "leading");
      assert.equal(trailer.outcome, "trailing");
      assert.equal(leader.weightedValue, credit);
      assert.equal(trailer.weightedValue, -credit);
      const records = computePlayerRecords([stored]);
      assert.equal(records.find((row) => row.playerId === "chika")?.weightedNet, credit);
      assert.equal(records.find((row) => row.playerId === "jackson")?.weightedNet, -credit);
    }
  });

  it("10. unfinished does not change W-L", () => {
    const prior = [
      match({ id: "c1", winnerPlayerId: "chika", loserPlayerId: "arya" }),
      match({ id: "c2", winnerPlayerId: "chika", loserPlayerId: "aidan" }),
      match({ id: "c3", winnerPlayerId: "chika", loserPlayerId: "nick" }),
      match({ id: "c4", winnerPlayerId: "arya", loserPlayerId: "chika" }),
      match({ id: "j1", winnerPlayerId: "jackson", loserPlayerId: "kyle" }),
      match({ id: "j2", winnerPlayerId: "jackson", loserPlayerId: "minato" }),
      match({ id: "j3", winnerPlayerId: "arya", loserPlayerId: "jackson" }),
      match({ id: "j4", winnerPlayerId: "aidan", loserPlayerId: "jackson" }),
    ];
    const before = computePlayerRecords(prior);
    assert.equal(before.find((row) => row.playerId === "chika")?.wins, 3);
    assert.equal(before.find((row) => row.playerId === "chika")?.losses, 1);
    assert.equal(before.find((row) => row.playerId === "jackson")?.wins, 2);
    assert.equal(before.find((row) => row.playerId === "jackson")?.losses, 2);

    const after = computePlayerRecords([...prior, unfinishedMatch()]);
    assert.equal(after.find((row) => row.playerId === "chika")?.wins, 3);
    assert.equal(after.find((row) => row.playerId === "chika")?.losses, 1);
    assert.equal(after.find((row) => row.playerId === "jackson")?.wins, 2);
    assert.equal(after.find((row) => row.playerId === "jackson")?.losses, 2);
    assert.equal(after.find((row) => row.playerId === "chika")?.unfinishedLeading, 1);
    assert.equal(after.find((row) => row.playerId === "jackson")?.unfinishedTrailing, 1);
    assert.equal(formatUnfinishedRecord(after.find((row) => row.playerId === "chika")!), "1–0");
  });

  it("11. unfinished does not affect Win %", () => {
    const completed = match({ id: "c1", winnerPlayerId: "chika", loserPlayerId: "jackson" });
    const records = computePlayerRecords([completed, unfinishedMatch({ id: "uf" })]);
    const chika = records.find((row) => row.playerId === "chika");
    assert.equal(chika?.wins, 1);
    assert.equal(chika?.losses, 0);
    assert.equal(chika?.winPct, 100);
    assert.equal(chika?.matchesPlayed, 2);
  });

  it("12-13. unfinished affects Weighted Points and Live Rankings", () => {
    const matches = [
      match({ id: "a-win", winnerPlayerId: "arya", loserPlayerId: "aidan", weight: 1 }),
      unfinishedMatch({ id: "b1", leaderPlayerId: "balraj", trailingPlayerId: "kyle" }),
      unfinishedMatch({ id: "b2", leaderPlayerId: "balraj", trailingPlayerId: "nick" }),
    ];
    const records = computePlayerRecords(matches);
    assert.equal(records.find((row) => row.playerId === "arya")?.weightedNet, 1);
    assert.equal(records.find((row) => row.playerId === "balraj")?.weightedNet, 1);
    assert.equal(records.find((row) => row.playerId === "arya")?.wins, 1);
    assert.equal(records.find((row) => row.playerId === "balraj")?.wins, 0);
    const ranked = computeProvisionalRankings(matches, records, roster);
    assert.equal(ranked[0]?.playerId, "arya");
    assert.equal(ranked[1]?.playerId, "balraj");
  });

  it("14. Recent Matches displays Unfinished", () => {
    assert.match(matchListSource, /Unfinished/);
    assert.match(matchListSource, /Player \/ Leader/);
    assert.match(matchListSource, /Result \/ Credit/);
    assert.match(matchListSource, /formatMatchStatusLabel/);
    assert.equal(formatResultCredit("leading", 1), "Leading (+0.5)");
    assert.equal(formatResultCredit("trailing", 1), "Trailing (-0.5)");
    assert.doesNotMatch(formatResultCredit("leading", 1), /\bW\b/);
    assert.doesNotMatch(formatResultCredit("leading", 1), /\bL\b/);
  });

  it("15. delete removes unfinished credit", () => {
    const kept = match({ id: "kept", winnerPlayerId: "nick", loserPlayerId: "minato" });
    const temp = unfinishedMatch({ id: "temp-uf" });
    const before = computePlayerRecords([kept, temp]);
    assert.equal(before.find((row) => row.playerId === "chika")?.weightedNet, 0.5);
    const after = computePlayerRecords([kept, temp].filter((row) => row.id !== temp.id));
    assert.equal(after.find((row) => row.playerId === "chika"), undefined);
    assert.equal(after.find((row) => row.playerId === "nick")?.wins, 1);
    const stats = intraSquadDashboardStats([kept, temp].filter((row) => row.id !== temp.id));
    assert.equal(stats.totalMatches, 1);
  });

  it("16. editing unfinished weight recalculates credit", () => {
    const original = unfinishedMatch({ weight: 1 });
    const before = computePlayerRecords([original]);
    assert.equal(before.find((row) => row.playerId === "chika")?.weightedNet, 0.5);
    const edited: IntraSquadMatch = { ...original, weight: 3 };
    const after = computePlayerRecords([edited]);
    assert.equal(after.find((row) => row.playerId === "chika")?.weightedNet, 1.5);
    assert.equal(after.find((row) => row.playerId === "jackson")?.weightedNet, -1.5);
    assert.equal(after.find((row) => row.playerId === "chika")?.wins, 0);
  });

  it("17. converting unfinished to completed removes partial credit and applies full result", () => {
    const unfinished = unfinishedMatch();
    const before = computePlayerRecords([unfinished]);
    assert.equal(before.find((row) => row.playerId === "chika")?.wins, 0);
    assert.equal(before.find((row) => row.playerId === "chika")?.weightedNet, 0.5);
    const converted = match({
      id: unfinished.id,
      status: "completed",
      winnerPlayerId: "chika",
      loserPlayerId: "jackson",
      leaderPlayerId: null,
      trailingPlayerId: null,
      scoreText: "6-4, 6-3",
      scoreSets: [
        { winnerGames: 6, loserGames: 4 },
        { winnerGames: 6, loserGames: 3 },
      ],
      weight: 1,
    });
    const after = computePlayerRecords([converted]);
    assert.equal(after.find((row) => row.playerId === "chika")?.wins, 1);
    assert.equal(after.find((row) => row.playerId === "jackson")?.losses, 1);
    assert.equal(after.find((row) => row.playerId === "chika")?.unfinishedLeading, 0);
    assert.equal(after.find((row) => row.playerId === "chika")?.weightedNet, 1);
    assert.equal(after.find((row) => row.playerId === "jackson")?.weightedNet, -1);
    assert.match(matchFormSource, /name="status"/);
    assert.match(matchFormSource, /Trailing Player/);
  });

  it("18. compact partial set 32 is allowed for unfinished and rejected for completed", () => {
    const unfinished = interpretMatchEntry("Chika was leading Jackson 64, 32", roster);
    assert.ok("ok" in unfinished);
    assert.equal(unfinished.scoreText, "6-4, 3-2");
    const completed = interpretMatchEntry("Arya def. Aidan 64, 32", roster);
    assert.ok("error" in completed);
    assert.match(completed.error, /Couldn’t parse the set “32”/);
  });

  it("19. completed match behavior remains unchanged", () => {
    const interpreted = interpretMatchEntry("Balraj def. Kyle 6-1, 6-1", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.status, "completed");
    const stored = normalizeIntraSquadInput({
      playedAt: "2026-09-03",
      winnerPlayerId: interpreted.winner.id,
      loserPlayerId: interpreted.loser.id,
      scoreText: interpreted.scoreText,
      weight: 1,
    });
    assert.ok(!("error" in stored));
    assert.equal(stored.input.status, "completed");
    assert.equal(stored.input.winnerPlayerId, "balraj");
    assert.equal(stored.input.leaderPlayerId, null);
    const records = computePlayerRecords([
      match({ id: "c", winnerPlayerId: "balraj", loserPlayerId: "kyle" }),
    ]);
    assert.equal(records.find((row) => row.playerId === "balraj")?.wins, 1);
    assert.equal(records.find((row) => row.playerId === "balraj")?.weightedNet, 1);
    assert.equal(rankingCreditForOutcome("W", 1), 1);
    assert.equal(rankingCreditForOutcome("L", 1), -1);
  });

  it("rejects unfinished text without a score", () => {
    const interpreted = interpretMatchEntry("Chika was leading Jackson", roster);
    assert.ok("error" in interpreted);
    assert.equal(interpreted.error, UNFINISHED_MISSING_SCORE);
  });

  it("keeps unknown-player errors for unfinished text", () => {
    const interpreted = interpretMatchEntry("Nobody was leading Jackson 6-4, 3-2", roster);
    assert.ok("error" in interpreted);
    assert.equal(interpreted.error, formatUnknownPlayerError("Nobody"));
  });

  it("score tokens do not become part of unfinished player names", () => {
    const skeleton = parseMatchSkeleton("Chika was leading Jackson 64, 32", { roster });
    assert.ok(!("error" in skeleton));
    assert.equal(skeleton.trailingName, "Jackson");
    assert.equal(skeleton.trailingName.includes("64"), false);
  });

  it("summary metrics include unfinished matches", () => {
    const stats = intraSquadDashboardStats([unfinishedMatch()]);
    assert.equal(stats.totalMatches, 1);
    assert.equal(stats.activePlayers, 2);
    assert.equal(stats.avgMatchWeight, 1);
    assert.equal(stats.lastMatch?.id, "uf-1");
  });

  it("Match Log has a status filter and edit form can convert status", () => {
    assert.match(workspaceSource, /data-intra-squad-status-filter/);
    assert.match(workspaceSource, /logStatusFilter/);
    assert.match(matchFormSource, /status === "unfinished"/);
    assert.match(quickEntrySource, /Unfinished/);
    assert.match(quickEntrySource, /Partial credit/);
    assert.match(quickEntrySource, /I think you mean/);
    assert.match(quickEntrySource, /\/api\/team-operations\/intra-squad\/parse/);
  });

  it("Elo-ready scores are 1 / 0 for completed and 0.75 / 0.25 for unfinished", () => {
    const completed = playerResultsFromMatch(match({ id: "c", winnerPlayerId: "arya", loserPlayerId: "aidan" }));
    assert.equal(completed[0]?.eloScore, 1);
    assert.equal(completed[1]?.eloScore, 0);
    const unfinished = playerResultsFromMatch(unfinishedMatch());
    assert.equal(unfinished[0]?.eloScore, 0.75);
    assert.equal(unfinished[1]?.eloScore, 0.25);
    assert.equal(eloScoreForOutcome("W"), 1);
    assert.equal(eloScoreForOutcome("L"), 0);
    assert.equal(eloScoreForOutcome("leading"), 0.75);
    assert.equal(eloScoreForOutcome("trailing"), 0.25);
  });

  it("unfinished insert payload nulls winner/loser and sets leader/trailing", () => {
    const interpreted = interpretMatchEntry("Chika was leading Jackson 64, 32", roster);
    assert.ok("ok" in interpreted);
    const stored = normalizeIntraSquadInput({
      playedAt: "2026-09-03",
      status: "unfinished",
      leaderPlayerId: interpreted.leader.id,
      trailingPlayerId: interpreted.trailing.id,
      scoreText: interpreted.scoreText,
      scoreSets: interpreted.scoreSets,
      weight: 1,
      sourceText: "Chika was leading Jackson 64, 32",
    });
    assert.ok(!("error" in stored));
    const row = inputToRow(stored.input);
    assert.equal(row.status, "unfinished");
    assert.equal(row.leader_player_id, "chika");
    assert.equal(row.trailing_player_id, "jackson");
    assert.equal(row.winner_player_id, null);
    assert.equal(row.loser_player_id, null);
    assert.equal(row.score_text, "6-4, 3-2");
    assert.equal(row.weight, 1);
    assert.equal(row.played_at, "2026-09-03");
    assert.notEqual(row.winner_player_id, undefined);
    assert.notEqual(row.loser_player_id, undefined);
  });

  it("completed insert payload nulls leader/trailing and sets winner/loser", () => {
    const stored = normalizeIntraSquadInput({
      playedAt: "2026-09-03",
      status: "completed",
      winnerPlayerId: "balraj",
      loserPlayerId: "kyle",
      scoreText: "6-1, 6-1",
      weight: 1,
      sourceText: "Balraj def. Kyle 6-1, 6-1",
    });
    assert.ok(!("error" in stored));
    const row = inputToRow(stored.input);
    assert.equal(row.status, "completed");
    assert.equal(row.winner_player_id, "balraj");
    assert.equal(row.loser_player_id, "kyle");
    assert.equal(row.leader_player_id, null);
    assert.equal(row.trailing_player_id, null);
    assert.notEqual(row.leader_player_id, undefined);
    assert.notEqual(row.trailing_player_id, undefined);
  });

  it("persist errors surface unfinished schema mismatch diagnostics", () => {
    assert.match(
      formatPersistError(
        new IntraSquadRepositoryError(
          "Failed to create intra-squad match | null value in column \"winner_player_id\" of relation \"intra_squad_matches\" violates not-null constraint",
          { details: 'null value in column "winner_player_id" violates not-null constraint' },
        ),
      ),
      /unfinished match fields are not supported.*0044/,
    );
    assert.match(
      formatPersistError(
        new IntraSquadRepositoryError(
          "Failed to create intra-squad match | column \"status\" of relation \"intra_squad_matches\" does not exist",
          { details: 'column "status" of relation "intra_squad_matches" does not exist' },
        ),
      ),
      /missing status column.*0044/,
    );
    assert.match(
      formatPersistError(
        new Error("Failed to create intra-squad match: new row violates check constraint \"intra_squad_matches_unfinished_players\""),
      ),
      /require leader_player_id and trailing_player_id/,
    );
    assert.equal(
      formatPersistError(new Error("Failed to create intra-squad match: RLS")),
      "Couldn’t save match. Database insert failed.",
    );
  });

  it("unfinished delete removes partial credit from derived records", () => {
    const kept = match({ id: "nick-minato", winnerPlayerId: "nick", loserPlayerId: "minato" });
    const temp = unfinishedMatch({ id: "temp-uf", sourceText: "Chika was leading Jackson 64, 32 [e2e-unfinished]" });
    const before = computePlayerRecords([kept, temp]);
    assert.equal(before.find((row) => row.playerId === "chika")?.weightedNet, 0.5);
    assert.equal(before.find((row) => row.playerId === "jackson")?.weightedNet, -0.5);
    const after = computePlayerRecords([kept, temp].filter((row) => row.id !== temp.id));
    assert.equal(after.find((row) => row.playerId === "chika"), undefined);
    assert.equal(after.find((row) => row.playerId === "jackson"), undefined);
    assert.equal(after.find((row) => row.playerId === "nick")?.wins, 1);
    assert.equal(intraSquadDashboardStats([kept]).totalMatches, 1);
  });
});

