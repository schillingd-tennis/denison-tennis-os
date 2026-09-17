import assert from "node:assert/strict";
import test from "node:test";

import { parseAiOfficialExtraction } from "./aiExtract";
import { detectMatchEventType, resolveForcedEventType } from "./detectEventType";
import { parseDualBoxScore } from "./dualParse";
import {
  FIXTURE_AMBIGUOUS_NAMES,
  FIXTURE_CLINCH_UNFINISHED,
  FIXTURE_COMPLETE_DUAL,
  FIXTURE_DOUBLES_REVERSED,
  FIXTURE_DOUBLES_SEPARATE,
  FIXTURE_INVALID_AI_JSON,
  FIXTURE_MIXED_SD,
  FIXTURE_MULTI_FLIGHT,
  FIXTURE_ROSTER,
  FIXTURE_STATUS_SCORES,
  FIXTURE_TOURNAMENT_MULTI_ROUND,
} from "./fixtures";
import { hybridImportBoxScore } from "./hybridImport";
import {
  assertSubtotalsReconcile,
  buildDoublesPairRecords,
  buildDoublesPlayerRecords,
  buildOverallDoublesRecord,
  buildSinglesPlayerRecords,
  buildTeamSeasonRecords,
} from "./records";
import { doublesPairKey, resolvePlayerName, splitPairNames } from "./resolvePlayers";
import { detectResultStatusFromText, parseScoreSets, resultFingerprint } from "./scoreParse";
import {
  calculateDualTeamScores,
  calculateNcaaDoublesPoint,
  recordsReconcile,
} from "./scoringRules";
import { parseTournamentResults } from "./tournamentParse";
import type { MatchEvent, MatchResult } from "./types";
import { validateImportDraft } from "./validateDraft";

test("detects complete dual box score", () => {
  const detection = detectMatchEventType(FIXTURE_COMPLETE_DUAL);
  assert.equal(detection.status, "dual");
  const draft = parseDualBoxScore({ text: FIXTURE_COMPLETE_DUAL, roster: FIXTURE_ROSTER });
  assert.equal(draft.kind, "dual");
  assert.equal(draft.opposingTeamName?.includes("Kenyon"), true);
  assert.equal(draft.reportedTeamScoreDenison, 5);
  assert.equal(draft.reportedTeamScoreOpponent, 2);
  assert.ok(draft.results.length >= 6);
  assert.ok(draft.results.some((r) => r.status === "unfinished"));
  assert.equal(draft.scoringFormat, "ncaa_standard");
});

test("doubles_separate scoring format", () => {
  const draft = parseDualBoxScore({ text: FIXTURE_DOUBLES_SEPARATE, roster: FIXTURE_ROSTER });
  assert.equal(draft.scoringFormat, "doubles_separate");
  assert.ok(draft.calculatedTeamScoreDenison != null);
});

test("clinch unfinished does not invent winners", () => {
  const draft = parseDualBoxScore({ text: FIXTURE_CLINCH_UNFINISHED, roster: FIXTURE_ROSTER });
  const unfinished = draft.results.filter((r) => r.status === "unfinished");
  assert.ok(unfinished.length >= 3);
  for (const row of unfinished) {
    assert.notEqual(row.winnerSide, "denison");
    assert.notEqual(row.winnerSide, "opponent");
  }
});

test("tournament multi-round and consolation", () => {
  const detection = detectMatchEventType(FIXTURE_TOURNAMENT_MULTI_ROUND);
  assert.equal(detection.status, "tournament");
  const draft = parseTournamentResults({
    text: FIXTURE_TOURNAMENT_MULTI_ROUND,
    roster: FIXTURE_ROSTER,
  });
  assert.equal(draft.kind, "tournament");
  assert.ok(draft.results.length >= 5);
  assert.ok(draft.results.some((r) => r.roundLabel?.toLowerCase().includes("round of 16") || r.roundLabel === "Round of 16"));
  assert.ok(draft.results.some((r) => (r.drawName ?? "").toLowerCase().includes("consolation") || r.roundLabel?.toLowerCase().includes("consolation")));
  // Never invents team score fields on tournament draft
  assert.equal("reportedTeamScoreDenison" in draft, false);
});

test("multi-flight consolation bye", () => {
  const draft = parseTournamentResults({ text: FIXTURE_MULTI_FLIGHT, roster: FIXTURE_ROSTER });
  assert.ok(draft.results.some((r) => r.status === "bye"));
  assert.ok(draft.results.some((r) => (r.flightName ?? "").includes("Flight")));
});

