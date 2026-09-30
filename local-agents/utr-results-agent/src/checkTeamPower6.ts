import type { BrowserContext } from "playwright";

export const DENISON_UTR_TEAM_URL = "https://app.utrsports.net/college/2070?tab=info";

export type TeamPower6CheckResult = {
  status: "ok" | "auth_required" | "error";
  rating?: number;
  diagnostic?: string;
};

/** Extract the college Power 6 value from UTR's visible team-page text. */
export function extractPower6(text: string): number | null {
  const match = text.match(/(?:\b(\d{1,3}(?:\.\d{1,3})?)\s+Power\s*6\b|\bPower\s*6\s+(\d{1,3}(?:\.\d{1,3})?)\b)/i);
  const rating = Number(match?.[1] ?? match?.[2]);
  if (!Number.isFinite(rating) || rating <= 0 || rating > 96) return null;
  return Math.round(rating * 100) / 100;
}

export async function checkDenisonPower6(
  context: BrowserContext,
): Promise<TeamPower6CheckResult> {
  const page = await context.newPage();
  try {
    await page.goto(DENISON_UTR_TEAM_URL, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(2_000);
    const state = await page.evaluate(() => ({
      text: document.body?.innerText ?? "",
      url: location.href,
    }));
    const rating = extractPower6(state.text);
    if (rating != null) return { status: "ok", rating, diagnostic: "college_team_page" };
    if (/\/login/i.test(state.url) || /\bsign in\b|\blog in\b/i.test(state.text)) {
      return { status: "auth_required", diagnostic: "UTR login expired." };
    }
    return { status: "error", diagnostic: "DENISON_POWER_6_NOT_FOUND" };
  } catch (error) {
    return {
      status: "error",
      diagnostic: error instanceof Error ? error.message : "DENISON_POWER_6_CHECK_FAILED",
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}
