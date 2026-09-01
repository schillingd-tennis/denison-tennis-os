#!/usr/bin/env tsx
/**
 * 17-recruit UTR pilot validation (psql + local agent API).
 */
import { execSync } from "node:child_process";

import { UTR_PILOT_COHORT } from "../src/features/recruiting/todayBeta/pilotCohort";
import { detectionStatusForUtrImportRow, isBaselineEstablished } from "../src/features/recruiting/todayBeta/detectionStatus";
import { findCrossSourceMatch } from "../src/features/recruiting/todayBeta/crossSourceMatch";
import { buildResultFingerprint } from "../src/features/recruiting/todayBeta/fingerprint";
import type { NormalizedUtrImportRow } from "../src/features/recruiting/todayBeta/normalizeUtrCapture";
import {
  countUtrPayloadMatches,
  filterUtrResultsPayload,
} from "../src/features/recruiting/todayBeta/utrPayloadWindow";
import { normalizeUtrApiResults } from "../src/features/recruiting/todayBeta/normalizeUtrCapture";
import { requestUtrAgentCheck } from "../src/features/recruiting/todayBeta/utrAgentClient";
import { parseUtrPlayerIdFromUrl, buildUtrExternalProfile } from "../src/features/recruiting/todayBeta/utrProfile";
import type { RecruitMatchResult, SaveMatchResultsOutcome } from "../src/features/recruiting/todayBeta/types";

const PSQL = "psql -h 127.0.0.1 -p 54322 -U postgres -d postgres";
const PSQL_ENV = { ...process.env, PGPASSWORD: "postgres" };

type CohortRecruit = {
  personId: string;
  displayName: string;
  utrPlayerId?: string;
};

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function psqlQuery(sql: string): string {
  return execSync(`${PSQL} -t -A -c "${sql.replace(/"/g, '\\"').replace(/\n/g, " ")}"`, {
    encoding: "utf8",
    env: PSQL_ENV,
  }).trim();
}

function psqlExec(sql: string): void {
  execSync(`${PSQL} -c "${sql.replace(/"/g, '\\"').replace(/\n/g, " ")}"`, {
    encoding: "utf8",
    env: PSQL_ENV,
  });
}

function loadCohortRecruits(): CohortRecruit[] {
  return UTR_PILOT_COHORT.map((recruit) => ({
    personId: recruit.personId,
    displayName: recruit.displayName,
    utrPlayerId: recruit.utrPlayerId,
  }));
}

function enablePilotMonitoring(): void {
  for (const recruit of UTR_PILOT_COHORT) {
    const patch = JSON.stringify({ utrMonitoring: { enabled: true } });
    psqlExec(`
      UPDATE recruit_profiles
      SET external_profiles = COALESCE(external_profiles, '{}'::jsonb) || '${sqlEscape(patch)}'::jsonb
      WHERE person_id = '${sqlEscape(recruit.personId)}'
    `);
  }
}

function seedUtrProfiles(recruits: CohortRecruit[]): void {
  for (const recruit of recruits) {
    if (!recruit.personId || !recruit.utrPlayerId) continue;
    const utr = buildUtrExternalProfile({ playerId: recruit.utrPlayerId });
    const raw = psqlQuery(
      `SELECT external_profiles::text FROM recruit_profiles WHERE person_id = '${sqlEscape(recruit.personId)}'`,
    );
    const profiles = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const next = {
      ...profiles,
      utr: {
        ...(typeof profiles.utr === "object" && profiles.utr ? profiles.utr : {}),
        ...utr,
      },
    };
    psqlExec(`
      UPDATE recruit_profiles
      SET external_profiles = '${sqlEscape(JSON.stringify(next))}'::jsonb
      WHERE person_id = '${sqlEscape(recruit.personId)}'
    `);
  }
}

