/**
 * Day 2 import validation — Isaac Lewis baseline + 1 synthetic NEW match.
 * Uses local Postgres (127.0.0.1:54322). Skips when DB is unavailable.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { after, before, describe, it } from "node:test";

import { buildInteractionSummary } from "@/features/interactions/contactSummary";
import { buildContactOpportunities } from "./contactOpportunityScore";
import { CONTACT_OPPORTUNITY_THRESHOLDS } from "./contactOpportunityConfig";
import { filterNewResultsFeed } from "./detectionStatus";
import { buildResultFingerprint } from "./fingerprint";
import { parseTrnPaste } from "./parseTrnPaste";
import { normalizeTrnTournamentDate } from "./tournamentDate";
import type { MatchResultOutcome, RecruitMatchResult } from "./types";

const ISAAC_PERSON_ID = "recruit-xlsx-row-441";
const SYNTHETIC_TOURNAMENT = "DENISON OS TEST EVENT";
const SYNTHETIC_OPPONENT = "Test Opponent";

const BASELINE_PASTE = `
L3 ELLESSE JR. CHMP. AT THE CINCINNATI O
August 21-24, 2026
Mason, OH    Boys' 18 & Under Singles
Complete Results

Round    Wins    Losses    Score
32    Luke Conner (155)         6-1 6-0
16         Rohan Vyas (103)    6-2 6-4
16    Adam Roman (188)         7-6(5) 6-3
QF         Ezra Britton (96)    2-2 Ret.

L1 USTA B16,18 NATIIONAL CHMPS.
August 7-17, 2026
Kalamazoo, MI    Boys' 18 & Under Singles
Complete Results

Round    Wins    Losses    Score
256         JohnPaul Huston (117)    6-4 6-0
128         Noah Richer (27)    4-6 6-3 [10-7]

L1 B16-18 USTA NATIONAL CLAY COURT CHMPS
July 5-13, 2026
Delray Beach, FL    Boys' 18 & Under Singles
Complete Results

Round    Wins    Losses    Score
128         Alexander Park (68)    6-4 4-6 6-3
128    Nathan Dolgushev (275)         6-3 6-2
64-Q         Brayden Amey (90)    7-5 7-6(5)
`.trim();

const SYNTHETIC_BLOCK = `
DENISON OS TEST EVENT
August 31, 2026
Columbus, OH    Boys' 18 & Under Singles
Complete Results

Round    Wins    Losses    Score
QF    Test Opponent (75)         6-4 6-3
`.trim();

export const DAY2_PASTE = `${BASELINE_PASTE}\n\n${SYNTHETIC_BLOCK}`;

type MatchRow = {
  id: string;
  recruit_person_id: string;
  tournament_name: string | null;
  tournament_date: string | null;
  tournament_date_raw: string | null;
  round: string | null;
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

function rowToMatchResult(row: MatchRow): RecruitMatchResult {
  return {
    id: row.id,
    recruitPersonId: row.recruit_person_id,
    source: "trn_manual",
    tournamentName: row.tournament_name ?? undefined,
    tournamentDate: row.tournament_date ?? undefined,
    round: row.round ?? undefined,
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

function normalizeDateForDb(value: string | undefined): string | null {
  return normalizeTrnTournamentDate(value ?? null);
}

function unknownToNull(value: string | undefined): string | null {
  if (!value || value.trim().toUpperCase() === "UNKNOWN") return null;
  return value.trim();
}

function escapeLiteral(value: string | null): string {
  if (value == null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function loadIsaacResults(): MatchRow[] {
  return sqlJson<MatchRow[]>(
    `SELECT * FROM recruit_match_results WHERE recruit_person_id = '${ISAAC_PERSON_ID}' ORDER BY first_detected_at ASC`,
  );
}

function isBaselineEstablished(): boolean {
  const rows = sqlJson<Array<{ baseline: string | null }>>(
    `SELECT external_profiles->'trn'->>'baselineEstablishedAt' AS baseline FROM recruit_profiles WHERE person_id = '${ISAAC_PERSON_ID}'`,
  );
  return Boolean(rows[0]?.baseline?.trim());
}

function existingFingerprints(): Set<string> {
  const rows = sqlJson<Array<{ result_fingerprint: string }>>(
    `SELECT result_fingerprint FROM recruit_match_results WHERE recruit_person_id = '${ISAAC_PERSON_ID}'`,
  );
  return new Set(rows.map((row) => row.result_fingerprint));
}

/** Mirrors production saveTodayBetaMatchResults duplicate + status behavior. */
export function importParsedResults(): {
  found: number;
  saved: number;
  duplicatesIgnored: number;
} {
  const parsed = parseTrnPaste(DAY2_PASTE);
  const detectionStatus = isBaselineEstablished() ? "NEW" : "BASELINE";
  const fingerprints = existingFingerprints();

  let saved = 0;
  let duplicatesIgnored = 0;

  for (const row of parsed) {
    const fingerprint = buildResultFingerprint({
      recruitPersonId: ISAAC_PERSON_ID,
      tournamentName: row.tournamentName,
      round: row.round,
      opponentName: row.opponentName,
      score: row.score,
    });

    if (fingerprints.has(fingerprint)) {
      duplicatesIgnored += 1;
      continue;
    }

    sql(
      `INSERT INTO recruit_match_results (recruit_person_id, source, tournament_name, tournament_date, tournament_date_raw, round, opponent_name, opponent_ranking, score, result, result_fingerprint, detection_status, needs_review, parse_warnings, last_verified_at) VALUES ('${ISAAC_PERSON_ID}', 'trn_manual', ${escapeLiteral(unknownToNull(row.tournamentName))}, ${escapeLiteral(normalizeDateForDb(row.tournamentDate))}, ${escapeLiteral(row.tournamentDate.trim().toUpperCase() === "UNKNOWN" ? null : row.tournamentDate.trim())}, ${escapeLiteral(unknownToNull(row.round))}, ${escapeLiteral(unknownToNull(row.opponentName))}, ${escapeLiteral(unknownToNull(row.opponentRanking))}, ${escapeLiteral(unknownToNull(row.score))}, '${row.result}', '${fingerprint}', '${detectionStatus}', ${row.needsReview}, ARRAY[]::text[], now())`,
    );
    fingerprints.add(fingerprint);
    saved += 1;
  }

  return { found: parsed.length, saved, duplicatesIgnored };
}

