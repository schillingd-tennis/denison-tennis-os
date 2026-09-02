import type { TeamScheduleEvent } from "./types";
import { displayOpponentOrEvent } from "./types";

/** Local public asset root — drop official marks at `/public/school-logos/`. */
export const SCHOOL_LOGOS_BASE_PATH = "/school-logos";

/** Files currently present under `public/school-logos/` (excluding `.gitkeep`). */
export const LOCAL_SCHOOL_LOGO_FILES = [
  "Athletic_WashU_Logo_RGB.jpg",
  "Brandeis_athletics_logo_2024.png",
  "Denison.png",
  "Denison_transparent.png",
  "ITA_New_Logo.png",
  "John-carroll_logo_from_NCAA.svg.webp",
  "Skidmore College.png",
  "Wabash_athletics_logo.png",
  "Wooster_Fighting_Scots_logo.svg.webp",
  "OWU.jpg",
  "carnegie-mellon-logo-png_seeklogo-404230.png",
  "case-western-reserve-spartans-logo-png_seeklogo-436095.png",
  "depauw-tigers-logo-png_seeklogo-454736.png",
  "hotel-planner-tour.png",
  "kenyon-logo.png",
  "lg-679c39ec9aa3d-North-Coast-Athletic-Conferenc.webp",
  "mary-washington-university-of-mary-washington-mascot-11562990064vz2rof1zel.png",
  "Oberlin_logo_from_NCAA.svg.webp",
  "trinity-tx.svg",
  "tufts-jumbos-logo-png_seeklogo-326178.png",
  "w.jpg",
] as const;

/** Official Denison marks — sidebar branding vs schedule invite events. */
export const DENISON_EVENT_LOGO_FILE = "Denison.png";
export const DENISON_BRAND_LOGO_FILE = "Denison_transparent.png";
export const DENISON_EVENT_LOGO_SRC = `${SCHOOL_LOGOS_BASE_PATH}/${DENISON_EVENT_LOGO_FILE}`;
export const DENISON_BRAND_LOGO_SRC = `${SCHOOL_LOGOS_BASE_PATH}/${DENISON_BRAND_LOGO_FILE}`;

export type ScheduleIdentityKind = "school" | "event" | "generic";

export type ScheduleIdentity = {
  slug: string;
  label: string;
  initials: string;
  /** Local logo path when a mapped asset exists; otherwise null (initials badge only). */
  logoSrc: string | null;
  kind: ScheduleIdentityKind;
  accentColor: string;
};

type IdentityEntry = {
  slug: string;
  label: string;
  initials: string;
  aliases: string[];
  kind: ScheduleIdentityKind;
  accentColor: string;
  /** Exact filename under `public/school-logos/` when a local asset exists. */
  logoFile?: string;
};