function loadRecruitResults(personId: string) {
  const raw = psqlQuery(`
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT id, source, opponent_name, score, needs_review, detection_status,
             external_match_id, recruit_rating, opponent_rating, rating_type,
             opponent_ranking, tournament_name, tournament_date::text, round, result
      FROM recruit_match_results
      WHERE recruit_person_id = '${sqlEscape(personId)}'
    ) t
  `);
  if (!raw || raw === "null") return [];
  return JSON.parse(raw) as Array<Record<string, string | boolean | null>>;
}

function toMatchResult(personId: string, row: Record<string, string | boolean | null>): RecruitMatchResult {
  return {
    id: String(row.id),
    recruitPersonId: personId,
    source: String(row.source),
    tournamentName: row.tournament_name ? String(row.tournament_name) : undefined,
    tournamentDate: row.tournament_date ? String(row.tournament_date).slice(0, 10) : undefined,
    round: row.round ? String(row.round) : undefined,
    opponentName: row.opponent_name ? String(row.opponent_name) : undefined,
    opponentRanking: row.opponent_ranking ? String(row.opponent_ranking) : undefined,
    score: row.score ? String(row.score) : undefined,
    result: String(row.result) as RecruitMatchResult["result"],
    firstDetectedAt: "",
    lastVerifiedAt: "",
    detectionStatus: String(row.detection_status) as RecruitMatchResult["detectionStatus"],
    resultFingerprint: "",
    needsReview: row.needs_review === true,
    parseWarnings: [],
    externalMatchId: row.external_match_id ? String(row.external_match_id) : undefined,
    recruitRating: row.recruit_rating ? String(row.recruit_rating) : undefined,
    opponentRating: row.opponent_rating ? String(row.opponent_rating) : undefined,
    ratingType: row.rating_type ? (String(row.rating_type) as RecruitMatchResult["ratingType"]) : undefined,
  };
}

function loadExternalProfiles(personId: string) {
  const raw = psqlQuery(
    `SELECT external_profiles::text FROM recruit_profiles WHERE person_id = '${sqlEscape(personId)}'`,
  );
  return raw
    ? (JSON.parse(raw) as {
        trn?: { baselineEstablishedAt?: string };
        utr?: { baselineEstablishedAt?: string; resultsUrl?: string; playerId?: string };
      })
    : {};
}

