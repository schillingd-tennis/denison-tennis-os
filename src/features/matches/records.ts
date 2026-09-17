import { applyResultToRecord, EMPTY_RECORD, recordsReconcile } from "./scoringRules";
import { doublesPairKey } from "./resolvePlayers";
import type {
  DoublesPairRecord,
  MatchEvent,
  MatchResult,
  PlayerDoublesRecord,
  PlayerSinglesRecord,
  TeamSeasonRecord,
  WinLossRecord,
} from "./types";

function eventTypeFor(
  eventId: string,
  eventsById: Map<string, MatchEvent>,
): "dual" | "tournament" | null {
  return eventsById.get(eventId)?.eventType ?? null;
}

export function buildTeamSeasonRecords(events: readonly MatchEvent[]): TeamSeasonRecord[] {
  const bySeason = new Map<number, TeamSeasonRecord>();
  for (const event of events) {
    if (event.eventType !== "dual") continue;
    if (event.teamOutcome == null) continue;
    const row = bySeason.get(event.seasonYear) ?? {
      seasonYear: event.seasonYear,
      wins: 0,
      losses: 0,
      ties: 0,
    };
    if (event.teamOutcome === "win") row.wins += 1;
    else if (event.teamOutcome === "loss") row.losses += 1;
    else row.ties += 1;
    bySeason.set(event.seasonYear, row);
  }
  return [...bySeason.values()].sort((a, b) => b.seasonYear - a.seasonYear);
}

