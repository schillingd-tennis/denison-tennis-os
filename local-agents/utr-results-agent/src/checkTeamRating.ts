import type { BrowserContext } from "playwright";

import type { TeamRatingPlayer } from "../../../src/features/teamRatings/types";
import { checkRecruit } from "./checkRecruit.js";

export type TeamRatingCheckResult = {
  player: TeamRatingPlayer;
  status: "ok" | "auth_required" | "error";
  rating?: number;
  diagnostic?: string;
};

type RatingCandidate = {
  id?: string | number;
  playerId?: string | number;
  singlesUtr?: string | number;
  singlesUTR?: string | number;
  singlesRating?: string | number;
};

function validUtr(value: unknown): number | null {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating <= 0 || rating > 16) return null;
  return Math.round(rating * 100) / 100;
}

/** Find the requested player's current singles UTR in any observed profile API payload. */
export function extractUtrRating(payload: unknown, playerId: string): number | null {
  const seen = new Set<unknown>();
  const queue: unknown[] = [payload];
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) {
      queue.push(...value);
      continue;
    }
    const row = value as RatingCandidate & Record<string, unknown>;
    const id = row.id ?? row.playerId;
    if (id != null && String(id) === playerId) {
      const rating = validUtr(row.singlesUtr ?? row.singlesUTR ?? row.singlesRating);
      if (rating != null) return rating;
    }
    queue.push(...Object.values(row));
  }
  return null;
}

export async function checkTeamUtrRating(
  context: BrowserContext,
  player: TeamRatingPlayer,
): Promise<TeamRatingCheckResult> {
  const result = await checkRecruit(context, {
    recruitPersonId: player.personId,
    displayName: player.displayName,
    utrPlayerId: player.externalPlayerId,
  });
  if (result.status === "AUTH_REQUIRED") {
    return { player, status: "auth_required", diagnostic: "UTR login expired." };
  }
  if (result.status !== "OK" || !result.payload) {
    return {
      player,
      status: "error",
      diagnostic: result.errorCode ?? result.diagnosticStatus ?? "UTR_RESULTS_FAILED",
    };
  }
  const rating = extractUtrRating(result.payload, player.externalPlayerId);
  if (rating == null) {
    return { player, status: "error", diagnostic: "PLAYER_RATING_NOT_FOUND_IN_RESULTS" };
  }
  return { player, status: "ok", rating, diagnostic: "results_api" };
}
