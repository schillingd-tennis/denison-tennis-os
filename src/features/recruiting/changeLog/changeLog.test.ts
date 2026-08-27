import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { changeLogEventTitle, changeLogMatchesQuery } from "./display";
import { changeLogFiltersAreDefault, changeLogPageHref, parseChangeLogFilters } from "./filters";
import { DEFAULT_CHANGE_LOG_PERIOD, occurredInRange, rangeForPeriod } from "./period";
import {
  centralChangeLogSummaries,
  dashboardRecentChangeLogs,
  recruitCardChangeLogSummaries,
} from "./summaries";
import type { ChangeLogEvent } from "./types";

function event(partial: Partial<ChangeLogEvent> & Pick<ChangeLogEvent, "id" | "occurredAt">): ChangeLogEvent {
  return {
    recruitPersonId: "p1",
    recruitName: "Ada Recruit",
    eventType: "field_updated",
    category: "rankings",
    fieldKey: "utr",
    fieldLabel: "UTR",
    oldValue: { label: "10.1" },
    newValue: { label: "10.3" },
    summary: "10.1 → 10.3",
    source: "app",
    actorUserId: "user-1",
    createdAt: partial.occurredAt,
    ...partial,
  };
}

test("invalid filter values fall back safely", () => {
  const parsed = parseChangeLogFilters({ period: "nope", category: "secret", source: "root", offset: "-3" });
  assert.equal(parsed.period, DEFAULT_CHANGE_LOG_PERIOD);
  assert.equal(parsed.category, "all");
  assert.equal(parsed.source, "all");
  assert.equal(parsed.offset, 0);
});

test("URL omits defaults and restores filter state", () => {
  assert.equal(
    changeLogPageHref({
      period: DEFAULT_CHANGE_LOG_PERIOD,
      category: "all",
      query: "",
      recruitPersonId: "",
      source: "all",
      offset: 0,
    }),
    "/recruiting/log",
  );
  assert.equal(
    changeLogPageHref({
      period: "today",
      category: "rankings",
      query: "UTR",
      recruitPersonId: "abc",
      source: "app",
      offset: 50,
    }),
    "/recruiting/log?period=today&category=rankings&q=UTR&recruit=abc&source=app&offset=50",
  );
  assert.equal(changeLogFiltersAreDefault(parseChangeLogFilters({})), true);
});

test("DST-safe today/yesterday/week/month windows match Interactions", () => {
  const now = new Date("2026-03-08T18:00:00.000Z");
  const today = rangeForPeriod("today", now);
  assert.equal(new Date(today.startMs!).toISOString(), "2026-03-08T05:00:00.000Z");
  assert.equal(occurredInRange("2026-03-08T05:00:00.000Z", today), true);
  assert.equal(occurredInRange("2026-03-08T04:59:59.000Z", today), false);
  const yesterday = rangeForPeriod("yesterday", now);
  assert.equal(occurredInRange("2026-03-08T05:00:00.000Z", yesterday, true), false);
  assert.equal(occurredInRange("2026-03-07T05:00:00.000Z", yesterday, true), true);
});

test("event titles stay human-readable", () => {
  assert.equal(changeLogEventTitle({ eventType: "recruit_created", fieldLabel: null }), "Recruit added to the system");
  assert.equal(changeLogEventTitle({ eventType: "field_updated", fieldLabel: "UTR" }), "UTR updated");
});

test("search matches recruit, title, field, and summary only", () => {
  const row = event({ id: "1", occurredAt: "2026-08-01T12:00:00.000Z" });
  assert.equal(changeLogMatchesQuery(row, "ada"), true);
  assert.equal(changeLogMatchesQuery(row, "UTR"), true);
  assert.equal(changeLogMatchesQuery(row, "10.3"), true);
  assert.equal(changeLogMatchesQuery(row, "password"), false);
});

test("summaries and dashboard rows use real events and cap at five", () => {
  const rows = [
    event({ id: "a", occurredAt: "2026-08-27T12:00:00.000Z", category: "rankings" }),
    event({ id: "b", occurredAt: "2026-08-27T11:00:00.000Z", category: "recruiting" }),
    event({ id: "c", occurredAt: "2026-08-20T12:00:00.000Z", category: "profile" }),
    event({ id: "d", occurredAt: "2026-08-19T12:00:00.000Z" }),
    event({ id: "e", occurredAt: "2026-08-18T12:00:00.000Z" }),
    event({ id: "f", occurredAt: "2026-08-17T12:00:00.000Z" }),
  ];
  const now = new Date("2026-08-27T18:00:00.000Z");
  const card = recruitCardChangeLogSummaries(rows, now);
  assert.equal(card.updatesThisMonth, 6);
  assert.ok(card.rankingChanges >= 1);
  const central = centralChangeLogSummaries(rows, now);
  assert.equal(central.updatesToday, 2);
  assert.deepEqual(
    dashboardRecentChangeLogs(rows).map((item) => item.id),
    ["a", "b", "c", "d", "e"],
  );
});

test("Log is the final recruit workspace and existing order is unchanged", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/features/recruiting/components/RecruitingPersonWorkspace.tsx"),
    "utf8",
  );
  const start = source.indexOf("const workspaceItems");
  const ids = [...source.slice(start, start + 4200).matchAll(/id: "([^"]+)"/g)].map((match) => match[1]).slice(0, 8);
  assert.deepEqual(ids, [
    "personal-info",
    "academics",
    "rankings",
    "analytics",
    "visit",
    "notes",
    "communications",
    "log",
  ]);
  assert.match(source, /RecruitingChangeLogWorkspace events=\{changeLogEvents\}/);
  assert.match(source, /id: "log"/);
  assert.equal(ids[ids.length - 1], "log");
});

test("central Log route, dashboard card, and migration stay read-only", () => {
  const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0029_recruit_change_log.sql"), "utf8");
  const nav = readFileSync(path.join(process.cwd(), "src/components/nav-items.ts"), "utf8");
  const dashboard = readFileSync(
    path.join(process.cwd(), "src/features/recruiting/components/RecruitingDashboard.tsx"),
    "utf8",
  );
  const page = readFileSync(path.join(process.cwd(), "src/app/recruiting/log/page.tsx"), "utf8");
  assert.match(sql, /create table if not exists public\.recruit_change_log/);
  assert.match(sql, /for select to authenticated/);
  assert.doesNotMatch(sql, /for insert to authenticated/);
  assert.doesNotMatch(sql, /for update to authenticated/);
  assert.doesNotMatch(sql, /for delete to authenticated/);
  assert.match(sql, /grant select on table public\.recruit_change_log to authenticated/);
  assert.doesNotMatch(sql, /grant insert on table public\.recruit_change_log to authenticated/);
  assert.match(sql, /trg_recruit_change_log_profile_insert/);
  assert.match(sql, /Recruit added to the system/);
  assert.doesNotMatch(sql, /password|refresh_token|message_body/);
  assert.match(nav, /label: "Log", href: RECRUITING_LOG_ROUTE/);
  assert.match(dashboard, /Recent Updates/);
  assert.match(dashboard, /RECRUITING_LOG_ROUTE/);
  assert.match(dashboard, /DashboardChangeLogRows/);
  assert.match(dashboard, /tone="teal"/);
  assert.match(page, /RecruitingChangeLogPage/);
  assert.match(sql, /utr/);
  assert.match(sql, /wtn/);
  assert.match(sql, /trn_rank/);
  assert.match(sql, /schools_of_interest/);
  assert.match(sql, /academic_interests/);
  assert.match(sql, /pipeline_stage_id/);
});
