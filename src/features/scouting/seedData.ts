/**
 * Idempotent Scouting CSV seed metadata. Full row payloads live in
 * data/seed-payload.json (generated from data/scouting-reports.csv).
 */
import seedPayload from "./data/seed-payload.json";

export const SCOUTING_SEED = seedPayload;

export const SCOUTING_SOURCE_LOGICAL_ROWS = 43;
export const SCOUTING_EXPECTED_TEAMS = {
  Amherst: 11,
  "Wash U": 10,
  Kenyon: 8,
  Swarthmore: 4,
  Chicago: 4,
  CWRU: 3,
  Emory: 2,
  Gustavus: 1,
} as const;

export const IDEMPOTENCY_METHOD =
  "source_key = md5(scouting-reports.csv + rowIndex + date + opponent + team + reportBy + notes + scoutingReport + doubles); SQL ON CONFLICT DO NOTHING; never overwrite user_edited rows.";
