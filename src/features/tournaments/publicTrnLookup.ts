export type PublicTrnPlayer = {
  profileUrl: string;
  city: string | null;
  state: string | null;
  classYear: number | null;
  rank: number | null;
  starRating: number | null;
};

function text(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

function numberAfter(body: string, labels: RegExp): number | null {
  const match = body.match(new RegExp(`${labels.source}[:#\\s-]*(\\d{1,4})`, "i"));
  return match ? Number(match[1]) : null;
}

export function parsePublicTrnProfile(html: string, profileUrl: string): PublicTrnPlayer {
  const body = text(html);
  const hometown = body.match(/(?:Hometown|Location)\s*:?[\s-]*([A-Za-z .'-]+),\s*([A-Z]{2})\b/i);
  const stars = body.match(/\b([1-5])\s*[- ]?star\b/i);
  return {
    profileUrl,
    city: hometown?.[1]?.trim() ?? null,
    state: hometown?.[2]?.toUpperCase() ?? null,
    classYear: numberAfter(body, /(?:Graduation Year|Class of|Grad Year)/i),
    rank: numberAfter(body, /(?:National Rank|TRN Rank)/i),
    starRating: /blue\s*chip/i.test(body) ? 6 : stars ? Number(stars[1]) : null,
  };
}

function absoluteTrnUrl(value: string) {
  try {
    const url = new URL(value, "https://www.tennisrecruiting.net");
    return url.hostname.endsWith("tennisrecruiting.net") && /player/i.test(url.pathname) ? url.toString() : null;
  } catch { return null; }
}

export async function lookupPublicTrnPlayer(name: string, fetchImpl: typeof fetch = fetch): Promise<PublicTrnPlayer | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const search = new URL("https://www.tennisrecruiting.net/search.asp");
    search.searchParams.set("search", name);
    const response = await fetchImpl(search, { headers: { "user-agent": "Mozilla/5.0 Denison Tennis OS" }, signal: controller.signal, cache: "no-store" });
    if (!response.ok) return null;
    const html = await response.text();
    if (/just a moment|cf-chl|challenge-platform/i.test(html)) return null;
    const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const links = [...html.matchAll(/href=["']([^"']*player[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const candidate = links.find((match) => text(match[2]).toLowerCase().replace(/[^a-z0-9]+/g, " ").includes(normalized));
    const profileUrl = candidate ? absoluteTrnUrl(candidate[1]) : null;
    if (!profileUrl) return null;
    const profile = await fetchImpl(profileUrl, { headers: { "user-agent": "Mozilla/5.0 Denison Tennis OS" }, signal: controller.signal, cache: "no-store" });
    if (!profile.ok) return null;
    const profileHtml = await profile.text();
    if (/just a moment|cf-chl|challenge-platform/i.test(profileHtml)) return null;
    return parsePublicTrnProfile(profileHtml, profileUrl);
  } catch { return null; }
  finally { clearTimeout(timeout); }
}
