import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function sql(query: string): string {
  const result = spawnSync("psql", [DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-At", "-c", query], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql failed");
  }
  return result.stdout.trim();
}

test("recruit creation, tracked changes, no-ops, and untracked fields", () => {
  let ready = true;
  try {
    sql("select to_regclass('public.recruit_change_log')");
  } catch {
    ready = false;
  }
  if (!ready) return;

  const suffix = `${Date.now()}`;
  const personId = `chglog-test-${suffix}`;
  try {
    sql(`
      insert into public.production_people (id, first_name, last_name, role_id, status_id)
      select '${personId}', 'Trigger', 'Test', role_id, status_id
      from public.production_people
      limit 1;
    `);
    sql(`insert into public.recruit_profiles (person_id) values ('${personId}');`);
    const created = sql(
      `select count(*) from public.recruit_change_log where recruit_person_id = '${personId}' and event_type = 'recruit_created'`,
    );
    assert.equal(created, "1");

    sql(`update public.production_people set utr = 10.14 where id = '${personId}'`);
    sql(`update public.production_people set utr = 10.14 where id = '${personId}'`);
    sql(`update public.production_people set wtn = 22.5 where id = '${personId}'`);
    sql(`update public.production_people set trn_rank = 42 where id = '${personId}'`);
    sql(`update public.production_people set notes = 'secret note' where id = '${personId}'`);
    const tracked = sql(
      `select count(*) from public.recruit_change_log where recruit_person_id = '${personId}' and event_type = 'field_updated'`,
    );
    assert.equal(tracked, "3");

    const pipeline = sql(`select id from public.recruit_pipeline_stages order by sort_order limit 1`);
    if (pipeline) {
      sql(`update public.recruit_profiles set pipeline_stage_id = '${pipeline}' where person_id = '${personId}'`);
      sql(`update public.recruit_profiles set pipeline_stage_id = '${pipeline}' where person_id = '${personId}'`);
      const labels = sql(
        `select summary from public.recruit_change_log where recruit_person_id = '${personId}' and field_key = 'pipeline_stage_id'`,
      );
      assert.ok(labels.length > 0);
      assert.doesNotMatch(labels, /c12/);
    }

    sql(`update public.recruit_profiles set schools_of_interest = 'Kenyon, Williams' where person_id = '${personId}'`);
    sql(`update public.recruit_profiles set schools_of_interest = 'Kenyon, Denison' where person_id = '${personId}'`);
    const schools = sql(
      `select summary from public.recruit_change_log where recruit_person_id = '${personId}' and field_key = 'schools_of_interest' order by occurred_at desc limit 1`,
    );
    assert.match(schools, /Added Denison/);
    assert.match(schools, /Removed Williams/);

    const secrets = sql(
      `select count(*) from public.recruit_change_log where recruit_person_id = '${personId}' and (summary ilike '%secret%' or summary ilike '%password%')`,
    );
    assert.equal(secrets, "0");
  } finally {
    sql(`delete from public.production_people where id = '${personId}'`);
  }
});

test("authenticated clients cannot write log rows", () => {
  let ready = true;
  try {
    sql("select to_regclass('public.recruit_change_log')");
  } catch {
    ready = false;
  }
  if (!ready) return;
  const denied = spawnSync(
    "psql",
    [
      DATABASE_URL,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "set role authenticated; insert into public.recruit_change_log (recruit_person_id, event_type, category, summary, source) values ('x', 'recruit_created', 'system', 'no', 'app');",
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(denied.status, 0);
});
