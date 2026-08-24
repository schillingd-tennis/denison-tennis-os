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
  denisonCommitSummary,
  recentInteractions,
  topRankedRecruits,
  upcomingTournaments,
  upcomingVisits,
} from "./dashboard";

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

  assert.match(page, /upcomingVisits=\{upcomingVisits\(directory\.rows\)\}/);
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
  const rightColIdx = ui.lastIndexOf("data-recruiting-dashboard-col");
  assert.ok(commitsIdx > rightColIdx && visitsIdx > commitsIdx);

  assert.match(personPage, /initialWorkspaceId=\{workspace\}/);
  assert.match(personWorkspace, /initialWorkspaceId \?\? "personal-info"/);
  assert.doesNotMatch(ui, /Jarren Griffini/);
  assert.doesNotMatch(ui, /Landon Marcus/);
});
