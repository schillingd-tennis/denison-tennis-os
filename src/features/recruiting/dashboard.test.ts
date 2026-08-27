import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { RecruitInteraction } from "@/features/interactions/types";
import type { Tournament } from "@/features/tournaments/types";

import type { DenisonCommitRecruit, RecruitDirectoryRow } from "./directory";
import {
  DASHBOARD_RECENT_INTERACTION_LIMIT,
  DASHBOARD_TOP_RANKED_LIMIT,
  DASHBOARD_UPCOMING_TOURNAMENT_LIMIT,
  DASHBOARD_UPCOMING_VISIT_LIMIT,
  activeRecruitCount,
  communicationAlertEligibleIds,
  dashboardCommunicationAlerts,
  dashboardKpis,
  dashboardNeedsAttentionCount,
  dashboardPriorities,
  denisonCommitSummary,
  newMessagesFromSync,
  pipelineSnapshot,
  recentInteractions,
  topRankedRecruits,
  upcomingTournaments,
  upcomingVisits,
  visitsNext30DaysCount,
} from "./dashboard";
import { RECRUIT_PIPELINE_KEYS } from "./lookupSeed";

const here = dirname(fileURLToPath(import.meta.url));

function interaction(partial: Partial<RecruitInteraction> & Pick<RecruitInteraction, "id" | "occurredAt">): RecruitInteraction {
  return {
    recruitPersonId: "p1",
    recruitName: "A Recruit",
    tournamentId: null,
    tournamentName: null,
    interactionType: "text",
    channel: null,
    direction: "outbound",
    participants: null,
    notes: null,
    nextSteps: null,
    loggedBy: null,
    sourceSystem: null,
    sourceKey: null,
    createdAt: partial.occurredAt,
    updatedAt: partial.occurredAt,
    ...partial,
  };
}

function tournament(partial: Partial<Tournament> & Pick<Tournament, "id" | "name">): Tournament {
  return {
    startDate: null,
    endDate: null,
    location: null,
    venue: null,
    surface: null,
    status: "planned",
    recruitingPlan: "considering",
    websiteUrl: null,
    notes: null,
    sourceKey: null,
    attended: null,
    level: null,
    entryType: null,
    lifecycleStatus: "upcoming",
    distanceFromColumbus: null,
    additionalNotes: null,
    recruitsAttendingText: null,
    estimatedDriveTime: null,
    travelMethod: null,
    departureDate: null,
    returnDate: null,
    hotelName: null,
    hotelAddress: null,
    hotelConfirmation: null,
    hotelCheckIn: null,
    hotelCheckOut: null,
    airport: null,
    flightInfo: null,
    rentalCar: null,
    drawsUrl: null,
    ustaUrl: null,
    scheduleUrl: null,
    resultsUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    linkedRecruits: [],
    ...partial,
  };
}

function row(partial: {
  id: string;
  name: string;
  coachRank?: number;
  classYear?: number;
  utr?: number;
  trnRank?: number;
  visitStartDate?: string;
  visitEndDate?: string;
  travelType?: string;
  pipelineKey?: string;
}): RecruitDirectoryRow {
  const [firstName, ...rest] = partial.name.split(" ");
  const lastName = rest.join(" ") || "Recruit";
  return {
    person: {
      id: partial.id,
      firstName: firstName ?? "A",
      lastName,
      utr: partial.utr,
      trnRank: partial.trnRank,
    } as RecruitDirectoryRow["person"],
    profile: {
      personId: partial.id,
      coachRank: partial.coachRank,
      recruitClassYear: partial.classYear,
      visitStartDate: partial.visitStartDate,
      visitEndDate: partial.visitEndDate,
      travelType: partial.travelType,
      pipelineStage: partial.pipelineKey
        ? { id: partial.pipelineKey, key: partial.pipelineKey, label: partial.pipelineKey }
        : undefined,
    } as RecruitDirectoryRow["profile"],
    analytics: { id: partial.id } as RecruitDirectoryRow["analytics"],
  };
}

