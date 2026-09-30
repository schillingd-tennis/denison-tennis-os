import type { BrowserContext, Response } from "playwright";

import type { TeamRatingPlayer } from "../../../src/features/teamRatings/types";
import type { TeamRatingCheckResult } from "./checkTeamRating.js";

type WtnRating = { type?: unknown; tennisNumber?: unknown };

function validWtn(value: unknown): number | null {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating <= 0 || rating > 40) return null;
  return Math.round(rating * 100) / 100;
}

/** Locate the current singles WTN in a GraphQL response without depending on query names. */
export function extractSinglesWtn(payload: unknown): number | null {
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
    const row = value as WtnRating & Record<string, unknown>;
    if (String(row.type).toUpperCase() === "SINGLE") {
      const rating = validWtn(row.tennisNumber);
      if (rating != null) return rating;
    }
    queue.push(...Object.values(row));
  }
  return null;
}

async function responseRating(response: Response): Promise<number | null> {
  if (response.request().resourceType() !== "xhr" && response.request().resourceType() !== "fetch") return null;
  if (!response.url().includes("clubspark.pro/graphql")) return null;
  try {
    return extractSinglesWtn(await response.json());
  } catch {
    return null;
  }
}

export async function checkTeamWtnRating(
  context: BrowserContext,
  player: TeamRatingPlayer,
): Promise<TeamRatingCheckResult> {
  const page = await context.newPage();
  try {
    let resolveRating: (value: number | null) => void = () => undefined;
    const observed = new Promise<number | null>((resolve) => { resolveRating = resolve; });
    const listener = (response: Response) => {
      void responseRating(response).then((rating) => {
        if (rating != null) resolveRating(rating);
      });
    };
    page.on("response", listener);
    await page.goto(player.profileUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const rating = await Promise.race([
      observed,
      page.waitForTimeout(15_000).then(() => null),
    ]);
    page.off("response", listener);
    if (rating != null) return { player, status: "ok", rating, diagnostic: "wtn_graphql" };

    const body = await page.locator("body").innerText().catch(() => "");
    if (/\b(?:sign in|log in)\b/i.test(body) || /login/i.test(page.url())) {
      return { player, status: "auth_required", diagnostic: "WTN login expired." };
    }
    return { player, status: "error", diagnostic: "WTN_RATING_NOT_FOUND" };
  } catch (error) {
    return {
      player,
      status: "error",
      diagnostic: error instanceof Error ? error.message : "WTN_PROFILE_FAILED",
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}
