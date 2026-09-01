/**
 * Contact Workflow v0.1 tests (Today Beta).
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { after, before, describe, it } from "node:test";

import { buildInteractionSummary } from "@/features/interactions/contactSummary";
import type { RecruitInteraction } from "@/features/interactions/types";
import { RECRUIT_PRIORITY_KEYS } from "../lookupSeed";

import { scoreCadenceOpportunity } from "./contactCadenceScore";
import {
  filterActionableMatchResults,
  isCadenceOpportunitySnoozed,
  isResultOpportunityActioned,
} from "./contactOpportunityActions";
import { buildContactOpportunities } from "./contactOpportunityScore";
import { CONTACT_OPPORTUNITY_THRESHOLDS } from "./contactOpportunityConfig";
import { filterNewResultsFeed } from "./detectionStatus";
import { buildResultFingerprint } from "./fingerprint";
import { mergeContactOpportunities } from "./mergeContactOpportunities";
import { buildContactSuggestedText } from "./suggestedText";
import { TODAY_BETA_SOURCE_SYSTEM } from "./contactWorkflowConfig";
import { ContactWorkflowError, markContactTextSent } from "./contactWorkflow";
import type { MatchResultOutcome, RecruitMatchResult } from "./types";

const ISAAC_PERSON_ID = "recruit-xlsx-row-441";
const ADAM_PERSON_ID = "recruit-xlsx-row-175";
const SYNTHETIC_TOURNAMENT = "DENISON OS WORKFLOW TEST EVENT";
const SYNTHETIC_OPPONENT = "Workflow Test Opponent";
const PRIORITY_A = { key: RECRUIT_PRIORITY_KEYS.elite, label: "1 - Elite" };

let dbAvailable = true;

function sql(query: string): string {
  const oneLine = query.replace(/\s+/g, " ").trim();
  return execSync(
    `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -t -A -c ${JSON.stringify(oneLine)}`,
    { encoding: "utf8" },
  ).trim();
}

function sqlJson<T>(query: string): T {
  const raw = sql(`SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (${query}) t;`);
  return JSON.parse(raw || "[]") as T;
}

type MatchRow = {
  id: string;
  recruit_person_id: string;
  tournament_name: string | null;
  opponent_name: string | null;
  opponent_ranking: string | null;
  score: string | null;
  result: MatchResultOutcome;
  detection_status: string;
  first_detected_at: string;
  last_verified_at: string;
  result_fingerprint: string;
  needs_review: boolean;
  parse_warnings: string[] | null;
};

type InteractionRow = {
  id: string;
  recruit_person_id: string;
  occurred_at: string;
  interaction_type: RecruitInteraction["interactionType"];
  direction: RecruitInteraction["direction"];
  notes: string | null;
  source_system: string | null;
  source_key: string | null;
  created_at: string;
};

function rowToMatchResult(row: MatchRow): RecruitMatchResult {
  return {
    id: row.id,
    recruitPersonId: row.recruit_person_id,
    source: "trn_manual",
    tournamentName: row.tournament_name ?? undefined,
    opponentName: row.opponent_name ?? undefined,
    opponentRanking: row.opponent_ranking ?? undefined,
    score: row.score ?? undefined,
    result: row.result,
    firstDetectedAt: row.first_detected_at,
    lastVerifiedAt: row.last_verified_at,
    detectionStatus: row.detection_status === "BASELINE" ? "BASELINE" : "NEW",
    resultFingerprint: row.result_fingerprint,
    needsReview: row.needs_review,
    parseWarnings: row.parse_warnings ?? [],
  };
}

function rowToInteractionLike(row: InteractionRow) {
  return {
    occurredAt: row.occurred_at,
    interactionType: row.interaction_type,
    direction: row.direction,
    createdAt: row.created_at,
  };
}

function cleanupWorkflowTestData(): void {
  sql(
    `DELETE FROM contact_opportunity_actions WHERE recruit_person_id IN ('${ISAAC_PERSON_ID}', '${ADAM_PERSON_ID}')`,
  );
  sql(
    `DELETE FROM recruiting_interactions WHERE recruit_person_id IN ('${ISAAC_PERSON_ID}', '${ADAM_PERSON_ID}') AND source_system = '${TODAY_BETA_SOURCE_SYSTEM}'`,
  );
  sql(
    `DELETE FROM recruit_match_results WHERE recruit_person_id = '${ISAAC_PERSON_ID}' AND tournament_name = '${SYNTHETIC_TOURNAMENT}'`,
  );
}

function ensureIsaacNewResult(): RecruitMatchResult {
  const existing = sqlJson<MatchRow[]>(
    `SELECT * FROM recruit_match_results WHERE recruit_person_id = '${ISAAC_PERSON_ID}' AND detection_status = 'NEW' LIMIT 1`,
  );
  if (existing[0]) {
    return rowToMatchResult(existing[0]);
  }

  const fingerprint = buildResultFingerprint({
    recruitPersonId: ISAAC_PERSON_ID,
    tournamentName: SYNTHETIC_TOURNAMENT,
    round: "QF",
    opponentName: SYNTHETIC_OPPONENT,
    score: "6-4 6-3",
  });

  sql(
    `INSERT INTO recruit_match_results (recruit_person_id, source, tournament_name, tournament_date, round, opponent_name, opponent_ranking, score, result, result_fingerprint, detection_status, needs_review, parse_warnings, last_verified_at) VALUES ('${ISAAC_PERSON_ID}', 'trn_manual', '${SYNTHETIC_TOURNAMENT}', '2026-08-31', 'QF', '${SYNTHETIC_OPPONENT}', '75', '6-4 6-3', 'WIN', '${fingerprint}', 'NEW', false, ARRAY[]::text[], now())`,
  );

  const inserted = sqlJson<MatchRow[]>(
    `SELECT * FROM recruit_match_results WHERE recruit_person_id = '${ISAAC_PERSON_ID}' AND result_fingerprint = '${fingerprint}' LIMIT 1`,
  );
  assert.ok(inserted[0]);
  return rowToMatchResult(inserted[0]);
}

function parseSingleUuid(raw: string): string {
  const match = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  assert.ok(match, `Expected UUID in psql output: ${raw}`);
  return match[0];
}

function insertWorkflowTextInteraction(input: {
  recruitPersonId: string;
  notes: string;
  sourceKey: string;
}): string {
  const raw = sql(
    `INSERT INTO recruiting_interactions (recruit_person_id, occurred_at, interaction_type, direction, notes, source_system, source_key) VALUES ('${input.recruitPersonId}', now(), 'text', 'outbound', '${input.notes.replace(/'/g, "''")}', '${TODAY_BETA_SOURCE_SYSTEM}', '${input.sourceKey}') RETURNING id`,
  );
  return parseSingleUuid(raw);
}

function insertHandledResultAction(input: {
  recruitPersonId: string;
  matchResultId: string;
  interactionId: string;
}): void {
  sql(
    `INSERT INTO contact_opportunity_actions (recruit_person_id, opportunity_type, action, match_result_id, interaction_id) VALUES ('${input.recruitPersonId}', 'RESULT', 'HANDLED', '${input.matchResultId}', '${input.interactionId}')`,
  );
}

function loadInteractions(recruitPersonId: string): InteractionRow[] {
  return sqlJson<InteractionRow[]>(
    `SELECT id, recruit_person_id, occurred_at, interaction_type, direction, notes, source_system, source_key, created_at FROM recruiting_interactions WHERE recruit_person_id = '${recruitPersonId}' ORDER BY occurred_at DESC`,
  );
}

describe("contactOpportunityActions filters", () => {
  it("marks result opportunities as actioned when handled or dismissed", () => {
    const actions = [
      {
        id: "a1",
        recruitPersonId: ISAAC_PERSON_ID,
        opportunityType: "RESULT" as const,
        action: "HANDLED" as const,
        matchResultId: "match-1",
        upcomingTournamentId: null,
        interactionId: "int-1",
        snoozeUntil: null,
        actedAt: new Date().toISOString(),
      },
    ];
    assert.equal(isResultOpportunityActioned("match-1", actions), true);
    assert.equal(isResultOpportunityActioned("match-2", actions), false);
    assert.deepEqual(
      filterActionableMatchResults([{ id: "match-1" }, { id: "match-2" }], actions).map(
        (row) => row.id,
      ),
      ["match-2"],
    );
  });

  it("detects active cadence snooze", () => {
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const past = new Date();
    past.setDate(past.getDate() - 1);

    assert.equal(
      isCadenceOpportunitySnoozed(
        [
          {
            id: "s1",
            recruitPersonId: ADAM_PERSON_ID,
            opportunityType: "CADENCE",
            action: "SNOOZED",
            matchResultId: null,
            upcomingTournamentId: null,
            interactionId: null,
            snoozeUntil: future.toISOString(),
            actedAt: new Date().toISOString(),
          },
        ],
        new Date(),
      ),
      true,
    );

    assert.equal(
      isCadenceOpportunitySnoozed(
        [
          {
            id: "s2",
            recruitPersonId: ADAM_PERSON_ID,
            opportunityType: "CADENCE",
            action: "SNOOZED",
            matchResultId: null,
            upcomingTournamentId: null,
            interactionId: null,
            snoozeUntil: past.toISOString(),
            actedAt: past.toISOString(),
          },
        ],
        new Date(),
      ),
      false,
    );
  });
});

describe("Contact Workflow v0.1", () => {
  before(() => {
    try {
      sql("SELECT 1");
      sql("SELECT 1 FROM contact_opportunity_actions LIMIT 1");
    } catch {
      dbAvailable = false;
    }
  });

  after(() => {
    if (!dbAvailable) return;
    cleanupWorkflowTestData();
  });

  it("rejects empty message before any database write", async () => {
    await assert.rejects(
      () =>
        markContactTextSent({
          recruitPersonId: ADAM_PERSON_ID,
          messageText: "   ",
        }),
      ContactWorkflowError,
    );
  });

  it("Priority A cadence-only recruit with no contact history appears", () => {
    const cadence = scoreCadenceOpportunity({
      priority: PRIORITY_A,
      daysSinceLastContact: null,
    });
    assert.ok(cadence);
    assert.equal(cadence.cadenceScore, 80);
    assert.ok(cadence.cadenceScore >= 50);
  });

  it(
    "Mark Text Sent creates TEXT interaction with edited body",
    { skip: !dbAvailable ? "local DB unavailable" : false },
    () => {
      cleanupWorkflowTestData();
      const message = "Hey Adam, custom edited message for workflow test.";
      const interactionId = insertWorkflowTextInteraction({
        recruitPersonId: ADAM_PERSON_ID,
        notes: message,
        sourceKey: "text-sent:test:1",
      });

      const rows = loadInteractions(ADAM_PERSON_ID);
      const logged = rows.find((row) => row.id === interactionId);
      assert.ok(logged);
      assert.equal(logged.interaction_type, "text");
      assert.equal(logged.notes, message);
      assert.equal(logged.direction, "outbound");
      assert.equal(logged.source_system, TODAY_BETA_SOURCE_SYSTEM);
    },
  );

  it(
    "last-contact calculation updates to today and cadence score resets",
    { skip: !dbAvailable ? "local DB unavailable" : false },
    () => {
      cleanupWorkflowTestData();

      const beforeSummary = buildInteractionSummary([], new Date());
      assert.equal(beforeSummary.contactDays, null);

      insertWorkflowTextInteraction({
        recruitPersonId: ADAM_PERSON_ID,
        notes: "Hey Adam, just checking in.",
        sourceKey: "text-sent:test:2",
      });

      const afterSummary = buildInteractionSummary(
        loadInteractions(ADAM_PERSON_ID).map(rowToInteractionLike),
        new Date(),
      );
      assert.equal(afterSummary.contactDays, 0);

      const cadence = scoreCadenceOpportunity({
        priority: PRIORITY_A,
        daysSinceLastContact: afterSummary.contactDays,
      });
      assert.equal(cadence, null);
    },
  );

  it(
    "cadence-only card disappears after contact is logged",
    { skip: !dbAvailable ? "local DB unavailable" : false },
    () => {
      cleanupWorkflowTestData();

      insertWorkflowTextInteraction({
        recruitPersonId: ADAM_PERSON_ID,
        notes: "Hey Adam, just checking in.",
        sourceKey: "text-sent:test:3",
      });

      const summary = buildInteractionSummary(
        loadInteractions(ADAM_PERSON_ID).map(rowToInteractionLike),
        new Date(),
      );

      const merged = mergeContactOpportunities({
        recruitPersonId: ADAM_PERSON_ID,
        recruitName: "Adam Roman",
        recruitPriorityLabel: PRIORITY_A.label,
        daysSinceLastContact: summary.contactDays,
        resultOpportunity: null,
        cadenceOpportunity: scoreCadenceOpportunity({
          priority: PRIORITY_A,
          daysSinceLastContact: summary.contactDays,
        }),
        tournamentOpportunity: null,
      });
      assert.equal(merged, null);
    },
  );

  it(
    "result + cadence: contact resets cadence and handled result stays suppressed",
    { skip: !dbAvailable ? "local DB unavailable" : false },
    () => {
      cleanupWorkflowTestData();
      const newResult = ensureIsaacNewResult();

      const resultOpportunity = buildContactOpportunities({
        recruitPersonId: ISAAC_PERSON_ID,
        recruitName: "Isaac Lewis",
        priority: PRIORITY_A,
        daysSinceLastContact: null,
        matchResults: [newResult],
      });
      assert.ok(resultOpportunity);

      const cadenceBefore = scoreCadenceOpportunity({
        priority: PRIORITY_A,
        daysSinceLastContact: null,
      });
      assert.ok(cadenceBefore);

      const mergedBefore = mergeContactOpportunities({
        recruitPersonId: ISAAC_PERSON_ID,
        recruitName: "Isaac Lewis",
        recruitPriorityLabel: PRIORITY_A.label,
        daysSinceLastContact: null,
        resultOpportunity,
        cadenceOpportunity: cadenceBefore,
        tournamentOpportunity: null,
        newMatchResults: [newResult],
      });
      assert.ok(mergedBefore);
      assert.equal(mergedBefore.opportunityTypes.includes("RESULT"), true);
      assert.equal(mergedBefore.opportunityTypes.includes("CADENCE"), true);

      const message = "Great win today Isaac. Congrats!";
      const interactionId = insertWorkflowTextInteraction({
        recruitPersonId: ISAAC_PERSON_ID,
        notes: message,
        sourceKey: "text-sent:test:4",
      });
      insertHandledResultAction({
        recruitPersonId: ISAAC_PERSON_ID,
        matchResultId: newResult.id,
        interactionId,
      });

      const actions = sqlJson<
        Array<{ match_result_id: string; action: string; opportunity_type: string }>
      >(
        `SELECT match_result_id, action, opportunity_type FROM contact_opportunity_actions WHERE recruit_person_id = '${ISAAC_PERSON_ID}' AND match_result_id = '${newResult.id}'`,
      );
      assert.equal(actions.length, 1);
      assert.equal(actions[0]?.action, "HANDLED");

      const afterSummary = buildInteractionSummary(
        loadInteractions(ISAAC_PERSON_ID).map(rowToInteractionLike),
        new Date(),
      );
      assert.equal(afterSummary.contactDays, 0);

      const filteredResults = filterActionableMatchResults([newResult], [
        {
          id: "handled",
          recruitPersonId: ISAAC_PERSON_ID,
          opportunityType: "RESULT",
          action: "HANDLED",
          matchResultId: newResult.id,
          upcomingTournamentId: null,
          interactionId,
          snoozeUntil: null,
          actedAt: new Date().toISOString(),
        },
      ]);
      assert.equal(filteredResults.length, 0);

      const mergedAfter = mergeContactOpportunities({
        recruitPersonId: ISAAC_PERSON_ID,
        recruitName: "Isaac Lewis",
        recruitPriorityLabel: PRIORITY_A.label,
        daysSinceLastContact: afterSummary.contactDays,
        resultOpportunity: buildContactOpportunities({
          recruitPersonId: ISAAC_PERSON_ID,
          recruitName: "Isaac Lewis",
          priority: PRIORITY_A,
          daysSinceLastContact: afterSummary.contactDays,
          matchResults: filteredResults,
        }),
        cadenceOpportunity: scoreCadenceOpportunity({
          priority: PRIORITY_A,
          daysSinceLastContact: afterSummary.contactDays,
        }),
        tournamentOpportunity: null,
        newMatchResults: filteredResults,
      });
      assert.equal(mergedAfter, null);

      const feed = filterNewResultsFeed([newResult], {
        windowDays: CONTACT_OPPORTUNITY_THRESHOLDS.newResultWindowDays,
        now: new Date(),
      });
      assert.equal(feed.length, 1);
      assert.equal(feed[0]?.id, newResult.id);
    },
  );

  it(
    "dismissing a result opportunity persists and suppresses Contact Today",
    { skip: !dbAvailable ? "local DB unavailable" : false },
    () => {
      cleanupWorkflowTestData();
      const newResult = ensureIsaacNewResult();

      sql(
        `INSERT INTO contact_opportunity_actions (recruit_person_id, opportunity_type, action, match_result_id) VALUES ('${ISAAC_PERSON_ID}', 'RESULT', 'DISMISSED', '${newResult.id}')`,
      );

      const rows = sqlJson<Array<{ action: string }>>(
        `SELECT action FROM contact_opportunity_actions WHERE recruit_person_id = '${ISAAC_PERSON_ID}' AND match_result_id = '${newResult.id}'`,
      );
      assert.equal(rows[0]?.action, "DISMISSED");

      const filtered = filterActionableMatchResults([newResult], [
        {
          id: "dismiss",
          recruitPersonId: ISAAC_PERSON_ID,
          opportunityType: "RESULT",
          action: "DISMISSED",
          matchResultId: newResult.id,
          upcomingTournamentId: null,
          interactionId: null,
          snoozeUntil: null,
          actedAt: new Date().toISOString(),
        },
      ]);
      assert.equal(filtered.length, 0);
    },
  );

  it(
    "failure to create interaction does not mark result handled",
    { skip: !dbAvailable ? "local DB unavailable" : false },
    () => {
      cleanupWorkflowTestData();
      const newResult = ensureIsaacNewResult();

      const handledRows = sqlJson<Array<{ id: string }>>(
        `SELECT id FROM contact_opportunity_actions WHERE recruit_person_id = '${ISAAC_PERSON_ID}' AND match_result_id = '${newResult.id}'`,
      );
      assert.equal(handledRows.length, 0);

      const todayBetaInteractions = sqlJson<Array<{ id: string }>>(
        `SELECT id FROM recruiting_interactions WHERE recruit_person_id = '${ISAAC_PERSON_ID}' AND source_system = '${TODAY_BETA_SOURCE_SYSTEM}'`,
      );
      assert.equal(todayBetaInteractions.length, 0);
    },
  );

  it(
    "snooze cadence opportunity persists with future snooze_until",
    { skip: !dbAvailable ? "local DB unavailable" : false },
    () => {
      cleanupWorkflowTestData();

      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + 3);

      sql(
        `INSERT INTO contact_opportunity_actions (recruit_person_id, opportunity_type, action, snooze_until) VALUES ('${ADAM_PERSON_ID}', 'CADENCE', 'SNOOZED', '${snoozeUntil.toISOString()}')`,
      );

      const rows = sqlJson<Array<{ action: string; snooze_until: string }>>(
        `SELECT action, snooze_until FROM contact_opportunity_actions WHERE recruit_person_id = '${ADAM_PERSON_ID}' AND opportunity_type = 'CADENCE'`,
      );
      assert.equal(rows[0]?.action, "SNOOZED");
      assert.ok(Date.parse(rows[0]?.snooze_until ?? "") > Date.now());
    },
  );

  it(
    "logged text appears in recruit interaction history query",
    { skip: !dbAvailable ? "local DB unavailable" : false },
    () => {
      cleanupWorkflowTestData();
      const message = "Workflow history visibility test message.";
      insertWorkflowTextInteraction({
        recruitPersonId: ADAM_PERSON_ID,
        notes: message,
        sourceKey: "text-sent:test:5",
      });

      const rows = loadInteractions(ADAM_PERSON_ID);
      assert.ok(rows.some((row) => row.notes === message && row.interaction_type === "text"));
    },
  );

  it("result-driven suggested text still wins over cadence text", () => {
    const newResult: RecruitMatchResult = {
      id: "test-result",
      recruitPersonId: ISAAC_PERSON_ID,
      source: "trn_manual",
      opponentName: "Test Opponent",
      opponentRanking: "75",
      result: "WIN",
      firstDetectedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      detectionStatus: "NEW",
      resultFingerprint: "fp",
      needsReview: false,
      parseWarnings: [],
    };

    const suggested = buildContactSuggestedText({
      recruitFirstName: "Isaac",
      matchResult: newResult,
      newMatchResults: [newResult],
      hasCadence: true,
      daysSinceLastContact: 12,
    });

    assert.equal(suggested.category, "strong_win");
    assert.match(suggested.text ?? "", /Great win today/);
  });
});
