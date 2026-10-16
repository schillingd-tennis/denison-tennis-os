import type { BrowserContext } from "playwright";

export type TrnPublicProfile = { profileUrl: string; city: string | null; state: string | null; classYear: number | null; rank: number | null; starRating: number | null };
const normalizedName = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
function numberAfter(body: string, label: RegExp) { const match = body.match(new RegExp(`${label.source}[:#\\s-]*(\\d{1,4})`, "i")); return match ? Number(match[1]) : null; }

export async function findPublicTrnProfile(context: BrowserContext, name: string): Promise<TrnPublicProfile | null> {
  const page = await context.newPage();
  try {
    const searchUrl = new URL("https://www.tennisrecruiting.net/search.asp"); searchUrl.searchParams.set("search", name);
    await page.goto(searchUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 }); await page.waitForTimeout(1_000);
    const challenge = `${await page.title().catch(() => "")} ${await page.locator("body").innerText().catch(() => "")}`;
    if (/just a moment|verify you are human|enable javascript and cookies|checking your browser/i.test(challenge) || page.url().includes("/cdn-cgi/")) throw new Error("TRN_BROWSER_VERIFICATION_REQUIRED");
    const wanted = normalizedName(name);
    const candidates = await page.locator('a[href*="player"]').evaluateAll((anchors) => anchors.map((anchor) => ({ href: (anchor as HTMLAnchorElement).href, text: (anchor.textContent ?? "").trim() })));
    const candidate = candidates.find((item) => normalizedName(item.text) === wanted) ?? candidates.find((item) => normalizedName(item.text).includes(wanted));
    if (!candidate?.href || !/tennisrecruiting\.net/i.test(candidate.href)) return null;
    await page.goto(candidate.href, { waitUntil: "domcontentloaded", timeout: 60_000 }); await page.waitForTimeout(750);
    const body = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
    const images = await page.locator("img").evaluateAll((nodes) => nodes.map((node) => (node as HTMLImageElement).src)).catch(() => [] as string[]);
    const hometown = body.match(/(?:Hometown|Location)\s*:?\s*([A-Za-z .'-]+),\s*([A-Z]{2})\b/i); const stars = body.match(/\b([1-5])\s*(?:-|\s)?star\b/i); const imageStars = images.join(" ").match(/record([1-5])star\./i);
    return { profileUrl: page.url(), city: hometown?.[1]?.trim() ?? null, state: hometown?.[2]?.toUpperCase() ?? null, classYear: numberAfter(body, /(?:Graduation Year|Class of|Grad Year)/i), rank: numberAfter(body, /(?:National Rank|TRN Rank|Nationally Ranked)/i), starRating: /blue\s*chip/i.test(body) ? 6 : imageStars ? Number(imageStars[1]) : stars ? Number(stars[1]) : null };
  } finally { await page.close().catch(() => undefined); }
}