test("doubles reversed names share pair key", () => {
  const draft = parseTournamentResults({ text: FIXTURE_DOUBLES_REVERSED, roster: FIXTURE_ROSTER });
  const row = draft.results.find((r) => r.discipline === "doubles");
  assert.ok(row);
  assert.ok(row!.denisonA.personId);
  assert.ok(row!.denisonB?.personId);
  const key = doublesPairKey(row!.denisonA.personId!, row!.denisonB!.personId!);
  assert.equal(key, doublesPairKey(row!.denisonB!.personId!, row!.denisonA.personId!));
});

test("ambiguous Nguyen requires manual select", () => {
  const draft = parseDualBoxScore({ text: FIXTURE_AMBIGUOUS_NAMES, roster: FIXTURE_ROSTER });
  const row = draft.results.find((r) => r.denisonA.rawName === "Nguyen");
  assert.ok(row);
  assert.equal(row!.denisonA.resolution, "ambiguous");
  assert.equal(row!.denisonA.personId, null);
  assert.equal(row!.discipline, "singles");
  const validation = validateImportDraft({
    ...draft,
    results: [row!],
    opposingTeamName: draft.opposingTeamName ?? "Kenyon",
    startDate: draft.startDate ?? "2027-04-03",
  });
  assert.equal(validation.ok, false);
});

test("score statuses TB MTB ret WO default bye", () => {
  assert.equal(detectResultStatusFromText("ret."), "retired");
  assert.equal(detectResultStatusFromText("wo"), "walkover");
  assert.equal(detectResultStatusFromText("default"), "default");
  assert.equal(detectResultStatusFromText("bye"), "bye");
  const tb = parseScoreSets("7-6(5)");
  assert.ok("sets" in tb);
  assert.equal(tb.sets[0]?.winnerTb, 5);
  const mtb = parseScoreSets("10-8");
  assert.ok("sets" in mtb);
  assert.equal(mtb.sets[0]?.isMatchTiebreak, true);

  const draft = parseTournamentResults({ text: FIXTURE_STATUS_SCORES, roster: FIXTURE_ROSTER });
  assert.ok(draft.results.some((r) => r.status === "retired" || r.status === "bye"));
});

test("ambiguous auto-detect requires user choice", async () => {
  const result = await hybridImportBoxScore({
    text: "Something vague without cues",
    roster: FIXTURE_ROSTER,
    forcedType: "auto",
    allowAi: false,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.needsUserChoice, true);
    assert.equal(result.preservedText.includes("Something vague"), true);
  }
});

