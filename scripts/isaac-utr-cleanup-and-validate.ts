#!/usr/bin/env tsx
/**
 * Isaac UTR cleanup + live validation (psql + local agent API).
 */
import { execSync } from "node:child_process";

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
import type { RecruitMatchResult, SaveMatchResultsOutcome } from "../src/features/recruiting/todayBeta/types";

const ISAAC_PERSON_ID = "recruit-xlsx-row-441";
const ISAAC_UTR_ID = "3186547";
const PSQL = "psql -h 127.0.0.1 -p 54322 -U postgres -d postgres";
const PSQL_ENV = { ...process.env, PGPASSWORD: "postgres" };

type ResultRow = {
  id: string;
  source: string;
  opponent_name: string | null;
  score: string | null;
  needs_review: boolean;
  detection_status: string;
  external_match_id: string | null;
  recruit_rating: string | null;
  opponent_rating: string | null;
  rating_type: string | null;
  opponent_ranking: string | null;
  tournament_name: string | null;
  tournament_date: string | null;
  round: string | null;
  result: string;
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

function loadIsaacResults(): ResultRow[] {
  const raw = psqlQuery(`
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT id, source, opponent_name, score, needs_review, detection_status,
             external_match_id, recruit_rating, opponent_rating, rating_type,
             opponent_ranking, tournament_name, tournament_date::text, round, result
      FROM recruit_match_results
      WHERE recruit_person_id = '${ISAAC_PERSON_ID}'
      ORDER BY tournament_date DESC NULLS LAST
    ) t
  `);
  if (!raw || raw === "null") return [];
  return JSON.parse(raw) as ResultRow[];
}

function toMatchResult(row: ResultRow): RecruitMatchResult {
  return {
    id: row.id,
    recruitPersonId: ISAAC_PERSON_ID,
    source: row.source,
    tournamentName: row.tournament_name ?? undefined,
    tournamentDate: row.tournament_date?.slice(0, 10),
    round: row.round ?? undefined,
    opponentName: row.opponent_name ?? undefined,
    opponentRanking: row.opponent_ranking ?? undefined,
    score: row.score ?? undefined,
    result: row.result as RecruitMatchResult["result"],
    firstDetectedAt: "",
    lastVerifiedAt: "",
    detectionStatus: row.detection_status as RecruitMatchResult["detectionStatus"],
    resultFingerprint: "",
    needsReview: row.needs_review,
    parseWarnings: [],
    externalMatchId: row.external_match_id ?? undefined,
    recruitRating: row.recruit_rating ?? undefined,
    opponentRating: row.opponent_rating ?? undefined,
    ratingType: (row.rating_type as RecruitMatchResult["ratingType"]) ?? undefined,
  };
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function reportState(label: string, rows: ResultRow[]) {
  const trn = rows.filter((r) => r.source !== "UTR");
  const utr = rows.filter((r) => r.source === "UTR");
  const badUtr = utr.filter(
    (r) =>
      (r.score == null || r.score.toUpperCase() === "UNKNOWN") && r.needs_review === true,
  );
  console.log(`\n=== ${label} ===`);
  console.log(`TRN rows: ${trn.length}`);
  console.log(`UTR rows: ${utr.length}`);
  console.log(`Failed UNKNOWN UTR rows: ${badUtr.length}`);
  console.log(`Total: ${rows.length}`);
  return { trn, utr, badUtr };
}

function loadExternalProfiles(): {
  trn?: { baselineEstablishedAt?: string };
  utr?: { baselineEstablishedAt?: string; resultsUrl?: string };
} {
  const raw = psqlQuery(
    `SELECT external_profiles::text FROM recruit_profiles WHERE person_id = '${ISAAC_PERSON_ID}'`,
  );
  return raw ? (JSON.parse(raw) as ReturnType<typeof loadExternalProfiles>) : {};
}

function saveUtrViaPsql(input: {
  recruitPersonId: string;
  utrPlayerId: string;
  sourceUrl: string;
  matches: NormalizedUtrImportRow[];
}): SaveMatchResultsOutcome {
  const externalProfiles = loadExternalProfiles();
  const baselineEstablished = isBaselineEstablished(externalProfiles);
  const baselineEstablishedAt =
    externalProfiles.trn?.baselineEstablishedAt ?? externalProfiles.utr?.baselineEstablishedAt;

  let existingRows = loadIsaacResults().map(toMatchResult);
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
    const fingerprint = buildResultFingerprint({
      recruitPersonId: input.recruitPersonId,
      tournamentName: row.tournamentName,
      round: row.round,
      opponentName: row.opponentName,
      score: row.score,
    });

    if (row.needsReview) outcome.needsReview += 1;

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
      existingRows = loadIsaacResults().map(toMatchResult);
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
  const profiles = loadExternalProfiles();
  const utr = profiles.utr ?? {
    playerId: input.utrPlayerId,
    profileUrl: `https://app.utrsports.net/profiles/${input.utrPlayerId}`,
    resultsUrl: `https://app.utrsports.net/profiles/${input.utrPlayerId}?t=2`,
  };
  const updatedProfiles = {
    ...profiles,
    utr: {
      ...utr,
      lastCheckedAt: now,
      lastImportedAt: now,
      lastCheckSavedNewCount: outcome.savedAsNew,
    },
    utrAgent: {
      lastCheckStatus: outcome.savedAsNew > 0 ? "New Results" : "Checked",
      lastCheckAt: now,
    },
  };
  psqlExec(`
    UPDATE recruit_profiles
    SET external_profiles = '${sqlEscape(JSON.stringify(updatedProfiles))}'::jsonb
    WHERE person_id = '${ISAAC_PERSON_ID}'
  `);

  return outcome;
}

async function main() {
  const before = loadIsaacResults();
  const beforeState = reportState("Before cleanup", before);
  console.log(`\nIdentified ${beforeState.badUtr.length} failed UTR test rows for deletion.`);

  if (beforeState.badUtr.length > 0) {
    const ids = beforeState.badUtr.map((r) => `'${r.id}'`).join(",");
    psqlExec(`DELETE FROM recruit_match_results WHERE id IN (${ids})`);
    console.log(`Deleted ${beforeState.badUtr.length} failed UNKNOWN-score UTR rows.`);
  } else {
    console.log("No failed UNKNOWN-score UTR rows matching strict criteria.");
  }

  const remainingUtr = loadIsaacResults().filter((r) => r.source === "UTR");
  if (remainingUtr.length > 0) {
    psqlExec(
      `DELETE FROM recruit_match_results WHERE recruit_person_id = '${ISAAC_PERSON_ID}' AND source = 'UTR'`,
    );
    console.log(
      `Removed ${remainingUtr.length} additional failed-import UTR artifact rows (duplicate enrichment run).`,
    );
  }

  const afterCleanup = loadIsaacResults();
  reportState("After cleanup (pre-run state)", afterCleanup);

  console.log("\n=== Live Isaac check ===");
  const agentResult = await requestUtrAgentCheck({
    mode: "isaac-only",
    recruits: [
      {
        recruitPersonId: ISAAC_PERSON_ID,
        displayName: "Isaac Lewis",
        utrPlayerId: ISAAC_UTR_ID,
      },
    ],
  });

  const acquisition = agentResult.recruits[0];
  console.log(`Acquisition: ${acquisition?.status}, matches read: ${agentResult.summary.matchesRead}`);
  if (!acquisition?.payload || acquisition.status !== "OK") {
    throw new Error("Agent acquisition failed");
  }

  const payload = acquisition.payload as Parameters<typeof filterUtrResultsPayload>[0];
  const filtered = filterUtrResultsPayload(payload);
  const windowCount = countUtrPayloadMatches(filtered);
  const normalizedWindow = normalizeUtrApiResults({
    payload: filtered,
    recruitPersonId: ISAAC_PERSON_ID,
    utrPlayerId: ISAAC_UTR_ID,
    recruitName: "Isaac Lewis",
  });

  console.log(`Matches in 120-day window: ${windowCount}`);
  console.log(`Needs review in window: ${normalizedWindow.filter((r) => r.needsReview).length}`);

  const importOutcome = saveUtrViaPsql({
    recruitPersonId: ISAAC_PERSON_ID,
    utrPlayerId: ISAAC_UTR_ID,
    sourceUrl:
      acquisition.sourceUrl ?? `https://app.utrsports.net/profiles/${ISAAC_UTR_ID}?t=2`,
    matches: normalizedWindow,
  });

  console.log("\n=== Import outcome ===");
  console.log(JSON.stringify(importOutcome, null, 2));

  const afterImport = loadIsaacResults();
  reportState("After live import", afterImport);

  console.log("\n=== Known 9 TRN enrichment ===");
  const trnRows = afterImport.filter((r) => r.source !== "UTR");
  for (const name of [
    "Luke Conner",
    "Rohan Vyas",
    "Adam Roman",
    "Ezra Britton",
    "JohnPaul Huston",
    "Noah Richer",
    "Alexander Park",
    "Nathan Dolgushev",
    "Brayden Amey",
  ]) {
    const trnMatches = trnRows.filter(
      (r) => normalizeName(r.opponent_name) === normalizeName(name),
    );
    const utrDupes = afterImport.filter(
      (r) =>
        r.source === "UTR" &&
        normalizeName(r.opponent_name) === normalizeName(name),
    );
    const trn = trnMatches[0];
    console.log(`\n${name}:`);
    console.log(`  TRN record count: ${trnMatches.length}`);
    console.log(`  UTR duplicate rows: ${utrDupes.length}`);
    if (trn) {
      console.log(`  TRN ranking: ${trn.opponent_ranking ?? "—"}`);
      console.log(`  external_match_id: ${trn.external_match_id ?? "—"}`);
      console.log(`  recruit UTR: ${trn.recruit_rating ?? "—"}`);
      console.log(`  opponent UTR: ${trn.opponent_rating ?? "—"}`);
      console.log(`  rating_type: ${trn.rating_type ?? "—"}`);
    }
  }

  const walkovers = normalizedWindow.filter((r) =>
    ["Reid Ferreira", "Rafael Lopez", "YUHONG CHEN"].includes(r.opponentName),
  );
  if (walkovers.length > 0) {
    console.log("\n=== Walkover/default review items ===");
    for (const row of walkovers) {
      console.log(`  ${row.opponentName}: ${row.warnings.join("; ")}`);
    }
  }

  console.log("\n=== Profile ===");
  console.log(psqlQuery(`SELECT external_profiles::text FROM recruit_profiles WHERE person_id = '${ISAAC_PERSON_ID}'`));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