function saveUtrViaPsql(input: {
  recruitPersonId: string;
  utrPlayerId: string;
  sourceUrl: string;
  matches: NormalizedUtrImportRow[];
}): SaveMatchResultsOutcome {
  const externalProfiles = loadExternalProfiles(input.recruitPersonId);
  const baselineEstablished = isBaselineEstablished(externalProfiles);
  const baselineEstablishedAt =
    externalProfiles.trn?.baselineEstablishedAt ?? externalProfiles.utr?.baselineEstablishedAt;

  let existingRows = loadRecruitResults(input.recruitPersonId).map((row) =>
    toMatchResult(input.recruitPersonId, row),
  );
  const outcome: SaveMatchResultsOutcome = {
    found: input.matches.length,
    saved: 0,
    savedAsBaseline: 0,
    savedAsNew: 0,
    duplicatesIgnored: 0,
    crossSourceMatched: 0,
    needsReview: 0,
    baselineEstablished,
    savedResults: [],
    errors: [],
  };

  for (const row of input.matches) {
    if (row.needsReview) outcome.needsReview += 1;

    if (row.externalMatchId) {
      const existingByExternalId = existingRows.find(
        (existing) => existing.externalMatchId === row.externalMatchId,
      );
      if (existingByExternalId) {
        outcome.crossSourceMatched += 1;
        outcome.duplicatesIgnored += 1;
        psqlExec(`
          UPDATE recruit_match_results
          SET external_match_id = '${sqlEscape(row.externalMatchId)}',
              recruit_rating = ${row.recruitUtr ? `'${sqlEscape(row.recruitUtr)}'` : "NULL"},
              opponent_rating = ${row.opponentUtr ? `'${sqlEscape(row.opponentUtr)}'` : "NULL"},
              rating_type = 'UTR',
              last_verified_at = now()
          WHERE id = '${existingByExternalId.id}'
        `);
        continue;
      }
    }

    const crossSource = findCrossSourceMatch(existingRows, {
      opponentName: row.opponentName,
      tournamentName: row.tournamentName,
      tournamentDate: row.matchDate,
      score: row.score,
      round: row.round,
    });

    if (crossSource.kind === "confident") {
      outcome.crossSourceMatched += 1;
      psqlExec(`
        UPDATE recruit_match_results
        SET external_match_id = ${row.externalMatchId ? `'${sqlEscape(row.externalMatchId)}'` : "NULL"},
            recruit_rating = ${row.recruitUtr ? `'${sqlEscape(row.recruitUtr)}'` : "NULL"},
            opponent_rating = ${row.opponentUtr ? `'${sqlEscape(row.opponentUtr)}'` : "NULL"},
            rating_type = 'UTR',
            last_verified_at = now()
        WHERE id = '${crossSource.existing.id}'
      `);
      continue;
    }

    const rowNeedsReview =
      row.needsReview ||
      crossSource.kind === "ambiguous" ||
      row.tournamentName.toUpperCase() === "UNKNOWN" ||
      row.opponentName.toUpperCase() === "UNKNOWN" ||
      row.score.toUpperCase() === "UNKNOWN";

    if (crossSource.kind === "ambiguous") outcome.needsReview += 1;

    const rowDetectionStatus = detectionStatusForUtrImportRow({
      baselineEstablished,
      baselineEstablishedAt,
      matchDate: row.matchDate,
    });

    const fingerprint = buildResultFingerprint({
      recruitPersonId: input.recruitPersonId,
      tournamentName: row.tournamentName,
      round: row.round,
      opponentName: row.opponentName,
      score: row.score,
    });

    try {
      psqlExec(`
        INSERT INTO recruit_match_results (
          recruit_person_id, source, tournament_name, tournament_date, round,
          opponent_name, score, result, source_url, external_match_id,
          recruit_rating, opponent_rating, rating_type, result_fingerprint,
          detection_status, needs_review, parse_warnings
        ) VALUES (
          '${sqlEscape(input.recruitPersonId)}',
          'UTR',
          ${row.tournamentName ? `'${sqlEscape(row.tournamentName)}'` : "NULL"},
          ${row.matchDate && row.matchDate !== "UNKNOWN" ? `'${sqlEscape(row.matchDate.slice(0, 10))}'` : "NULL"},
          ${row.round ? `'${sqlEscape(row.round)}'` : "NULL"},
          ${row.opponentName ? `'${sqlEscape(row.opponentName)}'` : "NULL"},
          ${row.score ? `'${sqlEscape(row.score)}'` : "NULL"},
          '${sqlEscape(row.result)}',
          '${sqlEscape(input.sourceUrl)}',
          ${row.externalMatchId ? `'${sqlEscape(row.externalMatchId)}'` : "NULL"},
          ${row.recruitUtr ? `'${sqlEscape(row.recruitUtr)}'` : "NULL"},
          ${row.opponentUtr ? `'${sqlEscape(row.opponentUtr)}'` : "NULL"},
          'UTR',
          '${sqlEscape(fingerprint)}',
          '${rowDetectionStatus}',
          ${rowNeedsReview ? "true" : "false"},
          ARRAY[${row.warnings.map((w) => `'${sqlEscape(w)}'`).join(",")}]::text[]
        )
      `);
      outcome.saved += 1;
      if (rowDetectionStatus === "BASELINE") outcome.savedAsBaseline += 1;
      else outcome.savedAsNew += 1;
      existingRows = loadRecruitResults(input.recruitPersonId).map((r) =>
        toMatchResult(input.recruitPersonId, r),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("recruit_match_results_fingerprint_unique")) {
        outcome.duplicatesIgnored += 1;
      } else {
        outcome.errors.push(`${row.opponentName}: ${message}`);
      }
    }
  }

  const now = new Date().toISOString();
  const profiles = loadExternalProfiles(input.recruitPersonId);
  const utr = profiles.utr ?? buildUtrExternalProfile({ playerId: input.utrPlayerId });
  const updatedProfiles = {
    ...profiles,
    utr: {
      ...utr,
      lastCheckedAt: now,
      lastImportedAt: now,
      lastCheckSavedNewCount: outcome.savedAsNew,
    },
    utrAgent: {
      lastCheckStatus: outcome.savedAsNew > 0 ? "New Results" : outcome.needsReview > 0 ? "Needs Review" : "Checked",
      lastCheckAt: now,
    },
  };
  psqlExec(`
    UPDATE recruit_profiles
    SET external_profiles = '${sqlEscape(JSON.stringify(updatedProfiles))}'::jsonb
    WHERE person_id = '${sqlEscape(input.recruitPersonId)}'
  `);

  return outcome;
}