const SCHOOL_IDENTITIES: IdentityEntry[] = [
  {
    slug: "wash-u",
    label: "Wash U",
    initials: "WU",
    aliases: ["wash u", "washu", "wustl", "washington university in st louis", "washington university"],
    kind: "school",
    accentColor: "#A51417",
    logoFile: "Athletic_WashU_Logo_RGB.jpg",
  },
  {
    slug: "depauw",
    label: "DePauw",
    initials: "DU",
    aliases: ["depauw", "depauw university"],
    kind: "school",
    accentColor: "#FFCC00",
    logoFile: "depauw-tigers-logo-png_seeklogo-454736.png",
  },
  {
    slug: "case-western",
    label: "CWRU",
    initials: "CWRU",
    aliases: ["cwru", "case western reserve", "case western reserve university", "case western"],
    kind: "school",
    accentColor: "#00205B",
    logoFile: "case-western-reserve-spartans-logo-png_seeklogo-436095.png",
  },
  {
    slug: "wooster",
    label: "Wooster",
    initials: "COW",
    aliases: ["wooster", "college of wooster"],
    kind: "school",
    accentColor: "#000000",
    logoFile: "Wooster_Fighting_Scots_logo.svg.webp",
  },
  {
    slug: "ohio-wesleyan",
    label: "OWU",
    initials: "OWU",
    aliases: ["owu", "ohio wesleyan", "ohio wesleyan university"],
    kind: "school",
    accentColor: "#C8102E",
    logoFile: "OWU.jpg",
  },
  {
    slug: "kenyon",
    label: "Kenyon",
    initials: "KC",
    aliases: ["kenyon", "kenyon college"],
    kind: "school",
    accentColor: "#482E2A",
    logoFile: "kenyon-logo.png",
  },
  {
    slug: "oberlin",
    label: "Oberlin",
    initials: "OC",
    aliases: ["oberlin", "oberlin college"],
    kind: "school",
    accentColor: "#000000",
    logoFile: "Oberlin_logo_from_NCAA.svg.webp",
  },
  {
    slug: "brandeis",
    label: "Brandeis",
    initials: "BU",
    aliases: ["brandeis", "brandeis university"],
    kind: "school",
    accentColor: "#003DA5",
    logoFile: "Brandeis_athletics_logo_2024.png",
  },
  {
    slug: "tufts",
    label: "Tufts",
    initials: "TU",
    aliases: ["tufts", "tufts university"],
    kind: "school",
    accentColor: "#3E8EDE",
    logoFile: "tufts-jumbos-logo-png_seeklogo-326178.png",
  },
  {
    slug: "john-carroll",
    label: "John Carroll",
    initials: "JCU",
    aliases: ["john carroll", "john carroll university"],
    kind: "school",
    accentColor: "#003DA5",
    logoFile: "John-carroll_logo_from_NCAA.svg.webp",
  },
  {
    slug: "carnegie-mellon",
    label: "Carnegie Mellon",
    initials: "CMU",
    aliases: ["carnegie mellon", "carnegie mellon university", "cmu"],
    kind: "school",
    accentColor: "#C41230",
    logoFile: "carnegie-mellon-logo-png_seeklogo-404230.png",
  },
  {
    slug: "wabash",
    label: "Wabash",
    initials: "WC",
    aliases: ["wabash", "wabash college"],
    kind: "school",
    accentColor: "#CC0000",
    logoFile: "Wabash_athletics_logo.png",
  },
  {
    slug: "wittenberg",
    label: "Wittenberg",
    initials: "WU",
    aliases: ["wittenberg", "wittenberg university"],
    kind: "school",
    accentColor: "#DA291C",
    logoFile: "w.jpg",
  },
  {
    slug: "mary-washington",
    label: "Mary Washington",
    initials: "UMW",
    aliases: ["mary washington", "university of mary washington", "umw"],
    kind: "school",
    accentColor: "#00205B",
    logoFile: "mary-washington-university-of-mary-washington-mascot-11562990064vz2rof1zel.png",
  },
  {
    slug: "trinity-tx",
    label: "Trinity (TX)",
    initials: "TU",
    aliases: [
      "trinity tx",
      "trinity texas",
      "trinity university texas",
      "trinity university (texas)",
      "trinity university",
    ],
    kind: "school",
    accentColor: "#720000",
    logoFile: "trinity-tx.svg",
  },
  {
    slug: "skidmore",
    label: "Skidmore",
    initials: "SK",
    aliases: ["skidmore", "skidmore college"],
    kind: "school",
    accentColor: "#006747",
    logoFile: "Skidmore College.png",
  },
  {
    slug: "sewanee",
    label: "Sewanee",
    initials: "SEW",
    aliases: ["sewanee", "university of the south"],
    kind: "school",
    accentColor: "#582C83",
  },
  {
    slug: "kalamazoo",
    label: "Kalamazoo",
    initials: "KZ",
    aliases: ["kalamazoo", "kalamazoo college"],
    kind: "school",
    accentColor: "#FF6600",
  },
];

const EVENT_IDENTITIES: IdentityEntry[] = [
  {
    slug: "denison",
    label: "Denison",
    initials: "DU",
    aliases: ["denison invite", "big red invite", "denison"],
    kind: "event",
    accentColor: "#C8102E",
    logoFile: DENISON_EVENT_LOGO_FILE,
  },
  {
    slug: "ita",
    label: "ITA",
    initials: "ITA",
    aliases: ["ita regionals", "ita indoors", "ita"],
    kind: "event",
    accentColor: "#003366",
    logoFile: "ITA_New_Logo.png",
  },
  {
    slug: "hotel-planner-tournament",
    label: "Hotel Planner Tournament",
    initials: "HP",
    aliases: ["hotel planner tournament", "hotel planner"],
    kind: "event",
    accentColor: "#475569",
    logoFile: "hotel-planner-tour.png",
  },
  {
    slug: "skidmore-invite",
    label: "Skidmore Invite",
    initials: "SC",
    aliases: ["skidmore invite"],
    kind: "event",
    accentColor: "#006747",
    logoFile: "Skidmore College.png",
  },
  {
    slug: "tournament",
    label: "Tournament",
    initials: "EVT",
    aliases: ["the ohio cup", "ohio cup"],
    kind: "event",
    accentColor: "#475569",
  },
  {
    slug: "travel",
    label: "Travel",
    initials: "SB",
    aliases: ["spring break", "travel"],
    kind: "event",
    accentColor: "#0369A1",
  },
  {
    slug: "ncac-championships",
    label: "NCAC Championships",
    initials: "NCAC",
    aliases: [
      "ncac championships",
      "ncac championship",
      "ncac tournament",
      "north coast athletic conference championships",
      "north coast athletic conference",
    ],
    kind: "event",
    accentColor: "#003DA5",
    logoFile: "lg-679c39ec9aa3d-North-Coast-Athletic-Conferenc.webp",
  },
];

