import { doublesPairKey } from "./resolvePlayers";
import type {
  MatchDoublesPair,
  MatchEvent,
  MatchEventStatus,
  MatchEventType,
  MatchImportBatch,
  MatchResult,
  MatchResultStatus,
  MatchSeasonSegment,
  MatchSite,
  MatchScoringFormat,
  ScheduleEventSnapshot,
  ScheduleUnlinkedReason,
  ScoreSet,
  TeamOutcome,
  TeamPointSide,
  WinnerSide,
  MatchDiscipline,
  MatchResultKind,
} from "./types";

export type MatchEventRow = {
  id: string;
  event_type: string;
  title: string;
  opposing_team_name: string | null;
  season_year: number;
  season_segment: string | null;
  start_date: string;
  end_date: string | null;
  site: string | null;
  location_text: string | null;
  venue_name: string | null;
  status: string;
  scoring_format: string | null;
  reported_team_score_denison: number | null;
  reported_team_score_opponent: number | null;
  calculated_team_score_denison: number | null;
  calculated_team_score_opponent: number | null;
  team_outcome: string | null;
  team_score_discrepancy: boolean;
  schedule_event_id: string | null;
  schedule_snapshot: ScheduleEventSnapshot | null;
  schedule_unlinked_reason: string | null;
  results_marked_complete_at: string | null;
  results_marked_complete_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchResultRow = {
  id: string;
  event_id: string;
  discipline: string;
  result_kind: string;
  lineup_position: number | null;
  draw_name: string | null;
  flight_name: string | null;
  division_name: string | null;
  round_label: string | null;
  match_date: string | null;
  status: string;
  winner_side: string | null;
  score_text: string | null;
  score_sets: ScoreSet[] | null;
  original_score_text: string | null;
  source_excerpt: string | null;
  notes: string | null;
  denison_player_a_id: string | null;
  denison_player_b_id: string | null;
  doubles_pair_id: string | null;
  opponent_player_a_name: string | null;
  opponent_player_b_name: string | null;
  opponent_school: string | null;
  counts_toward_team_point: boolean;
  team_point_awarded_to: string | null;
  import_fingerprint: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchDoublesPairRow = {
  id: string;
  player_a_id: string;
  player_b_id: string;
  pair_key: string;
  created_at: string;
};

export type MatchImportBatchRow = {
  id: string;
  event_id: string | null;
  event_type: string | null;
  schedule_event_id: string | null;
  detection_method: string;
  source_text: string;
  draft_json: unknown;
  status: string;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToMatchEvent(row: MatchEventRow): MatchEvent {
  return {
    id: row.id,
    eventType: row.event_type as MatchEventType,
    title: row.title,
    opposingTeamName: row.opposing_team_name,
    seasonYear: row.season_year,
    seasonSegment: row.season_segment as MatchSeasonSegment | null,
    startDate: row.start_date,
    endDate: row.end_date,
    site: row.site as MatchSite | null,
    locationText: row.location_text,
    venueName: row.venue_name,
    status: row.status as MatchEventStatus,
    scoringFormat: row.scoring_format as MatchScoringFormat | null,
    reportedTeamScoreDenison: row.reported_team_score_denison,
    reportedTeamScoreOpponent: row.reported_team_score_opponent,
    calculatedTeamScoreDenison: row.calculated_team_score_denison,
    calculatedTeamScoreOpponent: row.calculated_team_score_opponent,
    teamOutcome: row.team_outcome as TeamOutcome | null,
    teamScoreDiscrepancy: Boolean(row.team_score_discrepancy),
    scheduleEventId: row.schedule_event_id,
    scheduleSnapshot: row.schedule_snapshot ?? null,
    scheduleUnlinkedReason: (row.schedule_unlinked_reason as ScheduleUnlinkedReason | null) ?? null,
    resultsMarkedCompleteAt: row.results_marked_complete_at ?? null,
    resultsMarkedCompleteBy: row.results_marked_complete_by ?? null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function matchEventToRow(
  event: Omit<MatchEvent, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Partial<MatchEventRow> {
  return {
    ...(event.id ? { id: event.id } : {}),
    event_type: event.eventType,
    title: event.title,
    opposing_team_name: event.opposingTeamName,
    season_year: event.seasonYear,
    season_segment: event.seasonSegment,
    start_date: event.startDate,
    end_date: event.endDate,
    site: event.site,
    location_text: event.locationText,
    venue_name: event.venueName,
    status: event.status,
    scoring_format: event.scoringFormat,
    reported_team_score_denison: event.reportedTeamScoreDenison,
    reported_team_score_opponent: event.reportedTeamScoreOpponent,
    calculated_team_score_denison: event.calculatedTeamScoreDenison,
    calculated_team_score_opponent: event.calculatedTeamScoreOpponent,
    team_outcome: event.teamOutcome,
    team_score_discrepancy: event.teamScoreDiscrepancy,
    schedule_event_id: event.scheduleEventId,
    schedule_snapshot: event.scheduleSnapshot,
    schedule_unlinked_reason: event.scheduleUnlinkedReason,
    results_marked_complete_at: event.resultsMarkedCompleteAt,
    results_marked_complete_by: event.resultsMarkedCompleteBy,
    notes: event.notes,
    updated_at: new Date().toISOString(),
  };
}

export function rowToMatchResult(row: MatchResultRow): MatchResult {
  return {
    id: row.id,
    eventId: row.event_id,
    discipline: row.discipline as MatchDiscipline,
    resultKind: row.result_kind as MatchResultKind,
    lineupPosition: row.lineup_position,
    drawName: row.draw_name,
    flightName: row.flight_name,
    divisionName: row.division_name,
    roundLabel: row.round_label,
    matchDate: row.match_date,
    status: row.status as MatchResultStatus,
    winnerSide: row.winner_side as WinnerSide | null,
    scoreText: row.score_text,
    scoreSets: Array.isArray(row.score_sets) ? row.score_sets : [],
    originalScoreText: row.original_score_text,
    sourceExcerpt: row.source_excerpt,
    notes: row.notes,
    denisonPlayerAId: row.denison_player_a_id,
    denisonPlayerBId: row.denison_player_b_id,
    doublesPairId: row.doubles_pair_id,
    opponentPlayerAName: row.opponent_player_a_name,
    opponentPlayerBName: row.opponent_player_b_name,
    opponentSchool: row.opponent_school,
    countsTowardTeamPoint: Boolean(row.counts_toward_team_point),
    teamPointAwardedTo: row.team_point_awarded_to as TeamPointSide | null,
    importFingerprint: row.import_fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function matchResultToRow(
  result: Omit<MatchResult, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Partial<MatchResultRow> {
  return {
    ...(result.id ? { id: result.id } : {}),
    event_id: result.eventId,
    discipline: result.discipline,
    result_kind: result.resultKind,
    lineup_position: result.lineupPosition,
    draw_name: result.drawName,
    flight_name: result.flightName,
    division_name: result.divisionName,
    round_label: result.roundLabel,
    match_date: result.matchDate,
    status: result.status,
    winner_side: result.winnerSide,
    score_text: result.scoreText,
    score_sets: result.scoreSets,
    original_score_text: result.originalScoreText,
    source_excerpt: result.sourceExcerpt,
    notes: result.notes,
    denison_player_a_id: result.denisonPlayerAId,
    denison_player_b_id: result.denisonPlayerBId,
    doubles_pair_id: result.doublesPairId,
    opponent_player_a_name: result.opponentPlayerAName,
    opponent_player_b_name: result.opponentPlayerBName,
    opponent_school: result.opponentSchool,
    counts_toward_team_point: result.countsTowardTeamPoint,
    team_point_awarded_to: result.teamPointAwardedTo,
    import_fingerprint: result.importFingerprint,
    updated_at: new Date().toISOString(),
  };
}

export function rowToDoublesPair(row: MatchDoublesPairRow): MatchDoublesPair {
  return {
    id: row.id,
    playerAId: row.player_a_id,
    playerBId: row.player_b_id,
    pairKey: row.pair_key,
    createdAt: row.created_at,
  };
}

export function ensureOrderedPairIds(a: string, b: string): { playerAId: string; playerBId: string; pairKey: string } {
  const pairKey = doublesPairKey(a, b);
  const [playerAId, playerBId] = pairKey.split(":") as [string, string];
  return { playerAId, playerBId, pairKey };
}

export function rowToImportBatch(row: MatchImportBatchRow): MatchImportBatch {
  return {
    id: row.id,
    eventId: row.event_id,
    eventType: row.event_type as MatchEvent["eventType"] | null,
    scheduleEventId: row.schedule_event_id ?? null,
    detectionMethod: row.detection_method as MatchImportBatch["detectionMethod"],
    sourceText: row.source_text,
    draftJson: row.draft_json,
    status: row.status as MatchImportBatch["status"],
    errorMessage: row.error_message,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
