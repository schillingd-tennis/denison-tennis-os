import type { BrowserContext } from "playwright";

import type { RecruitRatingPlayer } from "../../../src/features/recruitRatings/types";

export type TrnRatingCheckResult = {
  player: RecruitRatingPlayer;
  status: "ok" | "auth_required" | "error";
  rank?: number;
  starRating?: number | null;
  diagnostic?: string;
};

export function extractTrnRating(
  text: string,
  imageSources: string[] = [],
): { rank: number | null; starRating: number | null } {
  const normalized = text.replace(/\s+/g, " ");
  const rankMatch = normalized.match(
    /(?:national(?:\s+(?:rank|ranking))?|nationally\s+ranked|rank)\s*[:#-]?\s*#?\s*(\d{1,4})/i,
  );
  const rank = rankMatch ? Number(rankMatch[1]) : null;
  const starMatch = normalized.match(/\b([1-5])\s*(?:-|\s)?star\b/i);
  const imageText = imageSources.join(" ");
  const imageStarMatch = imageText.match(/record([1-5])star\.(?:gif|png|jpe?g|webp)/i);
  const isBlueChip = /\bblue\s*chip\b/i.test(normalized) || /recordblue(?:chip)?\./i.test(imageText);
  const starRating = isBlueChip
    ? 6
    : imageStarMatch
      ? Number(imageStarMatch[1])
      : starMatch
        ? Number(starMatch[1])
        : null;
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
    await page.waitForFunction(
      () => /weekly\s+rankings|national\s*[:#-]|just a moment|verify you are human|enable javascript and cookies/i.test(document.body?.innerText ?? ""),
      undefined,
      { timeout: 20_000 },
    ).catch(() => undefined);
    const body = await page.locator("body").innerText().catch(() => "");
    const title = await page.title().catch(() => "");
    if (/just a moment|verify you are human|enable javascript and cookies|checking your browser/i.test(`${title} ${body}`) || page.url().includes("/cdn-cgi/")) {
      const loginCommand = process.env.UTR_AGENT_LOCAL_SUPABASE_URL
        ? "npm run trn:login:local"
        : "npm run trn:login";
      return {
        player,
        status: "auth_required",
        diagnostic: `TennisRecruiting.net verification required. Run ${loginCommand}, complete the browser check, then retry.`,
      };
    }
    if (/\b(?:sign in|log in)\b/i.test(body) && /login|signin/i.test(page.url())) {
      return { player, status: "auth_required", diagnostic: "TennisRecruiting.net login required." };
    }
    const imageSources = await page
      .locator("img")
      .evaluateAll((images) => images.map((image) => image.getAttribute("src") ?? ""))
      .catch(() => [] as string[]);
    const { rank, starRating } = extractTrnRating(body, imageSources);
    if (rank == null) {
      const summary = body.replace(/\s+/g, " ").trim().slice(0, 180);
      return { player, status: "error", diagnostic: `TRN_RANK_NOT_FOUND (${title || page.url()}${summary ? `: ${summary}` : ""})` };
    }
    return { player, status: "ok", rank, starRating, diagnostic: "trn_profile_page" };
  } catch (error) {
    return { player, status: "error", diagnostic: error instanceof Error ? error.message : "TRN_PROFILE_FAILED" };
  } finally {
    await page.close().catch(() => undefined);
  }
}
