#!/usr/bin/env tsx
/**
 * Backfill recruit_match_results.tournament_url from UTR event ids.
 * Requires the local UTR agent (npm run utr:agent) with a valid UTR session.
 */
import { execSync } from "node:child_process";

import { normalizeUtrApiResults, type UtrApiResultsPayload } from "../src/features/recruiting/todayBeta/normalizeUtrCapture";
import {
  fetchUtrAgentHealth,
  requestUtrAgentCheck,
  type UtrAgentRecruitRequest,
} from "../src/features/recruiting/todayBeta/utrAgentClient";
import { parseUtrPlayerIdFromUrl } from "../src/features/recruiting/todayBeta/utrProfile";

const PSQL = "psql -h 127.0.0.1 -p 54322 -U postgres -d postgres";
const PSQL_ENV = { ...process.env, PGPASSWORD: "postgres" };

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

function loadRankBoardUtrRecruits(): UtrAgentRecruitRequest[] {
  const raw = psqlQuery(`
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT rp.person_id AS recruit_person_id,
             pp.first_name || ' ' || pp.last_name AS display_name,
             pp.utr_url,
             rp.external_profiles->'utr'->>'playerId' AS utr_player_id
      FROM recruit_profiles rp
      JOIN production_people pp ON pp.id = rp.person_id
      WHERE rp.coach_rank IS NOT NULL
      ORDER BY rp.coach_rank ASC NULLS LAST, pp.last_name, pp.first_name
    ) t
  `);

  if (!raw || raw === "null") return [];

  return (JSON.parse(raw) as Array<Record<string, string | null>>)
    .map((row) => {
      const utrPlayerId =
        row.utr_player_id?.trim() ||
        (row.utr_url ? parseUtrPlayerIdFromUrl(row.utr_url) : undefined);
      if (!utrPlayerId) return null;
      return {
        recruitPersonId: String(row.recruit_person_id),
        displayName: String(row.display_name),
        utrPlayerId,
      };
    })
    .filter((row): row is UtrAgentRecruitRequest => row !== null);
}

function countTournamentUrls(): { total: number; withUrl: number } {
  const raw = psqlQuery(`
    SELECT COUNT(*)::text || '|' || COUNT(*) FILTER (WHERE tournament_url IS NOT NULL AND tournament_url <> '')::text
    FROM recruit_match_results
  `);
  const [total, withUrl] = raw.split("|");
  return { total: Number(total), withUrl: Number(withUrl) };
}

async function main() {
  const before = countTournamentUrls();
  console.log(`Before: ${before.withUrl}/${before.total} rows have tournament_url`);

  const health = await fetchUtrAgentHealth();
  if (!health.online) {
    console.error("UTR agent offline. Start it with: npm run utr:agent");
    process.exit(1);
  }

  const recruits = loadRankBoardUtrRecruits();
  if (recruits.length === 0) {
    console.error("No UTR-configured Rank Board recruits found.");
    process.exit(1);
  }

  console.log(`Fetching UTR results for ${recruits.length} recruits…`);
  const agentRun = await requestUtrAgentCheck({ mode: "all", recruits });

  let updated = 0;
  for (const acquisition of agentRun.recruits) {
    if (acquisition.status !== "OK" || !acquisition.payload || !acquisition.utrPlayerId) {
      console.log(`Skip ${acquisition.displayName}: ${acquisition.status}`);
      continue;
    }

    const rows = normalizeUtrApiResults({
      payload: acquisition.payload as UtrApiResultsPayload,
      recruitPersonId: acquisition.recruitPersonId,
      utrPlayerId: acquisition.utrPlayerId,
      recruitName: acquisition.displayName,
    });

    for (const row of rows) {
      if (!row.tournamentUrl || !row.externalMatchId) continue;
      psqlExec(`
        UPDATE recruit_match_results
        SET tournament_url = '${sqlEscape(row.tournamentUrl)}',
            last_verified_at = now()
        WHERE recruit_person_id = '${sqlEscape(acquisition.recruitPersonId)}'
          AND external_match_id = '${sqlEscape(row.externalMatchId)}'
          AND (tournament_url IS NULL OR tournament_url = '')
      `);
      updated += 1;
    }

    console.log(`${acquisition.displayName}: processed ${rows.length} UTR matches`);
  }

  const after = countTournamentUrls();
  console.log(`\nBackfill complete. Attempted ${updated} row updates.`);
  console.log(`After: ${after.withUrl}/${after.total} rows have tournament_url (${Math.round((after.withUrl / after.total) * 100)}%)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