test("forced dual on mixed text", async () => {
  const result = await hybridImportBoxScore({
    text: FIXTURE_MIXED_SD,
    roster: FIXTURE_ROSTER,
    forcedType: "dual",
    allowAi: false,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.eventType, "dual");
});

test("invalid AI JSON rejected", () => {
  const parsed = parseAiOfficialExtraction("dual", FIXTURE_INVALID_AI_JSON);
  assert.ok("error" in parsed);
});

test("duplicate fingerprints detect reimport", () => {
  const a = resultFingerprint({
    discipline: "singles",
    lineupPosition: 1,
    denisonPlayerAId: "p-arya",
    opponentA: "Jones",
    scoreText: "6-1, 6-2",
    status: "completed",
  });
  const b = resultFingerprint({
    discipline: "singles",
    lineupPosition: 1,
    denisonPlayerAId: "p-arya",
    opponentA: "Jones",
    scoreText: "6-1, 6-2",
    status: "completed",
  });
  assert.equal(a, b);
});

test("pair notation split", () => {
  assert.deepEqual(splitPairNames("Arya/Aidan"), ["Arya", "Aidan"]);
  assert.deepEqual(splitPairNames("Arya and Aidan"), ["Arya", "Aidan"]);
});

test("resolve never silently picks ambiguous Nguyen", () => {
  const resolved = resolvePlayerName("Nguyen", FIXTURE_ROSTER);
  assert.equal(resolved.status, "ambiguous");
});

test("ncaa doubles point and record totals", () => {
  const doublesPoint = calculateNcaaDoublesPoint([
    { status: "completed", winnerSide: "denison", countsTowardTeamPoint: true },
    { status: "completed", winnerSide: "denison", countsTowardTeamPoint: true },
    { status: "unfinished", winnerSide: null, countsTowardTeamPoint: true },
  ]);
  assert.equal(doublesPoint, "denison");

  const events: MatchEvent[] = [
    {
      id: "e1",
      eventType: "dual",
      title: "Kenyon",
      opposingTeamName: "Kenyon",
      seasonYear: 2027,
      seasonSegment: "spring",
      startDate: "2027-04-03",
      endDate: "2027-04-03",
      site: "home",
      locationText: null,
      venueName: null,
      status: "completed",
      scoringFormat: "ncaa_standard",
      reportedTeamScoreDenison: 5,
      reportedTeamScoreOpponent: 2,
      calculatedTeamScoreDenison: 5,
      calculatedTeamScoreOpponent: 2,
      teamOutcome: "win",
      teamScoreDiscrepancy: false,
      scheduleEventId: null,
      scheduleSnapshot: null,
      scheduleUnlinkedReason: null,
      resultsMarkedCompleteAt: null,
      resultsMarkedCompleteBy: null,
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "e2",
      eventType: "tournament",
      title: "Invite",
      opposingTeamName: null,
      seasonYear: 2027,
      seasonSegment: "fall",
      startDate: "2026-09-18",
      endDate: "2026-09-20",
      site: null,
      locationText: null,
      venueName: null,
      status: "completed",
      scoringFormat: null,
      reportedTeamScoreDenison: null,
      reportedTeamScoreOpponent: null,
      calculatedTeamScoreDenison: null,
      calculatedTeamScoreOpponent: null,
      teamOutcome: null,
      teamScoreDiscrepancy: false,
      scheduleEventId: null,
      scheduleSnapshot: null,
      scheduleUnlinkedReason: null,
      resultsMarkedCompleteAt: null,
      resultsMarkedCompleteBy: null,
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
  ];

  const results: MatchResult[] = [
    {
      id: "r1",
      eventId: "e1",
      discipline: "singles",
      resultKind: "dual_lineup",
      lineupPosition: 1,
      drawName: null,
      flightName: null,
      divisionName: null,
      roundLabel: null,
      matchDate: "2027-04-03",
      status: "completed",
      winnerSide: "denison",
      scoreText: "6-1, 6-1",
      scoreSets: [],
      originalScoreText: null,
      sourceExcerpt: null,
      notes: null,
      denisonPlayerAId: "p-arya",
      denisonPlayerBId: null,
      doublesPairId: null,
      opponentPlayerAName: "X",
      opponentPlayerBName: null,
      opponentSchool: null,
      countsTowardTeamPoint: true,
      teamPointAwardedTo: "denison",
      importFingerprint: null,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "r2",
      eventId: "e2",
      discipline: "singles",
      resultKind: "tournament_match",
      lineupPosition: null,
      drawName: "Main Draw",
      flightName: null,
      divisionName: null,
      roundLabel: "QF",
      matchDate: "2026-09-19",
      status: "completed",
      winnerSide: "opponent",
      scoreText: "3-6, 4-6",
      scoreSets: [],
      originalScoreText: null,
      sourceExcerpt: null,
      notes: null,
      denisonPlayerAId: "p-arya",
      denisonPlayerBId: null,
      doublesPairId: null,
      opponentPlayerAName: "Y",
      opponentPlayerBName: null,
      opponentSchool: null,
      countsTowardTeamPoint: false,
      teamPointAwardedTo: "none",
      importFingerprint: null,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "r3",
      eventId: "e1",
      discipline: "doubles",
      resultKind: "dual_lineup",
      lineupPosition: 1,
      drawName: null,
      flightName: null,
      divisionName: null,
      roundLabel: null,
      matchDate: "2027-04-03",
      status: "completed",
      winnerSide: "denison",
      scoreText: "8-6",
      scoreSets: [],
      originalScoreText: null,
      sourceExcerpt: null,
      notes: null,
      denisonPlayerAId: "p-arya",
      denisonPlayerBId: "p-aidan",
      doublesPairId: null,
      opponentPlayerAName: "A",
      opponentPlayerBName: "B",
      opponentSchool: null,
      countsTowardTeamPoint: true,
      teamPointAwardedTo: "denison",
      importFingerprint: null,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "r4",
      eventId: "e1",
      discipline: "doubles",
      resultKind: "dual_lineup",
      lineupPosition: 1,
      drawName: null,
      flightName: null,
      divisionName: null,
      roundLabel: null,
      matchDate: "2027-04-03",
      status: "completed",
      winnerSide: "denison",
      scoreText: "8-4",
      scoreSets: [],
      originalScoreText: null,
      sourceExcerpt: null,
      notes: null,
      denisonPlayerAId: "p-aidan",
      denisonPlayerBId: "p-arya",
      doublesPairId: null,
      opponentPlayerAName: "C",
      opponentPlayerBName: "D",
      opponentSchool: null,
      countsTowardTeamPoint: true,
      teamPointAwardedTo: "denison",
      importFingerprint: null,
      createdAt: "",
      updatedAt: "",
    },
  ];

  const team = buildTeamSeasonRecords(events);
  assert.equal(team[0]?.wins, 1);
  assert.equal(team[0]?.losses, 0);

  const singles = buildSinglesPlayerRecords(results, events);
  const arya = singles.find((r) => r.playerId === "p-arya");
  assert.ok(arya);
  assert.equal(arya!.wins, 1);
  assert.equal(arya!.losses, 1);
  assert.equal(arya!.dual.wins, 1);
  assert.equal(arya!.tournament.losses, 1);
  assert.equal(recordsReconcile(arya!, arya!.dual, arya!.tournament), true);

  const doublesPlayers = buildDoublesPlayerRecords(results, events);
  const aryaD = doublesPlayers.find((r) => r.playerId === "p-arya");
  assert.equal(aryaD?.wins, 2);

  const pairs = buildDoublesPairRecords(results, events);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0]?.wins, 2);

  const overallDoubles = buildOverallDoublesRecord(results, events);
  assert.equal(overallDoubles.wins, 2);

  const scores = calculateDualTeamScores(
    results.filter((r) => r.eventId === "e1"),
    "ncaa_standard",
  );
  assert.ok(scores.denison >= 1);

  const reconcile = assertSubtotalsReconcile(results, events);
  assert.equal(reconcile.ok, true);
});