const ALL_IDENTITIES = [...SCHOOL_IDENTITIES, ...EVENT_IDENTITIES];

/** Logo filenames mapped by the resolver. */
export const EXPECTED_SCHOOL_LOGO_FILES = ALL_IDENTITIES.flatMap((entry) =>
  entry.logoFile ? [entry.logoFile] : [],
);

export function schoolLogoSrc(logoFile: string): string {
  return `${SCHOOL_LOGOS_BASE_PATH}/${logoFile}`;
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(tx\)/g, " texas ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildAliasMap(entries: IdentityEntry[]): Map<string, IdentityEntry> {
  const map = new Map<string, IdentityEntry>();
  for (const entry of entries) {
    for (const alias of [entry.label, ...entry.aliases]) {
      map.set(normalizeLabel(alias), entry);
    }
  }
  return map;
}

const SCHOOL_ALIAS_MAP = buildAliasMap(SCHOOL_IDENTITIES);
const EVENT_ALIAS_MAP = buildAliasMap(EVENT_IDENTITIES);

function entryToIdentity(entry: IdentityEntry): ScheduleIdentity {
  return {
    slug: entry.slug,
    label: entry.label,
    initials: entry.initials,
    logoSrc: entry.logoFile ? schoolLogoSrc(entry.logoFile) : null,
    kind: entry.kind,
    accentColor: entry.accentColor,
  };
}

export function resolveScheduleIdentityFromLabel(label: string): ScheduleIdentity | null {
  const normalized = normalizeLabel(label);
  if (!normalized) return null;

  const school = SCHOOL_ALIAS_MAP.get(normalized);
  if (school) return entryToIdentity(school);

  const event = EVENT_ALIAS_MAP.get(normalized);
  if (event) return entryToIdentity(event);

  for (const entry of ALL_IDENTITIES) {
    for (const alias of [entry.label, ...entry.aliases]) {
      const aliasNormalized = normalizeLabel(alias);
      if (normalized.includes(aliasNormalized) || aliasNormalized.includes(normalized)) {
        return entryToIdentity(entry);
      }
    }
  }

  return null;
}

function resolveEventIdentity(eventName: string): ScheduleIdentity | null {
  const normalized = normalizeLabel(eventName);
  if (normalized.includes("ita indoors") || normalized.includes("ita regionals")) {
    return entryToIdentity(EVENT_IDENTITIES.find((entry) => entry.slug === "ita")!);
  }
  if (normalized.includes("denison invite") || normalized.includes("big red invite")) {
    return entryToIdentity(EVENT_IDENTITIES.find((entry) => entry.slug === "denison")!);
  }
  if (normalized.includes("skidmore invite")) {
    return entryToIdentity(EVENT_IDENTITIES.find((entry) => entry.slug === "skidmore-invite")!);
  }
  if (normalized.includes("hotel planner")) {
    return entryToIdentity(
      EVENT_IDENTITIES.find((entry) => entry.slug === "hotel-planner-tournament")!,
    );
  }
  if (normalized.includes("spring break")) {
    return entryToIdentity(EVENT_IDENTITIES.find((entry) => entry.slug === "travel")!);
  }
  if (
    normalized.includes("ncac championship") ||
    normalized.includes("ncac tournament") ||
    normalized.includes("north coast athletic conference")
  ) {
    return entryToIdentity(EVENT_IDENTITIES.find((entry) => entry.slug === "ncac-championships")!);
  }
  return resolveScheduleIdentityFromLabel(eventName);
}

function initialsFromLabel(label: string): string {
  const words = label
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((word) => word[0]!)
    .join("")
    .toUpperCase();
}

export function genericScheduleIdentity(label: string): ScheduleIdentity {
  const initials = initialsFromLabel(label);
  const slug = normalizeLabel(label).replace(/\s+/g, "-") || "unknown";
  return {
    slug,
    label,
    initials,
    logoSrc: null,
    kind: "generic",
    accentColor: "#64748B",
  };
}

export function resolveScheduleIdentity(event: TeamScheduleEvent): ScheduleIdentity {
  const opponent = event.opponentName?.trim();
  const eventName = event.eventName?.trim();

  if (event.eventType === "team_match" && opponent) {
    const resolved = resolveScheduleIdentityFromLabel(opponent);
    if (resolved) return resolved;
  }

  if (eventName) {
    const resolved = resolveEventIdentity(eventName);
    if (resolved) return resolved;
  }

  if (opponent) {
    const resolved = resolveScheduleIdentityFromLabel(opponent);
    if (resolved) return resolved;
  }

  return genericScheduleIdentity(displayOpponentOrEvent(event));
}

export function scheduleDrawerTitle(event?: TeamScheduleEvent): string {
  if (!event) return "Add Match";
  if (event.eventType === "team_match" || event.eventType === "team_match_placeholder") {
    return "Edit Match";
  }
  return "Edit Event";
}
