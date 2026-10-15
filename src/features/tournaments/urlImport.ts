import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

import { emptyTournamentInput } from "./editor";
import type { TournamentInput } from "./types";

export type TournamentUrlImport = {
  input: TournamentInput;
  source: string;
  warnings: string[];
};

type UstaTournament = {
  name?: string | null;
  identificationCode?: string | null;
  primaryLocation?: {
    name?: string | null;
    address1?: string | null;
    address2?: string | null;
    country?: string | null;
    county?: string | null;
    postcode?: string | null;
    town?: string | null;
  } | null;
  timings?: {
    startDate?: string | null;
    endDate?: string | null;
    timeZone?: string | null;
    startDateTime?: string | null;
  } | null;
  level?: { name?: string | null; shortName?: string | null } | null;
  registrationRestrictions?: {
    entriesOpenDateTime?: string | null;
    entriesCloseDateTime?: string | null;
  } | null;
  websiteContent?: { tournamentDetails?: string | null; entryInformation?: string | null } | null;
};

const USTA_QUERY = `
  query GetTournament($id: UUID!, $previewMode: Boolean) {
    publishedTournament(id: $id, previewMode: $previewMode) {
      name
      identificationCode
      primaryLocation { name address1 address2 country county postcode town }
      timings { startDate endDate timeZone startDateTime }
      level { name shortName }
      registrationRestrictions { entriesOpenDateTime entriesCloseDateTime }
      websiteContent { tournamentDetails entryInformation }
    }
  }
`;

function validatePublicHttpsUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Enter a valid tournament URL.");
  }
  if (url.protocol !== "https:") throw new Error("Tournament links must use HTTPS.");
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    isIP(hostname) !== 0
  ) {
    throw new Error("That tournament host is not supported.");
  }
  return url;
}

async function safeFetch(url: URL, init?: RequestInit): Promise<Response> {
  let current = url;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    await assertPublicHost(current);
    const response = await fetch(current, {
      ...init,
      redirect: "manual",
      headers: {
        "user-agent": "Denison Tennis OS tournament importer/1.0",
        accept: "text/html,application/json",
        ...init?.headers,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("The tournament page returned an invalid redirect.");
    current = validatePublicHttpsUrl(new URL(location, current).toString());
  }
  throw new Error("The tournament page redirected too many times.");
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) {
    return true;
  }
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0
  );
}

async function assertPublicHost(url: URL): Promise<void> {
  // This provider is both known and covered by the URL shape check above. Avoiding
  // a second DNS hop also keeps its preview fast and testable.
  if (/(^|\.)playtennis\.usta\.com$/i.test(url.hostname)) return;
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(url.hostname, { all: true });
  } catch {
    throw new Error("The tournament website could not be found.");
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("That tournament host is not supported.");
  }
}