async function runPilotBatch(recruits: CohortRecruit[], label: string) {
  const batchStarted = Date.now();
  console.log(`\n=== ${label} ===`);
  const agentStarted = Date.now();
  const agentResult = await requestUtrAgentCheck({
    mode: "all",
    recruits: recruits
      .filter((row) => row.personId)
      .map((row) => ({
        recruitPersonId: row.personId,
        displayName: row.displayName,
        utrPlayerId: row.utrPlayerId,
      })),
  });
  const agentMs = Date.now() - agentStarted;

  console.log(`Agent runtime: ${Math.round(agentMs / 1000)}s`);
  console.log(`Matches read: ${agentResult.summary.matchesRead}`);
  console.log(
    `Stopped early: ${agentResult.stoppedEarly}${agentResult.stopReason ? ` (${agentResult.stopReason})` : ""}`,
  );

  const perRecruit: Array<{
    name: string;
    utrId?: string;
    acquisition: string;
    matchesRead: number;
    window: number;
    crossSource: number;
    baseline: number;
    savedAsNew: number;
    needsReview: number;
    duplicates: number;
    runtimeMs?: number;
    errors: string[];
  }> = [];

  let totalWindow = 0;
  let totalCross = 0;
  let totalBaseline = 0;
  let totalNew = 0;
  let totalReview = 0;
  let totalDupes = 0;
  let failures = 0;

  for (const acquisition of agentResult.recruits) {
    const recruit = recruits.find((row) => row.personId === acquisition.recruitPersonId);
    const runtimeMs =
      acquisition.startedAt && acquisition.finishedAt
        ? Math.max(0, Date.parse(acquisition.finishedAt) - Date.parse(acquisition.startedAt))
        : undefined;

    const row = {
      name: acquisition.displayName,
      utrId: recruit?.utrPlayerId,
      acquisition: acquisition.status,
      matchesRead: acquisition.matchesRead,
      window: 0,
      crossSource: 0,
      baseline: 0,
      savedAsNew: 0,
      needsReview: 0,
      duplicates: 0,
      runtimeMs,
      errors: [] as string[],
    };

    if (acquisition.status === "AUTH_REQUIRED") {
      failures += 1;
      perRecruit.push(row);
      break;
    }

    if (acquisition.status !== "OK" || !acquisition.payload || !acquisition.utrPlayerId) {
      if (acquisition.status !== "NOT_CONFIGURED") failures += 1;
      perRecruit.push(row);
      continue;
    }

    const filtered = filterUtrResultsPayload(acquisition.payload as Parameters<typeof filterUtrResultsPayload>[0]);
    const windowCount = countUtrPayloadMatches(filtered);
    const normalizedWindow = normalizeUtrApiResults({
      payload: filtered,
      recruitPersonId: acquisition.recruitPersonId,
      utrPlayerId: acquisition.utrPlayerId,
      recruitName: acquisition.displayName,
    });

    const importOutcome = saveUtrViaPsql({
      recruitPersonId: acquisition.recruitPersonId,
      utrPlayerId: acquisition.utrPlayerId,
      sourceUrl:
        acquisition.sourceUrl ??
        `https://app.utrsports.net/profiles/${acquisition.utrPlayerId}?t=2`,
      matches: normalizedWindow,
    });

    row.window = windowCount;
    row.crossSource = importOutcome.crossSourceMatched;
    row.baseline = importOutcome.savedAsBaseline;
    row.savedAsNew = importOutcome.savedAsNew;
    row.needsReview = importOutcome.needsReview;
    row.duplicates = importOutcome.duplicatesIgnored;
    row.errors = importOutcome.errors;

    totalWindow += windowCount;
    totalCross += importOutcome.crossSourceMatched;
    totalBaseline += importOutcome.savedAsBaseline;
    totalNew += importOutcome.savedAsNew;
    totalReview += importOutcome.needsReview;
    totalDupes += importOutcome.duplicatesIgnored;

    perRecruit.push(row);
  }

  for (const recruit of recruits) {
    if (perRecruit.some((row) => row.name === recruit.displayName)) continue;
    perRecruit.push({
      name: recruit.displayName,
      utrId: recruit.utrPlayerId,
      acquisition: recruit.utrPlayerId ? "NOT_PROCESSED" : "NOT_CONFIGURED",
      matchesRead: 0,
      window: 0,
      crossSource: 0,
      baseline: 0,
      savedAsNew: 0,
      needsReview: 0,
      duplicates: 0,
      errors: [],
    });
  }

  const batchMs = Date.now() - batchStarted;

  return {
    agentResult,
    perRecruit,
    totals: {
      batchMs,
      totalWindow,
      totalCross,
      totalBaseline,
      totalNew,
      totalReview,
      totalDupes,
      failures,
    },
  };
}