test("recent interactions returns max 10 newest first", () => {
  const rows = Array.from({ length: 12 }, (_, index) =>
    interaction({
      id: `i-${index}`,
      occurredAt: `2026-08-${String(index + 10).padStart(2, "0")}T12:00:00.000Z`,
    }),
  );
  const recent = recentInteractions(rows);
  assert.equal(recent.length, DASHBOARD_RECENT_INTERACTION_LIMIT);
  assert.equal(recent[0]?.id, "i-11");
  assert.equal(recent[9]?.id, "i-2");
});

test("top ranked recruits uses coach rank, max 5, not UTR", () => {
  const ranked = topRankedRecruits([
    row({ id: "high-utr", name: "Zed High", coachRank: 4, utr: 13, classYear: 2027 }),
    row({ id: "one", name: "Ada One", coachRank: 1, utr: 10, classYear: 2027, trnRank: 42 }),
    row({ id: "unranked", name: "No Rank", utr: 14, classYear: 2027 }),
    row({ id: "two", name: "Bea Two", coachRank: 2, utr: 11, classYear: 2027 }),
    row({ id: "three", name: "Cara Three", coachRank: 3, classYear: 2028 }),
    row({ id: "five", name: "Eve Five", coachRank: 5, classYear: 2027 }),
    row({ id: "six", name: "Fay Six", coachRank: 6, classYear: 2027 }),
  ]);
  assert.equal(ranked.length, DASHBOARD_TOP_RANKED_LIMIT);
  assert.deepEqual(
    ranked.map((item) => item.personId),
    ["one", "two", "three", "high-utr", "five"],
  );
  assert.equal(ranked[0]?.coachRank, 1);
  assert.equal(ranked.some((item) => item.personId === "unranked"), false);
});

test("upcoming tournaments uses canonical schedule split and earliest first", () => {
  const upcoming = upcomingTournaments([
    tournament({ id: "past", name: "Past", startDate: "2026-01-01", lifecycleStatus: "past" }),
    tournament({ id: "later", name: "Later", startDate: "2026-10-01", lifecycleStatus: "upcoming" }),
    tournament({ id: "soon", name: "Soon", startDate: "2026-09-01", lifecycleStatus: "upcoming" }),
    tournament({ id: "mid", name: "Mid", startDate: "2026-09-15", lifecycleStatus: "upcoming" }),
    tournament({
      id: "extra1",
      name: "E1",
      startDate: "2026-11-01",
      lifecycleStatus: "upcoming",
    }),
    tournament({
      id: "extra2",
      name: "E2",
      startDate: "2026-12-01",
      lifecycleStatus: "upcoming",
    }),
    tournament({
      id: "extra3",
      name: "E3",
      startDate: "2027-01-01",
      lifecycleStatus: "upcoming",
    }),
  ]);
  assert.equal(upcoming.length, DASHBOARD_UPCOMING_TOURNAMENT_LIMIT);
  assert.deepEqual(
    upcoming.map((item) => item.id),
    ["soon", "mid", "later", "extra1", "extra2"],
  );
});

test("denison commit count matches the named commit records", () => {
  const commits: DenisonCommitRecruit[] = [
    { personId: "a", name: "Ada", classYear: 2027 },
    { personId: "b", name: "Bea", classYear: 2027 },
  ];
  const summary = denisonCommitSummary(commits);
  assert.equal(summary.count, summary.recruits.length);
  assert.deepEqual(
    summary.recruits.map((item) => item.personId),
    ["a", "b"],
  );
});

test("dashboard Denison Commits are Class of 2027 only", () => {
  const summary = denisonCommitSummary([
    { personId: "kaito", name: "Kaito Tokukura", classYear: 2027 },
    { personId: "yusaku", name: "Yusaku Fujii", classYear: 2027 },
    { personId: "jackson", name: "Jackson MacTaggart", classYear: 2026 },
    { personId: "other", name: "Other Commit", classYear: 2028 },
  ]);
  assert.equal(summary.count, 2);
  assert.deepEqual(
    summary.recruits.map((item) => item.name),
    ["Kaito Tokukura", "Yusaku Fujii"],
  );
  assert.equal(
    summary.recruits.some((item) => item.name === "Jackson MacTaggart"),
    false,
  );
  assert.equal(
    summary.recruits.every((item) => item.classYear === 2027),
    true,
  );
});