function plainText(html: string | null | undefined): string {
  return (html ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function inferSurface(text: string): string | null {
  if (/\b(clay|har-tru)\b/i.test(text)) return "Clay";
  if (/\bgrass\b/i.test(text)) return "Grass";
  if (/\bindoor\b/i.test(text)) return "Indoor";
  if (/\bhard courts?\b/i.test(text)) return "Hard";
  return null;
}

function lifecycle(endDate: string | null): "past" | "upcoming" | null {
  if (!endDate) return null;
  return endDate < new Date().toISOString().slice(0, 10) ? "past" : "upcoming";
}

function formatTimestamp(value: string | null | undefined, timeZone?: string | null): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timeZone || "America/New_York",
      timeZoneName: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ustaId(url: URL): string | null {
  if (!/(^|\.)playtennis\.usta\.com$/i.test(url.hostname)) return null;
  return url.pathname.match(/\/Tournaments\/(?:Overview|Details)\/([0-9a-f-]{36})(?:\/|$)/i)?.[1] ?? null;
}

async function importUsta(url: URL, id: string): Promise<TournamentUrlImport> {
  const response = await safeFetch(new URL("https://playtennis.usta.com/swift?/tournaments/api/graphql"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: USTA_QUERY, variables: { id, previewMode: false } }),
  });
  if (!response.ok) throw new Error(`USTA returned ${response.status} while loading this tournament.`);
  const payload = (await response.json()) as {
    data?: { publishedTournament?: UstaTournament | null };
    errors?: Array<{ message?: string }>;
  };
  const tournament = payload.data?.publishedTournament;
  if (!tournament?.name) {
    throw new Error(payload.errors?.[0]?.message || "USTA did not return tournament details for this link.");
  }

  const location = tournament.primaryLocation;
  const timings = tournament.timings;
  const registration = tournament.registrationRestrictions;
  const detailText = plainText(
    `${tournament.websiteContent?.tournamentDetails ?? ""} ${tournament.websiteContent?.entryInformation ?? ""}`,
  );
  const levelName = tournament.level?.name?.trim() || tournament.level?.shortName?.trim() || null;
  const entryType = /closed/i.test(levelName ?? "") ? "Closed" : /open/i.test(levelName ?? "") ? "Open" : null;
  const state = location?.county?.trim() || null;
  const city = location?.town
    ?.trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || null;
  const address = [location?.address1, location?.address2, city, state, location?.postcode]
    .filter(Boolean)
    .join(", ");
  const timeZone = timings?.timeZone ?? null;
  const detailLines = [
    tournament.identificationCode ? `USTA tournament ID: ${tournament.identificationCode}` : null,
    address ? `Primary address: ${address}` : null,
    timings?.startDateTime ? `Starts: ${formatTimestamp(timings.startDateTime, timeZone)}` : null,
    registration?.entriesOpenDateTime
      ? `Registration opens: ${formatTimestamp(registration.entriesOpenDateTime, timeZone)}`
      : null,
    registration?.entriesCloseDateTime
      ? `Registration closes: ${formatTimestamp(registration.entriesCloseDateTime, timeZone)}`
      : null,
  ].filter(Boolean);

  return {
    source: "USTA Play Tennis",
    warnings: detailText ? [] : ["USTA did not provide descriptive tournament notes."],
    input: {
      ...emptyTournamentInput(),
      name: tournament.name.trim(),
      startDate: timings?.startDate ?? null,
      endDate: timings?.endDate ?? null,
      location: [city, state].filter(Boolean).join(", ") || null,
      venue: location?.name?.trim() || null,
      surface: inferSurface(detailText),
      level: levelName,
      entryType,
      lifecycleStatus: lifecycle(timings?.endDate ?? null),
      websiteUrl: url.toString(),
      ustaUrl: url.toString(),
      additionalNotes: detailLines.join("\n") || null,
    },
  };
}

function firstMatch(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (value) return plainText(value);
  }
  return null;
}

function parseJsonLd(html: string): Record<string, unknown> | null {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown> | Record<string, unknown>[];
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      const event = entries.find((entry) => /event/i.test(String(entry["@type"] ?? "")));
      if (event) return event;
    } catch {
      // Ignore malformed publisher metadata and continue to visible page metadata.
    }
  }
  return null;
}

async function importGeneric(url: URL): Promise<TournamentUrlImport> {
  const response = await safeFetch(url);
  if (!response.ok) throw new Error(`The tournament page returned ${response.status}.`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) throw new Error("That link did not return a tournament web page.");
  const html = (await response.text()).slice(0, 2_000_000);
  const structured = parseJsonLd(html);
  const structuredLocation = structured?.location as Record<string, unknown> | undefined;
  const address = structuredLocation?.address as Record<string, unknown> | undefined;
  const name = String(structured?.name ?? "").trim() || firstMatch(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ]);
  if (!name) throw new Error("No tournament name was found on that page. Add this tournament manually instead.");
  const startDate = String(structured?.startDate ?? "").slice(0, 10) || null;
  const endDate = String(structured?.endDate ?? "").slice(0, 10) || startDate;
  const city = String(address?.addressLocality ?? "").trim();
  const state = String(address?.addressRegion ?? "").trim();
  const description = String(structured?.description ?? "").trim() || firstMatch(html, [
    /<meta[^>]+(?:name|property)=["']description["'][^>]+content=["']([^"']+)/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i,
  ]);
  const warnings: string[] = [];
  if (!startDate) warnings.push("No tournament dates were published in structured page data.");
  if (!city && !state) warnings.push("No city or state was published in structured page data.");

  return {
    source: new URL(url).hostname,
    warnings,
    input: {
      ...emptyTournamentInput(),
      name,
      startDate,
      endDate,
      location: [city, state].filter(Boolean).join(", ") || null,
      venue: String(structuredLocation?.name ?? "").trim() || null,
      surface: inferSurface(description ?? ""),
      lifecycleStatus: lifecycle(endDate),
      websiteUrl: url.toString(),
      notes: description || null,
    },
  };
}

export async function importTournamentUrl(rawUrl: string): Promise<TournamentUrlImport> {
  const url = validatePublicHttpsUrl(rawUrl);
  const id = ustaId(url);
  return id ? importUsta(url, id) : importGeneric(url);
}
