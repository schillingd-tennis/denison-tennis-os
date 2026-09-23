"use server";

import { revalidatePath } from "next/cache";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import { listPeople } from "@/features/people/repository";
import { matchesEventPath, matchesPairPath, matchesPlayerPath, MATCHES_ROUTE } from "@/lib/module-routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteMatchResult, getMatchEvent, listMatchResults, saveMatchEvent, saveMatchResult } from "./repository";
import { doublesPairKey } from "./resolvePlayers";
import { calculateDualTeamScores, teamOutcomeFromScores } from "./scoringRules";
import { parseScoreSets, resultFingerprint } from "./scoreParse";
import { MATCH_RESULT_STATUSES, type MatchResultStatus, type WinnerSide } from "./types";

export async function correctPlayerMatchResultAction(input: {
  resultId: string;
  eventId: string;
  playerId: string;
  matchDate: string;
  opponentPlayerAName: string;
  opponentPlayerBName: string;
  opponentSchool: string;
  status: MatchResultStatus;
  winnerSide: WinnerSide | null;
  scoreText: string;
  partnerId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { ok: false, error: "Sign in to edit match results." };

    const event = await getMatchEvent(input.eventId);
    const existing = (await listMatchResults(input.eventId)).find((row) => row.id === input.resultId);
    if (!event || !existing ||
      (existing.denisonPlayerAId !== input.playerId && existing.denisonPlayerBId !== input.playerId)) {
      return { ok: false, error: "This player result was not found." };
    }

    const date = input.matchDate.trim();
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
    if (!parsedDate || Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date) {
      return { ok: false, error: "Enter a valid match date." };
    }
    if (!(MATCH_RESULT_STATUSES as readonly string[]).includes(input.status)) {
      return { ok: false, error: "Choose a valid result status." };
    }
    if (input.winnerSide !== null && !["denison", "opponent", "unknown"].includes(input.winnerSide)) {
      return { ok: false, error: "Choose a valid win/loss result." };
    }
    const winnerSide = ["bye", "cancelled", "unfinished"].includes(input.status) ? null : input.winnerSide;
    const opponentA = input.opponentPlayerAName.trim();
    const opponentB = input.opponentPlayerBName.trim();
    const opponentSchool = input.opponentSchool.trim();
    if ([opponentA, opponentB, opponentSchool, input.scoreText].some((value) => value.length > 500)) {
      return { ok: false, error: "A result field is too long." };
    }
    if (input.status === "completed" && !opponentA) {
      return { ok: false, error: "Enter the opponent's name." };
    }
    const rawScore = input.scoreText.trim();
    const parsedScore = rawScore ? parseScoreSets(rawScore) : { sets: [], scoreText: "" };
    if ("error" in parsedScore) return { ok: false, error: parsedScore.error };

    let playerAId = existing.denisonPlayerAId;
    let playerBId = existing.denisonPlayerBId;
    if (existing.discipline === "doubles") {
      if (!input.partnerId || input.partnerId === input.playerId) {
        return { ok: false, error: "Select a different Denison doubles partner." };
      }
      const currentPartner = existing.denisonPlayerAId === input.playerId
        ? existing.denisonPlayerBId : existing.denisonPlayerAId;
      if (input.partnerId !== currentPartner) {
        const people = await listPeople();
        const eligible = people.some((person) => person.id === input.partnerId &&
          person.role?.key === ROLE_KEYS.player && person.status?.key === STATUS_KEYS.current);
        if (!eligible) return { ok: false, error: "Select a current Denison player as partner." };
      }
      if (existing.denisonPlayerAId === input.playerId) playerBId = input.partnerId;
      else playerAId = input.partnerId;
    }

    const countsTowardTeamPoint = event.eventType === "dual" &&
      input.status !== "bye" && input.status !== "cancelled";
    const corrected = {
      ...existing,
      matchDate: date,
      opponentPlayerAName: opponentA || null,
      opponentPlayerBName: existing.discipline === "doubles" ? opponentB || null : null,
      opponentSchool: opponentSchool || null,
      status: input.status,
      winnerSide,
      scoreText: parsedScore.scoreText || null,
      scoreSets: parsedScore.sets,
      originalScoreText: rawScore || null,
      denisonPlayerAId: playerAId,
      denisonPlayerBId: playerBId,
      countsTowardTeamPoint,
      teamPointAwardedTo: countsTowardTeamPoint && (winnerSide === "denison" || winnerSide === "opponent")
        ? winnerSide : event.eventType === "dual" ? "none" as const : null,
      importFingerprint: resultFingerprint({
        discipline: existing.discipline,
        lineupPosition: existing.lineupPosition,
        drawName: existing.drawName,
        roundLabel: existing.roundLabel,
        denisonPlayerAId: playerAId,
        denisonPlayerBId: playerBId,
        opponentA,
        opponentB,
        scoreText: parsedScore.scoreText,
        status: input.status,
      }),
    };
    const { id, createdAt, updatedAt, ...saveInput } = corrected;
    await saveMatchResult(id, saveInput);

    if (event.eventType === "dual") {
      const updatedResults = await listMatchResults(event.id);
      const calculated = calculateDualTeamScores(updatedResults, event.scoringFormat ?? "ncaa_standard");
      const reportedD = event.reportedTeamScoreDenison;
      const reportedO = event.reportedTeamScoreOpponent;
      await saveMatchEvent(event.id, {
        ...event,
        calculatedTeamScoreDenison: calculated.denison,
        calculatedTeamScoreOpponent: calculated.opponent,
        teamScoreDiscrepancy: reportedD != null && reportedO != null &&
          (reportedD !== calculated.denison || reportedO !== calculated.opponent),
        teamOutcome: teamOutcomeFromScores(reportedD ?? calculated.denison, reportedO ?? calculated.opponent),
      });
    }

    revalidatePath(MATCHES_ROUTE);
    revalidatePath(matchesEventPath(event.id));
    revalidatePath(matchesPlayerPath(input.playerId));
    const previousPartnerId = existing.denisonPlayerAId === input.playerId
      ? existing.denisonPlayerBId : existing.denisonPlayerAId;
    if (existing.discipline === "doubles" && previousPartnerId) revalidatePath(matchesPlayerPath(previousPartnerId));
    if (existing.discipline === "doubles" && input.partnerId) revalidatePath(matchesPlayerPath(input.partnerId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update this result." };
  }
}

export async function deletePlayerMatchResultAction(input: {
  resultId: string;
  eventId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { ok: false, error: "Sign in to delete match results." };

    const event = await getMatchEvent(input.eventId);
    const existing = (await listMatchResults(input.eventId)).find((row) => row.id === input.resultId);
    if (!event || !existing) return { ok: false, error: "This match result was not found." };

    await deleteMatchResult(existing.id);
    if (event.eventType === "dual") {
      const remaining = await listMatchResults(event.id);
      const calculated = calculateDualTeamScores(remaining, event.scoringFormat ?? "ncaa_standard");
      const reportedD = event.reportedTeamScoreDenison;
      const reportedO = event.reportedTeamScoreOpponent;
      await saveMatchEvent(event.id, {
        ...event,
        calculatedTeamScoreDenison: calculated.denison,
        calculatedTeamScoreOpponent: calculated.opponent,
        teamScoreDiscrepancy: reportedD != null && reportedO != null &&
          (reportedD !== calculated.denison || reportedO !== calculated.opponent),
        teamOutcome: teamOutcomeFromScores(reportedD ?? calculated.denison, reportedO ?? calculated.opponent),
      });
    }

    revalidatePath(MATCHES_ROUTE);
    revalidatePath(matchesEventPath(event.id));
    for (const playerId of [existing.denisonPlayerAId, existing.denisonPlayerBId]) {
      if (playerId) revalidatePath(matchesPlayerPath(playerId));
    }
    if (existing.denisonPlayerAId && existing.denisonPlayerBId) {
      revalidatePath(matchesPairPath(doublesPairKey(existing.denisonPlayerAId, existing.denisonPlayerBId)));
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not delete this result." };
  }
}
