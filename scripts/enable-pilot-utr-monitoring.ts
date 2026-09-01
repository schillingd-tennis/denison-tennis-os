#!/usr/bin/env tsx
/**
 * Enable UTR monitoring for the controlled 17-recruit pilot cohort.
 */
import { execSync } from "node:child_process";

import { UTR_PILOT_COHORT } from "../src/features/recruiting/todayBeta/pilotCohort";

const PSQL = "psql -h 127.0.0.1 -p 54322 -U postgres -d postgres";
const PSQL_ENV = { ...process.env, PGPASSWORD: "postgres" };

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function psqlExec(sql: string): void {
  execSync(`${PSQL} -c "${sql.replace(/"/g, '\\"').replace(/\n/g, " ")}"`, {
    encoding: "utf8",
    env: PSQL_ENV,
    stdio: "inherit",
  });
}

function main(): void {
  console.log(`Enabling UTR monitoring for ${UTR_PILOT_COHORT.length} pilot recruits…`);

  for (const recruit of UTR_PILOT_COHORT) {
    const patch = JSON.stringify({ utrMonitoring: { enabled: true } });
    psqlExec(`
      UPDATE recruit_profiles
      SET external_profiles = COALESCE(external_profiles, '{}'::jsonb) || '${sqlEscape(patch)}'::jsonb
      WHERE person_id = '${sqlEscape(recruit.personId)}'
    `);
    console.log(`  ✓ ${recruit.displayName} (${recruit.personId})`);
  }

  console.log("\nPilot cohort enabled. Run scripts/pilot-utr-validate.ts for live batch validation.");
}

main();