async function main() {
  enablePilotMonitoring();
  const recruits = loadCohortRecruits();
  console.log("\n=== Cohort UTR configuration ===");
  for (const recruit of recruits) {
    console.log(
      `${recruit.displayName}: ${recruit.utrPlayerId ?? "NOT CONFIGURED"} (${recruit.personId || "missing person"})`,
    );
  }

  seedUtrProfiles(recruits);

  const configured = recruits.filter((row) => row.utrPlayerId && row.personId);
  console.log(`\nConfigured: ${configured.length} / ${recruits.length}`);

  const run1 = await runPilotBatch(recruits, "Live pilot batch (run 1)");
  if (run1.agentResult.stopReason === "AUTH_REQUIRED") {
    console.error("\nAUTH_REQUIRED — run npm run utr:login and retry.");
    process.exit(1);
  }

  const run2 = await runPilotBatch(recruits, "Idempotency batch (run 2)");

  for (const [label, result] of [
    ["Run 1", run1],
    ["Run 2", run2],
  ] as const) {
    console.log(`\n=== ${label} per-recruit ===`);
    for (const row of result.perRecruit) {
      console.log(
        `${row.name}: ${row.acquisition} · processed ${row.window} · matched ${row.crossSource} · baseline ${row.baseline} · NEW ${row.savedAsNew} · review ${row.needsReview} · dupes ${row.duplicates}`,
      );
    }
    console.log(`\n=== ${label} totals ===`);
    console.log(`Runtime: ${Math.round(result.totals.batchMs / 1000)}s`);
    console.log(`Matches processed (120-day): ${result.totals.totalWindow}`);
    console.log(`TRN enriched: ${result.totals.totalCross}`);
    console.log(`UTR-only baseline: ${result.totals.totalBaseline}`);
    console.log(`NEW: ${result.totals.totalNew}`);
    console.log(`Needs review: ${result.totals.totalReview}`);
    console.log(`Duplicates: ${result.totals.totalDupes}`);
    console.log(`Failures: ${result.totals.failures}`);
  }

  const avgSeconds =
    configured.length > 0 ? Math.round(run1.totals.batchMs / configured.length / 1000) : 0;
  console.log("\n=== Pilot recommendation inputs ===");
  console.log(`Cohort size: ${recruits.length}`);
  console.log(`Average seconds/recruit (run 1): ${avgSeconds}s`);
  console.log(
    run2.totals.totalNew === 0 && run2.totals.totalBaseline === 0
      ? "Repeat-run idempotency: PASS"
      : "Repeat-run idempotency: REVIEW (run 2 inserted rows)",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