test("resolveForcedEventType respects user choice", () => {
  const detection = detectMatchEventType("ambiguous paste");
  const forced = resolveForcedEventType(detection, "tournament");
  assert.equal(forced.eventType, "tournament");
  assert.equal(forced.needsUserChoice, false);
});

test("nav routes helpers exist via module-routes", async () => {
  const routes = await import("@/lib/module-routes");
  assert.equal(routes.MATCHES_ROUTE, "/matches");
  assert.equal(routes.matchesEventPath("abc"), "/matches/abc");
  assert.ok(routes.TOP_LEVEL_MODULE_PATHS.includes("/matches"));
});

test("Matches sits between Team Operations and Recruiting in nav", async () => {
  const { primaryNavItems } = await import("@/components/nav-items");
  const labels = primaryNavItems.map((item) => item.label);
  const teamOps = labels.indexOf("Team Operations");
  const matches = labels.indexOf("Matches");
  const recruiting = labels.indexOf("Recruiting");
  assert.ok(teamOps >= 0 && matches >= 0 && recruiting >= 0);
  assert.ok(teamOps < matches && matches < recruiting);
});

test("schedule results format maps team match to dual and tournament to tournament", async () => {
  const { scheduleResultsFormat, matchEventTypeFromSchedule, flagImportScheduleConflicts, suggestScheduleLinks, resolveMatchEventDisplay, identityFieldsFromSchedule } =
    await import("./scheduleLink");
  const dualSchedule = {
    id: "s1",
    seasonYear: 2027,
    competitionDateNumber: null,
    competitionDateGroup: null,
    eventType: "team_match" as const,
    opponentName: "Kenyon",
    eventName: null,
    itaRank: null,
    startDate: "2027-04-03",
    endDate: "2027-04-03",
    timeText: null,
    venueName: "Home Courts",
    city: "Granville",
    state: "OH",
    locationText: null,
    siteDesignation: "home" as const,
    travelRequired: false,
    ncac: true,
    seasonSegment: "spring" as const,
    status: "confirmed" as const,
    doubleheaderStatus: "none" as const,
    officialsNeeded: null,
    teamsInEvent: null,
    countsAsCompetitionDate: true,
    notes: null,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  };
  assert.equal(scheduleResultsFormat(dualSchedule).status, "dual");
  assert.equal(matchEventTypeFromSchedule(dualSchedule), "dual");

  const placeholder = { ...dualSchedule, eventType: "team_match_placeholder" as const };
  assert.equal(scheduleResultsFormat(placeholder).ambiguous, true);

  const tournament = {
    ...dualSchedule,
    eventType: "tournament" as const,
    opponentName: null,
    eventName: "Fall Invite",
    startDate: "2026-09-18",
    endDate: "2026-09-20",
  };
  assert.equal(matchEventTypeFromSchedule(tournament), "tournament");

  const dualDraft = parseDualBoxScore({ text: FIXTURE_COMPLETE_DUAL, roster: FIXTURE_ROSTER });
  const conflicts = flagImportScheduleConflicts(dualDraft, dualSchedule);
  assert.ok(!conflicts.some((c) => c.code === "type_mismatch"));

  const wrongType = flagImportScheduleConflicts(dualDraft, tournament);
  assert.ok(wrongType.some((c) => c.code === "type_mismatch"));

  const matchEvent = {
    id: "e1",
    eventType: "dual" as const,
    title: "Kenyon",
    opposingTeamName: "Kenyon",
    seasonYear: 2027,
    seasonSegment: "spring" as const,
    startDate: "2027-04-03",
    endDate: "2027-04-03",
    site: "home" as const,
    locationText: null,
    venueName: null,
    status: "completed" as const,
    scoringFormat: "ncaa_standard" as const,
    reportedTeamScoreDenison: 5,
    reportedTeamScoreOpponent: 2,
    calculatedTeamScoreDenison: 5,
    calculatedTeamScoreOpponent: 2,
    teamOutcome: "win" as const,
    teamScoreDiscrepancy: false,
    scheduleEventId: null,
    scheduleSnapshot: null,
    scheduleUnlinkedReason: "never_linked" as const,
    resultsMarkedCompleteAt: null,
    resultsMarkedCompleteBy: null,
    notes: null,
    createdAt: "",
    updatedAt: "",
  };
  const suggestions = suggestScheduleLinks(matchEvent, [dualSchedule], new Set());
  assert.ok(suggestions.length >= 1);
  assert.equal(suggestions[0]?.schedule.id, "s1");

  const display = resolveMatchEventDisplay(
    { ...matchEvent, scheduleEventId: dualSchedule.id, opposingTeamName: "Stale" },
    dualSchedule,
  );
  assert.equal(display.title, "Kenyon");
  assert.equal(display.fromSchedule, true);
  assert.equal(display.opposingTeamName, "Kenyon");

  const identity = identityFieldsFromSchedule(dualSchedule, "dual");
  assert.equal(identity.opposingTeamName, "Kenyon");
  assert.equal(identity.seasonYear, 2027);
});