test("dashboard page stays on /recruiting and opens existing editors/workspaces", () => {
  const page = readFileSync(join(here, "../../app/recruiting/page.tsx"), "utf8");
  const nav = readFileSync(join(here, "../../components/nav-items.ts"), "utf8");
  const ui = readFileSync(join(here, "components/RecruitingDashboard.tsx"), "utf8");
  assert.match(page, /RecruitingDashboard/);
  assert.doesNotMatch(page, /<RecruitingDirectory/);
  assert.match(nav, /label: "Dashboard", href: RECRUITING_ROUTE/);
  assert.doesNotMatch(nav, /label: "Overview"/);
  assert.match(ui, /recruitingPersonPath\(interaction\.recruitPersonId\)/);
  assert.match(ui, /openInteraction\(interaction\)/);
  assert.match(ui, /recruitingPersonPath\(recruit\.personId\)/);
  assert.match(ui, /recruitingTournamentPath\(tournament\.id\)/);
  assert.match(ui, /writeStoredRecruitingDirectoryView\("rank"\)/);
  assert.match(ui, /RECRUITING_LIST_ROUTE/);
  assert.match(ui, /Recent Interactions/);
  assert.match(ui, /Top Ranked Recruits/);
  assert.match(ui, /Upcoming Tournaments/);
  assert.match(ui, /Denison Commits/);
  assert.match(ui, /\{commits\.length\}/);
  assert.match(ui, /data-recruiting-dashboard-grid/);
  assert.match(ui, /data-recruiting-dashboard-col/);
  assert.doesNotMatch(ui, /contents md:flex/);
  assert.doesNotMatch(ui, /Top Targets/);
  assert.doesNotMatch(ui, /Upcoming Events/);
  assert.match(page, /denisonCommitSummary\(directory\.denisonCommitRecruits\)/);
  assert.match(page, /commits=\{commits\.recruits\}/);
  assert.match(page, /dashboardKpis\(/);
  assert.match(page, /pipelineSnapshot\(directory\.rows\)/);
  assert.match(page, /recentChangeLogs=\{recentChangeLogs\}/);
  assert.match(page, /activeRecruitCount\(directory\.rows\)/);
  assert.match(ui, /Recent Updates/);
  assert.match(ui, /RECRUITING_LOG_ROUTE/);
  assert.match(ui, /DashboardChangeLogRows/);
  assert.match(ui, /tone="teal"/);
});

test("upcoming visits are max four, chronological by start, ending today or later", () => {
  const visits = upcomingVisits(
    [
      row({
        id: "past",
        name: "Past Visit",
        visitStartDate: "2026-08-01",
        visitEndDate: "2026-08-23",
      }),
      row({
        id: "fifth",
        name: "Fifth Later",
        visitStartDate: "2026-10-01",
        visitEndDate: "2026-10-02",
      }),
      row({
        id: "jarren",
        name: "Jarren Griffini",
        visitStartDate: "2026-09-01",
        visitEndDate: "2026-09-03",
        travelType: "Drive",
      }),
      row({
        id: "landon",
        name: "Landon Marcus",
        visitStartDate: "2026-08-25",
        visitEndDate: "2026-08-26",
        travelType: "Flight",
      }),
      row({
        id: "today",
        name: "Ends Today",
        visitStartDate: "2026-08-20",
        visitEndDate: "2026-08-24",
      }),
      row({
        id: "ongoing",
        name: "Already Here",
        visitStartDate: "2026-08-22",
        visitEndDate: "2026-08-28",
      }),
      row({ id: "none", name: "No Dates" }),
      row({
        id: "start-only",
        name: "Start Only",
        visitStartDate: "2026-09-10",
      }),
    ],
    { today: "2026-08-24" },
  );

  assert.equal(visits.length, DASHBOARD_UPCOMING_VISIT_LIMIT);
  assert.deepEqual(
    visits.map((visit) => visit.personId),
    ["today", "ongoing", "landon", "jarren"],
  );
  assert.equal(visits.some((visit) => visit.personId === "past"), false);
  assert.equal(visits.some((visit) => visit.personId === "fifth"), false);
  assert.equal(visits[2]?.name, "Landon Marcus");
  assert.equal(visits[2]?.dayCount, 2);
  assert.equal(visits[2]?.travelType, "Flight");
  assert.equal(visits[3]?.name, "Jarren Griffini");
  assert.equal(visits[3]?.dayCount, 3);
});

test("upcoming visits empty when none end today or later", () => {
  const visits = upcomingVisits(
    [
      row({
        id: "past",
        name: "Past Visit",
        visitStartDate: "2026-07-01",
        visitEndDate: "2026-07-03",
      }),
    ],
    { today: "2026-08-24" },
  );
  assert.deepEqual(visits, []);
});

test("Upcoming Visits card sits below Denison Commits and opens Visit AW", () => {
  const page = readFileSync(join(here, "../../app/recruiting/page.tsx"), "utf8");
  const ui = readFileSync(join(here, "components/RecruitingDashboard.tsx"), "utf8");
  const personPage = readFileSync(join(here, "../../app/recruiting/[id]/page.tsx"), "utf8");
  const personWorkspace = readFileSync(
    join(here, "components/RecruitingPersonWorkspace.tsx"),
    "utf8",
  );

  assert.match(page, /upcomingVisits=\{visits\}/);
  assert.match(ui, /title="Upcoming Visits"/);
  assert.match(ui, /meta="Next 4"/);
  assert.match(ui, /tone="blue"/);
  assert.match(ui, /monthDay\(visit\.visitStartDate\)/);
  assert.match(ui, /bg-info\/15 text-info/);
  assert.match(ui, /title="Upcoming Tournaments"[\s\S]*tone="orange"/);
  assert.match(ui, /No upcoming visits/);
  assert.match(ui, /recruitingPersonVisitPath\(visit\.personId\)/);
  assert.match(ui, /visitRangeLabel\(visit\.visitStartDate, visit\.visitEndDate\)/);
  assert.match(ui, /visitDaysLabel\(visit\.dayCount\)/);
  assert.match(ui, /visit\.travelType/);

  const commitsIdx = ui.indexOf('title="Denison Commits"');
  const visitsIdx = ui.indexOf('title="Upcoming Visits"');
  const pipelineIdx = ui.indexOf('title="Pipeline Snapshot"');
  const rightColIdx = ui.lastIndexOf("data-recruiting-dashboard-col");
  assert.ok(pipelineIdx > rightColIdx && visitsIdx > pipelineIdx && commitsIdx > visitsIdx);

  assert.match(personPage, /initialWorkspaceId=\{workspace\}/);
  assert.match(personWorkspace, /initialWorkspaceId \?\? "personal-info"/);
  assert.doesNotMatch(ui, /Jarren Griffini/);
  assert.doesNotMatch(ui, /Landon Marcus/);
});

test("command-center dashboard renders ten sections and keeps real selectors", () => {
  const page = readFileSync(join(here, "../../app/recruiting/page.tsx"), "utf8");
  const ui = readFileSync(join(here, "components/RecruitingDashboard.tsx"), "utf8");
  const kpis = readFileSync(join(here, "components/dashboard/RecruitingDashboardKpis.tsx"), "utf8");
  const layoutLock = readFileSync(join(here, "../../app/layout-lock.css"), "utf8");

  for (const section of [
    "kpis",
    "priorities",
    "recent-interactions",
    "upcoming-tournaments",
    "pipeline",
    "upcoming-visits",
    "recent-updates",
    "communication-alerts",
    "top-ranked",
    "denison-commits",
  ]) {
    assert.match(ui, new RegExp(`data-recruiting-dashboard-section="${section}"`));
  }

  assert.match(ui, /Your recruiting command center/);
  assert.match(ui, /Today's Recruiting Priorities/);
  assert.match(ui, /Pipeline Snapshot/);
  assert.match(ui, /Communication Alerts/);
  assert.match(ui, /Priority recommendations will appear here/);
  assert.match(ui, /Recruits needing a communication follow-up will appear here/);
  assert.match(kpis, /Active Recruits/);
  assert.match(kpis, /Needs Attention/);
  assert.match(kpis, /Visits Next 30 Days/);
  assert.match(kpis, /New Messages/);
  assert.match(ui, /Recent Updates/);
  assert.match(ui, /View all updates/);

  assert.match(page, /recentInteractions\(interactions\)/);
  assert.match(page, /topRankedRecruits\(directory\.rows\)/);
  assert.match(page, /upcomingTournaments\(tournaments\)/);
  assert.match(page, /upcomingVisits=\{visits\}/);
  assert.match(page, /visitsNext30DaysCount\(directory\.rows\)/);
  assert.match(ui, /recentInteractions\(interactions\)|recentInteractions\.map/);
  assert.doesNotMatch(ui, /contents md:flex/);
  assert.doesNotMatch(ui, /md:grid-cols-2/);
  assert.match(layoutLock, /\[data-recruiting-dashboard-grid\]/);
  assert.match(layoutLock, /minmax\(0, 3fr\) minmax\(0, 2fr\)/);
});

test("unsupported dashboard metrics stay placeholders instead of invented counts", () => {
  const kpis = dashboardKpis({
    activeRecruits: 12,
    needsAttention: 4,
    visitsNext30Days: 3,
    newTexts: null,
  });
  assert.equal(kpis.activeRecruits, 12);
  assert.equal(kpis.visitsNext30Days, 3);
  assert.equal(kpis.needsAttention, 4);
  assert.equal(kpis.newTexts, null);

  const stages = pipelineSnapshot([
    row({ id: "p", name: "Pat Potential", pipelineKey: RECRUIT_PIPELINE_KEYS.potential }),
    row({ id: "a", name: "Ava Active", pipelineKey: RECRUIT_PIPELINE_KEYS.active }),
    row({ id: "c", name: "Cam Committed", pipelineKey: RECRUIT_PIPELINE_KEYS.committed }),
  ]);
  assert.deepEqual(
    stages.map((stage) => [stage.id, stage.label, stage.count]),
    [
      ["potential", "Potential", 1],
      ["active", "Active Recruit", 1],
      ["offer", "Offer", null],
      ["committed", "Committed", 1],
    ],
  );
});

test("visits next 30 days counts overlapping stored visit dates only", () => {
  const count = visitsNext30DaysCount(
    [
      row({ id: "in-window", name: "Soon", visitStartDate: "2026-09-10", visitEndDate: "2026-09-12" }),
      row({ id: "ongoing", name: "Now", visitStartDate: "2026-08-20", visitEndDate: "2026-09-01" }),
      row({ id: "past", name: "Past", visitStartDate: "2026-08-01", visitEndDate: "2026-08-02" }),
      row({ id: "later", name: "Later", visitStartDate: "2026-10-15", visitEndDate: "2026-10-16" }),
      row({ id: "none", name: "None" }),
    ],
    "2026-08-24",
  );
  assert.equal(count, 2);
});

test("Active Recruits counts only the canonical active pipeline key", () => {
  const rows = [
    row({ id: "active", name: "Active One", pipelineKey: RECRUIT_PIPELINE_KEYS.active }),
    row({ id: "active-2", name: "Active Two", pipelineKey: RECRUIT_PIPELINE_KEYS.active }),
    row({ id: "potential", name: "Potential One", pipelineKey: RECRUIT_PIPELINE_KEYS.potential }),
    row({ id: "committed", name: "Committed One", pipelineKey: RECRUIT_PIPELINE_KEYS.committed }),
    row({ id: "closed", name: "Closed One", pipelineKey: RECRUIT_PIPELINE_KEYS.closed }),
    row({ id: "unknown", name: "Unknown One" }),
  ];
  assert.equal(activeRecruitCount(rows), 2);
  assert.equal(RECRUIT_PIPELINE_KEYS.active, "active");
});

test("Needs Attention and Communication Alerts share canonical follow-up results", () => {
  const now = new Date("2026-08-27T16:00:00.000Z");
  const eligible = communicationAlertEligibleIds([
    row({ id: "alex", name: "Alex One", classYear: 2027, coachRank: 1 }),
    row({ id: "blair", name: "Blair Two", classYear: 2027, coachRank: 2 }),
    row({ id: "casey", name: "Casey Three", classYear: 2028, coachRank: 1 }),
    row({ id: "drew", name: "Drew Four", classYear: 2027 }),
  ]);
  assert.deepEqual([...eligible].sort(), ["alex", "blair"]);

  const rows = [
    interaction({
      id: "alex-old",
      recruitPersonId: "alex",
      recruitName: "Alex One",
      occurredAt: "2026-08-16T12:00:00.000Z",
      interactionType: "text",
    }),
    interaction({
      id: "blair-ten",
      recruitPersonId: "blair",
      recruitName: "Blair Two",
      occurredAt: "2026-08-17T12:00:00.000Z",
      interactionType: "call",
    }),
    interaction({
      id: "casey-old",
      recruitPersonId: "casey",
      recruitName: "Casey Three",
      occurredAt: "2026-08-01T12:00:00.000Z",
      interactionType: "text",
    }),
    interaction({
      id: "drew-old",
      recruitPersonId: "drew",
      recruitName: "Drew Four",
      occurredAt: "2026-08-01T12:00:00.000Z",
      interactionType: "text",
    }),
  ];
  assert.equal(dashboardNeedsAttentionCount(rows, eligible, now), 1);
  assert.deepEqual(
    dashboardCommunicationAlerts(rows, eligible, now).map((item) => item.recruitPersonId),
    ["alex"],
  );
});

test("priorities deduplicate recruits and prefer communication overdue over visits", () => {
  const rows = [
    row({ id: "alex", name: "Alex One", classYear: 2027, coachRank: 1 }),
    row({ id: "blair", name: "Blair Two", classYear: 2027, coachRank: 2 }),
  ];
  const alerts = dashboardCommunicationAlerts(
    [
      interaction({
        id: "alex-old",
        recruitPersonId: "alex",
        recruitName: "Alex One",
        occurredAt: "2026-08-16T12:00:00.000Z",
        interactionType: "text",
      }),
    ],
    new Set(["alex"]),
    new Date("2026-08-27T16:00:00.000Z"),
  );
  const visits = upcomingVisits(
    [
      row({ id: "alex", name: "Alex One", visitStartDate: "2026-09-01", visitEndDate: "2026-09-02" }),
      row({ id: "blair", name: "Blair Two", visitStartDate: "2026-09-03", visitEndDate: "2026-09-04" }),
    ],
    { today: "2026-08-27" },
  );
  const items = dashboardPriorities({ alerts, visits, rows });
  assert.deepEqual(
    items.map((item) => [item.personId, item.reason]),
    [
      ["alex", "Needs a text or call"],
      ["blair", "Upcoming visit"],
    ],
  );
  assert.match(items[0]?.href ?? "", /workspace=communications/);
  assert.match(items[1]?.href ?? "", /workspace=visit/);
});

test("New Messages uses last completed import count or stays unavailable", () => {
  assert.equal(newMessagesFromSync({ lastCompletedWithImports: { importedCount: 4 } }), 4);
  assert.equal(newMessagesFromSync({ lastCompletedWithImports: { importedCount: 0 } }), 0);
  assert.equal(newMessagesFromSync({ lastCompletedWithImports: null }), null);
  assert.equal(newMessagesFromSync(null), null);
});