function deleteSyntheticMatch(): void {
  sql(
    `DELETE FROM recruit_match_results WHERE recruit_person_id = '${ISAAC_PERSON_ID}' AND tournament_name = '${SYNTHETIC_TOURNAMENT}' AND opponent_name = '${SYNTHETIC_OPPONENT}'`,
  );
}

describe("Day 2 import validation (Isaac Lewis)", () => {
  before(() => {
    try {
      sql("SELECT 1");
    } catch {
      dbAvailable = false;
    }
  });

  after(() => {
    if (!dbAvailable) return;
    deleteSyntheticMatch();
    const finalRows = loadIsaacResults();
    assert.equal(finalRows.length, 9, "cleanup: Isaac has 9 matches");
    assert.equal(
      finalRows.every((row) => row.detection_status === "BASELINE"),
      true,
      "cleanup: all baseline",
    );
  });

  it("parses 10 matches from Day 2 paste", () => {
    assert.equal(parseTrnPaste(DAY2_PASTE).length, 10);
  });

  it("first import: 9 duplicates + 1 NEW", { skip: !dbAvailable ? "local DB unavailable" : false }, () => {
    deleteSyntheticMatch();
    const before = loadIsaacResults();
    assert.equal(before.length, 9);
    assert.equal(before.every((row) => row.detection_status === "BASELINE"), true);

    const firstImport = importParsedResults();
    assert.equal(firstImport.found, 10);
    assert.equal(firstImport.saved, 1);
    assert.equal(firstImport.duplicatesIgnored, 9);

    const after = loadIsaacResults();
    assert.equal(after.length, 10);
    assert.equal(after.filter((row) => row.detection_status === "BASELINE").length, 9);
    assert.equal(after.filter((row) => row.detection_status === "NEW").length, 1);

    const synthetic = after.find(
      (row) =>
        row.tournament_name === SYNTHETIC_TOURNAMENT && row.opponent_name === SYNTHETIC_OPPONENT,
    );
    assert.ok(synthetic);
    assert.equal(synthetic.tournament_name, SYNTHETIC_TOURNAMENT);
    assert.equal(synthetic.round, "QF");
    assert.equal(synthetic.result, "WIN");
    assert.equal(synthetic.opponent_name, SYNTHETIC_OPPONENT);
    assert.equal(synthetic.opponent_ranking, "75");
    assert.equal(synthetic.score, "6-4 6-3");
    assert.equal(synthetic.detection_status, "NEW");
    assert.equal(synthetic.tournament_date, "2026-08-31");
    assert.equal(synthetic.tournament_date_raw, "August 31, 2026");
  });

  it("NEW match appears in New Results feed", { skip: !dbAvailable ? "local DB unavailable" : false }, () => {
    const rows = loadIsaacResults();
    const feed = filterNewResultsFeed(rows.map(rowToMatchResult), {
      windowDays: CONTACT_OPPORTUNITY_THRESHOLDS.newResultWindowDays,
      now: new Date(),
    });
    assert.equal(feed.length, 1);
    assert.equal(feed[0]?.opponentName, SYNTHETIC_OPPONENT);
  });

  it("Isaac appears in Contact Today with calculated score", { skip: !dbAvailable ? "local DB unavailable" : false }, () => {
    const rows = loadIsaacResults();
    const priorityRows = sqlJson<Array<{ key: string; label: string; id: string }>>(
      `SELECT p.id, p.key, p.label FROM recruit_profiles rp JOIN recruit_priorities p ON p.id = rp.priority_id WHERE rp.person_id = '${ISAAC_PERSON_ID}'`,
    );
    const priority = priorityRows[0];

    const opportunity = buildContactOpportunities({
      recruitPersonId: ISAAC_PERSON_ID,
      recruitName: "Isaac Lewis",
      priority: priority ?? undefined,
      daysSinceLastContact: null,
      matchResults: rows.map(rowToMatchResult).filter((row) => row.detectionStatus === "NEW"),
      now: new Date(),
    });

    assert.ok(opportunity);
    assert.equal(opportunity.opportunityScore, 85);
    assert.deepEqual(opportunity.factors.map((factor) => factor.reason), [
      "Recent win",
      "Beat a Top 100 opponent",
      "Priority A recruit",
      "New result",
    ]);
  });

  it("second import: 10 duplicates + 0 NEW", { skip: !dbAvailable ? "local DB unavailable" : false }, () => {
    const secondImport = importParsedResults();
    assert.equal(secondImport.found, 10);
    assert.equal(secondImport.saved, 0);
    assert.equal(secondImport.duplicatesIgnored, 10);

    const after = loadIsaacResults();
    assert.equal(after.length, 10);
    assert.equal(after.filter((row) => row.detection_status === "NEW").length, 1);
  });
});
