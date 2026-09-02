import type { TeamScheduleEvent } from "./types";

/** In-memory 2026–27 schedule mirror of migration seed for tests. */
export const SEED_2026_27: TeamScheduleEvent[] = [
  ev("hp", { eventType: "non_team_event", eventName: "Hotel Planner Tournament", startDate: "2026-09-05", endDate: "2026-09-07", timeText: "All Day", city: "Granville", state: "OH", locationText: "Granville, OH", siteDesignation: "home", seasonSegment: "fall", countsAsCompetitionDate: false, competitionDateNumber: null, competitionDateGroup: null, notes: "Non-Team Sanctioned Event — does not count toward team record", sortOrder: 10 }),
  ev("di", { eventType: "tournament", eventName: "Denison Invite", competitionDateNumber: 1, competitionDateGroup: "1", startDate: "2026-09-18", endDate: "2026-09-20", timeText: "All Day", city: "Granville", state: "OH", locationText: "Granville, OH", siteDesignation: "home", seasonSegment: "fall", teamsInEvent: "CWRU, Kenyon, Carnegie Mellon", notes: "Hosted invite tournament", sortOrder: 20 }),
  ev("ita", { eventType: "tournament", eventName: "ITA Regionals", competitionDateNumber: 2, competitionDateGroup: "2", startDate: "2026-10-02", endDate: "2026-10-05", timeText: "All Day", venueName: "North Central HS", city: "Indianapolis", state: "IN", locationText: "North Central HS — Indianapolis, IN", siteDesignation: "neutral", travelRequired: true, seasonSegment: "fall", sortOrder: 30 }),
  ev("bri", { eventType: "tournament", eventName: "Big Red Invite", competitionDateNumber: 2, competitionDateGroup: "2", startDate: "2026-10-02", endDate: "2026-10-05", timeText: "All Day", city: "Granville", state: "OH", locationText: "Granville, OH", siteDesignation: "home", seasonSegment: "fall", notes: "Simultaneous with ITA Regionals — counts as 1 date (#2)", sortOrder: 40 }),
  ev("ski", { eventType: "tournament", eventName: "Skidmore Invite", competitionDateNumber: 3, competitionDateGroup: "3", startDate: "2026-10-10", endDate: "2026-10-11", timeText: "All Day", city: "Saratoga Springs", state: "NY", locationText: "Saratoga Springs, NY", siteDesignation: "away", travelRequired: true, seasonSegment: "fall", sortOrder: 50 }),
  ev("wau", { eventType: "team_match", opponentName: "Wash U", itaRank: 13, competitionDateNumber: 4, competitionDateGroup: "4", startDate: "2027-02-13", endDate: "2027-02-13", timeText: "TBD", venueName: "Indianapolis Racquet Club", locationText: "Indianapolis Racquet Club", siteDesignation: "neutral", seasonSegment: "spring", status: "tentative", doubleheaderStatus: "potential", sortOrder: 60 }),
  ev("in1", { eventType: "tournament", eventName: "ITA Indoors #1", competitionDateNumber: 5, competitionDateGroup: "5", startDate: "2027-02-26", endDate: "2027-02-26", timeText: "TBD", venueName: "Farm & Forge Club", city: "Nashville", state: "TN", locationText: "Farm & Forge Club, Nashville, TN", siteDesignation: "neutral", travelRequired: true, seasonSegment: "spring", notes: "ITA Indoors", sortOrder: 70 }),
  ev("in2", { eventType: "tournament", eventName: "ITA Indoors #2", competitionDateNumber: 6, competitionDateGroup: "6", startDate: "2027-02-27", endDate: "2027-02-27", timeText: "TBD", venueName: "Farm & Forge Club", city: "Nashville", state: "TN", locationText: "Farm & Forge Club, Nashville, TN", siteDesignation: "neutral", travelRequired: true, seasonSegment: "spring", notes: "ITA Indoors", sortOrder: 80 }),
  ev("in3", { eventType: "tournament", eventName: "ITA Indoors #3", competitionDateNumber: 7, competitionDateGroup: "7", startDate: "2027-02-28", endDate: "2027-02-28", timeText: "TBD", venueName: "Farm & Forge Club", city: "Nashville", state: "TN", locationText: "Farm & Forge Club, Nashville, TN", siteDesignation: "neutral", travelRequired: true, seasonSegment: "spring", notes: "ITA Indoors", sortOrder: 90 }),
  ev("dep", { eventType: "team_match", opponentName: "DePauw", itaRank: 30, competitionDateNumber: 8, competitionDateGroup: "8", startDate: "2027-03-06", endDate: "2027-03-06", timeText: "10:00 AM", city: "Granville", state: "OH", locationText: "Granville, OH", siteDesignation: "home", ncac: true, seasonSegment: "spring", doubleheaderStatus: "potential", notes: "NCAC Schedule Change — original date moved", sortOrder: 100 }),
  ev("sb", { eventType: "team_match_placeholder", eventName: "Spring Break #1", competitionDateNumber: 9, competitionDateGroup: "9", startDate: "2027-03-13", endDate: "2027-03-21", timeText: "TBD", locationText: "TBD", siteDesignation: "away", travelRequired: true, seasonSegment: "spring", status: "tentative", notes: "Travel match TBD — target opponents Sewanee or Kalamazoo", sortOrder: 110 }),
  ev("cwr", { eventType: "team_match", opponentName: "CWRU", itaRank: 5, competitionDateNumber: 10, competitionDateGroup: "10", startDate: "2027-03-26", endDate: "2027-03-26", timeText: "1:00 PM", venueName: "College of Wooster facilities", city: "Wooster", state: "OH", locationText: "Wooster, OH", siteDesignation: "neutral", seasonSegment: "spring", doubleheaderStatus: "potential", officialsNeeded: 2, notes: "Played at College of Wooster facilities", sortOrder: 120 }),
  ev("woo", { eventType: "team_match", opponentName: "Wooster", competitionDateNumber: 11, competitionDateGroup: "11", startDate: "2027-03-27", endDate: "2027-03-27", timeText: "TBD", city: "Wooster", state: "OH", locationText: "Wooster, OH", siteDesignation: "away", ncac: true, seasonSegment: "spring", status: "tentative", doubleheaderStatus: "potential", notes: "Back-to-back with CWRU (March 26) in Wooster", sortOrder: 130 }),
  ev("owu", { eventType: "team_match", opponentName: "OWU", competitionDateNumber: 12, competitionDateGroup: "12", startDate: "2027-04-03", endDate: "2027-04-03", timeText: "10:00 AM", city: "Delaware", state: "OH", locationText: "Delaware, OH", siteDesignation: "away", ncac: true, seasonSegment: "spring", doubleheaderStatus: "confirmed", notes: "NCAC Schedule Change — same countable date as Kenyon (#12)", sortOrder: 140 }),
  ev("ken", { eventType: "team_match", opponentName: "Kenyon", itaRank: 11, competitionDateNumber: 12, competitionDateGroup: "12", startDate: "2027-04-03", endDate: "2027-04-03", timeText: "3:00 PM", city: "Granville", state: "OH", locationText: "Granville, OH", siteDesignation: "home", ncac: true, seasonSegment: "spring", doubleheaderStatus: "confirmed", notes: "NCAC Schedule Change — doubleheader with OWU on same countable date", sortOrder: 150 }),
  ev("obe", { eventType: "team_match", opponentName: "Oberlin", itaRank: 34, competitionDateNumber: 13, competitionDateGroup: "13", startDate: "2027-04-09", endDate: "2027-04-09", timeText: "4:00 PM", city: "Oberlin", state: "OH", locationText: "Oberlin, OH", siteDesignation: "away", ncac: true, seasonSegment: "spring", doubleheaderStatus: "potential", notes: "NCAC Schedule Change", sortOrder: 160 }),
  ev("bra", { eventType: "team_match", opponentName: "Brandeis", eventName: "The Ohio Cup", itaRank: 18, competitionDateNumber: 14, competitionDateGroup: "14", startDate: "2027-04-10", endDate: "2027-04-10", timeText: "TBD", venueName: "Mayfield Racquet Club", city: "Cleveland", state: "OH", locationText: "Mayfield Racquet Club, Cleveland, OH", siteDesignation: "neutral", seasonSegment: "spring", notes: "Part of The Ohio Cup event", sortOrder: 170 }),
  ev("tuf", { eventType: "team_match", opponentName: "Tufts", eventName: "The Ohio Cup", itaRank: 3, competitionDateNumber: 15, competitionDateGroup: "15", startDate: "2027-04-11", endDate: "2027-04-11", timeText: "TBD", venueName: "Mayfield Racquet Club", city: "Cleveland", state: "OH", locationText: "Mayfield Racquet Club, Cleveland, OH", siteDesignation: "neutral", seasonSegment: "spring", notes: "Part of The Ohio Cup event", sortOrder: 180 }),
  ev("jcu", { eventType: "team_match", opponentName: "John Carroll", competitionDateNumber: 15, competitionDateGroup: "15", startDate: "2027-04-11", endDate: "2027-04-11", timeText: "3:30 PM", city: "Granville", state: "OH", locationText: "Granville, OH", siteDesignation: "home", ncac: true, seasonSegment: "spring", doubleheaderStatus: "confirmed", notes: "Doubleheader companion on same countable date as Tufts (#15)", sortOrder: 190 }),
  ev("cmu", { eventType: "team_match", opponentName: "Carnegie Mellon", itaRank: 10, competitionDateNumber: 16, competitionDateGroup: "16", startDate: "2027-04-15", endDate: "2027-04-15", timeText: "12:00 PM", city: "Granville", state: "OH", locationText: "Granville, OH", siteDesignation: "home", seasonSegment: "spring", doubleheaderStatus: "potential", officialsNeeded: 2, notes: "Thursday match — doubleheader opportunity", sortOrder: 200 }),
  ev("wab", { eventType: "team_match", opponentName: "Wabash", competitionDateNumber: 17, competitionDateGroup: "17", startDate: "2027-04-17", endDate: "2027-04-17", timeText: "1:00 PM", city: "Crawfordsville", state: "IN", locationText: "Crawfordsville, IN", siteDesignation: "away", ncac: true, seasonSegment: "spring", status: "tentative", sortOrder: 210 }),
  ev("wit", { eventType: "team_match", opponentName: "Wittenberg", competitionDateNumber: 18, competitionDateGroup: "18", startDate: "2027-04-18", endDate: "2027-04-18", timeText: "1:00 PM", city: "Springfield", state: "OH", locationText: "Springfield, OH", siteDesignation: "away", ncac: true, seasonSegment: "spring", status: "tentative", doubleheaderStatus: "potential", sortOrder: 220 }),
  ev("mw", { eventType: "team_match", opponentName: "Mary Washington", itaRank: 17, competitionDateNumber: 19, competitionDateGroup: "19", startDate: "2027-04-24", endDate: "2027-04-24", timeText: "1:00 PM", city: "Fredericksburg", state: "VA", locationText: "Fredericksburg, VA", siteDesignation: "away", travelRequired: true, seasonSegment: "spring", notes: "Road weekend in Fredericksburg, VA", sortOrder: 230 }),
  ev("tri", { eventType: "team_match", opponentName: "Trinity (TX)", itaRank: 16, competitionDateNumber: 20, competitionDateGroup: "20", startDate: "2027-04-25", endDate: "2027-04-25", timeText: "10:00 AM", city: "Fredericksburg", state: "VA", locationText: "Fredericksburg, VA", siteDesignation: "neutral", travelRequired: true, seasonSegment: "spring", notes: "Road weekend in Fredericksburg, VA — Sunday match", sortOrder: 240 }),
];