test("validateImportDraft with scheduleLinked skips identity errors", () => {
  const draft = parseDualBoxScore({ text: FIXTURE_COMPLETE_DUAL, roster: FIXTURE_ROSTER });
  draft.opposingTeamName = null;
  draft.startDate = null;
  const without = validateImportDraft(draft, { scheduleLinked: false });
  assert.equal(without.ok, false);
  const withSchedule = validateImportDraft(draft, { scheduleLinked: true });
  assert.equal(withSchedule.ok, draft.results.every((r) => r.denisonA.personId));
});

test("matchesImportPath includes schedule preselect", async () => {
  const routes = await import("@/lib/module-routes");
  assert.equal(routes.matchesImportPath(), "/matches?import=1");
  assert.equal(
    routes.matchesImportPath("abc-123"),
    "/matches?import=1&scheduleEventId=abc-123",
  );
});

test("Team tab derives competitions from Schedule without inventing match_events", async () => {
  const {
    buildTeamCompetitionRows,
    deriveResultsStatus,
    filterTeamCompetitionRows,
    isCompetitiveScheduleEvent,
    isNoncompetitiveScheduleEvent,
    listUnlinkedMatchEvents,
    needsResultsForRow,
  } = await import("./teamCompetitions");
  const { SEED_2026_27 } = await import("@/features/teamSchedule/seedData");

  assert.equal(isCompetitiveScheduleEvent(SEED_2026_27[0]!), false); // Hotel Planner non_team_event
  assert.equal(isNoncompetitiveScheduleEvent(SEED_2026_27[0]!), true);
  assert.equal(isCompetitiveScheduleEvent(SEED_2026_27[1]!), true); // Denison Invite tournament
  assert.ok(SEED_2026_27.some((e) => e.eventType === "team_match_placeholder"));

  const rows = buildTeamCompetitionRows({
    scheduleEvents: SEED_2026_27,
    matchEvents: [],
    results: [],
    todayIso: "2027-03-01",
  });
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => isCompetitiveScheduleEvent(r.schedule)));
  assert.ok(rows.every((r) => r.matchEvent == null));
  assert.ok(rows.some((r) => r.resultsStatus === "upcoming"));
  assert.ok(rows.some((r) => r.resultsStatus === "awaiting"));
  assert.ok(rows.some((r) => r.incompletePlaceholder));

  const needs = filterTeamCompetitionRows(rows, {
    seasonYear: 2027,
    eventType: "all",
    competitionFilter: "needs_results",
    query: "",
  });
  assert.ok(needs.every((r) => r.needsResults));
  assert.ok(needs.every((r) => r.schedule.status !== "cancelled" || false));
  assert.ok(needs.every((r) => r.resultsStatus === "awaiting" || r.resultsStatus === "partial"));

  const cancelled = {
    ...SEED_2026_27[1]!,
    id: "cancelled-1",
    status: "cancelled" as const,
    startDate: "2026-09-01",
    endDate: "2026-09-01",
  };
  assert.equal(
    needsResultsForRow({
      schedule: cancelled,
      resultsStatus: deriveResultsStatus({
        schedule: cancelled,
        matchEvent: null,
        resultCount: 0,
        todayIso: "2027-03-01",
      }),
    }),
    false,
  );

  const completeStatus = deriveResultsStatus({
    schedule: SEED_2026_27[1]!,
    matchEvent: {
      id: "m1",
      eventType: "tournament",
      title: "Invite",
      opposingTeamName: null,
      seasonYear: 2027,
      seasonSegment: "fall",
      startDate: "2026-09-18",
      endDate: "2026-09-20",
      site: "home",
      locationText: null,
      venueName: null,
      status: "completed",
      scoringFormat: null,
      reportedTeamScoreDenison: null,
      reportedTeamScoreOpponent: null,
      calculatedTeamScoreDenison: null,
      calculatedTeamScoreOpponent: null,
      teamOutcome: null,
      teamScoreDiscrepancy: false,
      scheduleEventId: SEED_2026_27[1]!.id,
      scheduleSnapshot: null,
      scheduleUnlinkedReason: null,
      resultsMarkedCompleteAt: "2026-09-21T00:00:00.000Z",
      resultsMarkedCompleteBy: null,
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
    resultCount: 1,
    todayIso: "2027-03-01",
  });
  assert.equal(completeStatus, "complete");

  const partialFromOneResult = deriveResultsStatus({
    schedule: SEED_2026_27[1]!,
    matchEvent: {
      id: "m2",
      eventType: "tournament",
      title: "Invite",
      opposingTeamName: null,
      seasonYear: 2027,
      seasonSegment: "fall",
      startDate: "2026-09-18",
      endDate: "2026-09-20",
      site: "home",
      locationText: null,
      venueName: null,
      status: "completed",
      scoringFormat: null,
      reportedTeamScoreDenison: null,
      reportedTeamScoreOpponent: null,
      calculatedTeamScoreDenison: null,
      calculatedTeamScoreOpponent: null,
      teamOutcome: null,
      teamScoreDiscrepancy: false,
      scheduleEventId: SEED_2026_27[1]!.id,
      scheduleSnapshot: null,
      scheduleUnlinkedReason: null,
      resultsMarkedCompleteAt: null,
      resultsMarkedCompleteBy: null,
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
    resultCount: 1,
    todayIso: "2027-03-01",
  });
  assert.equal(partialFromOneResult, "partial");

  const unlinked = listUnlinkedMatchEvents([
    {
      id: "u1",
      eventType: "dual",
      title: "Legacy",
      opposingTeamName: "Legacy",
      seasonYear: 2027,
      seasonSegment: "spring",
      startDate: "2027-01-01",
      endDate: "2027-01-01",
      site: "home",
      locationText: null,
      venueName: null,
      status: "completed",
      scoringFormat: "ncaa_standard",
      reportedTeamScoreDenison: 4,
      reportedTeamScoreOpponent: 3,
      calculatedTeamScoreDenison: 4,
      calculatedTeamScoreOpponent: 3,
      teamOutcome: "win",
      teamScoreDiscrepancy: false,
      scheduleEventId: null,
      scheduleSnapshot: null,
      scheduleUnlinkedReason: "never_linked",
      resultsMarkedCompleteAt: null,
      resultsMarkedCompleteBy: null,
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
  ]);
  assert.equal(unlinked.length, 1);
});
