import type { BrowserContext } from "playwright";

import type { RecruitRatingPlayer } from "../../../src/features/recruitRatings/types";

export type TrnRatingCheckResult = {
  player: RecruitRatingPlayer;
  status: "ok" | "auth_required" | "error";
  rank?: number;
  starRating?: number | null;
  diagnostic?: string;
};

export function extractTrnRating(text: string): { rank: number | null; starRating: number | null } {
  const normalized = text.replace(/\s+/g, " ");
  const rankMatch = normalized.match(/(?:national\s+(?:rank|ranking)|nationally\s+ranked|rank)\s*[:#-]?\s*#?\s*(\d{1,4})/i);
  const rank = rankMatch ? Number(rankMatch[1]) : null;
  const starMatch = normalized.match(/\b([1-5])\s*(?:-|\s)?star\b/i);
  const starRating = /\bblue\s*chip\b/i.test(normalized) ? 6 : starMatch ? Number(starMatch[1]) : null;
  return {
    rank: rank && rank > 0 ? rank : null,
    starRating: starRating && starRating >= 1 && starRating <= 6 ? starRating : null,
  };
}

export async function checkTrnRating(
  context: BrowserContext,
  player: RecruitRatingPlayer,
): Promise<TrnRatingCheckResult> {
  const page = await context.newPage();
  try {
    await page.goto(player.profileUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const body = await page.locator("body").innerText().catch(() => "");
    if (/\b(?:sign in|log in)\b/i.test(body) && /login|signin/i.test(page.url())) {
      return { player, status: "auth_required", diagnostic: "TennisRecruiting.net login required." };
    }
    const { rank, starRating } = extractTrnRating(body);
    if (rank == null) return { player, status: "error", diagnostic: "TRN_RANK_NOT_FOUND" };
    return { player, status: "ok", rank, starRating, diagnostic: "trn_profile_page" };
  } catch (error) {
    return { player, status: "error", diagnostic: error instanceof Error ? error.message : "TRN_PROFILE_FAILED" };
  } finally {
    await page.close().catch(() => undefined);
  }
}