function ev(id: string, partial: Partial<TeamScheduleEvent>): TeamScheduleEvent {
  return {
    id: `seed-${id}`,
    seasonYear: 2027,
    competitionDateNumber: partial.competitionDateNumber ?? null,
    competitionDateGroup: partial.competitionDateGroup ?? (partial.competitionDateNumber != null ? String(partial.competitionDateNumber) : null),
    eventType: partial.eventType ?? "team_match",
    opponentName: partial.opponentName ?? null,
    eventName: partial.eventName ?? null,
    itaRank: partial.itaRank ?? null,
    startDate: partial.startDate ?? "2027-01-01",
    endDate: partial.endDate ?? partial.startDate ?? "2027-01-01",
    timeText: partial.timeText ?? null,
    venueName: partial.venueName ?? null,
    city: partial.city ?? null,
    state: partial.state ?? null,
    locationText: partial.locationText ?? null,
    siteDesignation: partial.siteDesignation ?? "neutral",
    travelRequired: partial.travelRequired ?? false,
    ncac: partial.ncac ?? false,
    seasonSegment: partial.seasonSegment ?? "spring",
    status: partial.status ?? "confirmed",
    doubleheaderStatus: partial.doubleheaderStatus ?? "none",
    officialsNeeded: partial.officialsNeeded ?? null,
    teamsInEvent: partial.teamsInEvent ?? null,
    countsAsCompetitionDate: partial.countsAsCompetitionDate ?? true,
    notes: partial.notes ?? null,
    sortOrder: partial.sortOrder ?? 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

export const DEFAULT_SEASON_YEAR = 2027;