export function buildSinglesPlayerRecords(
  results: readonly MatchResult[],
  events: readonly MatchEvent[],
  options?: { seasonYear?: number | null; eventType?: "dual" | "tournament" | "all" },
): PlayerSinglesRecord[] {
  const eventsById = new Map(events.map((e) => [e.id, e]));
  const byPlayer = new Map<string, PlayerSinglesRecord>();

  function ensure(playerId: string): PlayerSinglesRecord {
    const existing = byPlayer.get(playerId);
    if (existing) return existing;
    const created: PlayerSinglesRecord = {
      playerId,
      ...EMPTY_RECORD(),
      dual: EMPTY_RECORD(),
      tournament: EMPTY_RECORD(),
    };
    byPlayer.set(playerId, created);
    return created;
  }

  for (const result of results) {
    if (result.discipline !== "singles") continue;
    const event = eventsById.get(result.eventId);
    if (!event) continue;
    if (options?.seasonYear != null && event.seasonYear !== options.seasonYear) continue;
    const et = event.eventType;
    if (options?.eventType && options.eventType !== "all" && et !== options.eventType) continue;
    const playerId = result.denisonPlayerAId;
    if (!playerId) continue;

    const row = ensure(playerId);
    applyResultToRecord(row, result.status, result.winnerSide);
    if (et === "dual") applyResultToRecord(row.dual, result.status, result.winnerSide);
    else applyResultToRecord(row.tournament, result.status, result.winnerSide);
  }

  return [...byPlayer.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

export function buildDoublesPlayerRecords(
  results: readonly MatchResult[],
  events: readonly MatchEvent[],
  options?: { seasonYear?: number | null; eventType?: "dual" | "tournament" | "all" },
): PlayerDoublesRecord[] {
  const eventsById = new Map(events.map((e) => [e.id, e]));
  const byPlayer = new Map<string, PlayerDoublesRecord>();

  function ensure(playerId: string): PlayerDoublesRecord {
    const existing = byPlayer.get(playerId);
    if (existing) return existing;
    const created: PlayerDoublesRecord = {
      playerId,
      ...EMPTY_RECORD(),
      dual: EMPTY_RECORD(),
      tournament: EMPTY_RECORD(),
    };
    byPlayer.set(playerId, created);
    return created;
  }

  for (const result of results) {
    if (result.discipline !== "doubles") continue;
    const event = eventsById.get(result.eventId);
    if (!event) continue;
    if (options?.seasonYear != null && event.seasonYear !== options.seasonYear) continue;
    if (
      options?.eventType &&
      options.eventType !== "all" &&
      event.eventType !== options.eventType
    ) {
      continue;
    }
    const playerIds = [result.denisonPlayerAId, result.denisonPlayerBId].filter(
      (id): id is string => Boolean(id),
    );
    for (const playerId of playerIds) {
      const row = ensure(playerId);
      applyResultToRecord(row, result.status, result.winnerSide);
      if (event.eventType === "dual") {
        applyResultToRecord(row.dual, result.status, result.winnerSide);
      } else {
        applyResultToRecord(row.tournament, result.status, result.winnerSide);
      }
    }
  }

  return [...byPlayer.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

export function buildDoublesPairRecords(
  results: readonly MatchResult[],
  events: readonly MatchEvent[],
  options?: { seasonYear?: number | null; eventType?: "dual" | "tournament" | "all" },
): DoublesPairRecord[] {
  const eventsById = new Map(events.map((e) => [e.id, e]));
  const byPair = new Map<string, DoublesPairRecord>();

  for (const result of results) {
    if (result.discipline !== "doubles") continue;
    if (!result.denisonPlayerAId || !result.denisonPlayerBId) continue;
    const event = eventsById.get(result.eventId);
    if (!event) continue;
    if (options?.seasonYear != null && event.seasonYear !== options.seasonYear) continue;
    if (
      options?.eventType &&
      options.eventType !== "all" &&
      event.eventType !== options.eventType
    ) {
      continue;
    }

    const pairKey = doublesPairKey(result.denisonPlayerAId, result.denisonPlayerBId);
    const [playerAId, playerBId] = pairKey.split(":") as [string, string];
    const row =
      byPair.get(pairKey) ??
      ({
        pairKey,
        playerAId,
        playerBId,
        ...EMPTY_RECORD(),
        dual: EMPTY_RECORD(),
        tournament: EMPTY_RECORD(),
      } satisfies DoublesPairRecord);

    applyResultToRecord(row, result.status, result.winnerSide);
    if (event.eventType === "dual") {
      applyResultToRecord(row.dual, result.status, result.winnerSide);
    } else {
      applyResultToRecord(row.tournament, result.status, result.winnerSide);
    }
    byPair.set(pairKey, row);
  }

  return [...byPair.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

/** Overall doubles once per match (pair perspective), not per player. */
export function buildOverallDoublesRecord(
  results: readonly MatchResult[],
  events: readonly MatchEvent[],
  options?: { seasonYear?: number | null; eventType?: "dual" | "tournament" | "all" },
): WinLossRecord {
  const eventsById = new Map(events.map((e) => [e.id, e]));
  const overall = EMPTY_RECORD();
  for (const result of results) {
    if (result.discipline !== "doubles") continue;
    const event = eventsById.get(result.eventId);
    if (!event) continue;
    if (options?.seasonYear != null && event.seasonYear !== options.seasonYear) continue;
    if (
      options?.eventType &&
      options.eventType !== "all" &&
      event.eventType !== options.eventType
    ) {
      continue;
    }
    applyResultToRecord(overall, result.status, result.winnerSide);
  }
  return overall;
}

export function assertSubtotalsReconcile(
  results: readonly MatchResult[],
  events: readonly MatchEvent[],
): { ok: true } | { ok: false; detail: string } {
  const singles = buildSinglesPlayerRecords(results, events);
  for (const row of singles) {
    if (!recordsReconcile(row, row.dual, row.tournament)) {
      return { ok: false, detail: `Singles subtotals drift for ${row.playerId}` };
    }
  }
  const doublesPlayers = buildDoublesPlayerRecords(results, events);
  for (const row of doublesPlayers) {
    if (!recordsReconcile(row, row.dual, row.tournament)) {
      return { ok: false, detail: `Doubles-player subtotals drift for ${row.playerId}` };
    }
  }
  const pairs = buildDoublesPairRecords(results, events);
  for (const row of pairs) {
    if (!recordsReconcile(row, row.dual, row.tournament)) {
      return { ok: false, detail: `Doubles-pair subtotals drift for ${row.pairKey}` };
    }
  }
  void eventTypeFor;
  return { ok: true };
}

export function playerDoublesHistory(
  results: readonly MatchResult[],
  events: readonly MatchEvent[],
  playerId: string,
): Array<MatchResult & { event: MatchEvent; partnerId: string | null }> {
  const eventsById = new Map(events.map((e) => [e.id, e]));
  const rows: Array<MatchResult & { event: MatchEvent; partnerId: string | null }> = [];
  for (const result of results) {
    if (result.discipline !== "doubles") continue;
    const isA = result.denisonPlayerAId === playerId;
    const isB = result.denisonPlayerBId === playerId;
    if (!isA && !isB) continue;
    const event = eventsById.get(result.eventId);
    if (!event) continue;
    const partnerId = isA ? result.denisonPlayerBId : result.denisonPlayerAId;
    rows.push({ ...result, event, partnerId });
  }
  return rows.sort((a, b) => (b.matchDate ?? b.event.startDate).localeCompare(a.matchDate ?? a.event.startDate));
}

export function pairDoublesHistory(
  results: readonly MatchResult[],
  events: readonly MatchEvent[],
  pairKey: string,
): Array<MatchResult & { event: MatchEvent }> {
  const eventsById = new Map(events.map((e) => [e.id, e]));
  const rows: Array<MatchResult & { event: MatchEvent }> = [];
  for (const result of results) {
    if (result.discipline !== "doubles") continue;
    if (!result.denisonPlayerAId || !result.denisonPlayerBId) continue;
    if (doublesPairKey(result.denisonPlayerAId, result.denisonPlayerBId) !== pairKey) continue;
    const event = eventsById.get(result.eventId);
    if (!event) continue;
    rows.push({ ...result, event });
  }
  return rows.sort((a, b) => (b.matchDate ?? b.event.startDate).localeCompare(a.matchDate ?? a.event.startDate));
}

export function playerSinglesHistory(
  results: readonly MatchResult[],
  events: readonly MatchEvent[],
  playerId: string,
): Array<MatchResult & { event: MatchEvent }> {
  const eventsById = new Map(events.map((e) => [e.id, e]));
  return results
    .filter((r) => r.discipline === "singles" && r.denisonPlayerAId === playerId)
    .map((r) => {
      const event = eventsById.get(r.eventId);
      return event ? { ...r, event } : null;
    })
    .filter((row): row is MatchResult & { event: MatchEvent } => row != null)
    .sort((a, b) => (b.matchDate ?? b.event.startDate).localeCompare(a.matchDate ?? a.event.startDate));
}
