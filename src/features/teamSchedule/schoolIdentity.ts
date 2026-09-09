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
  "allegheny.svg",
  "amherst.svg",
  "asbury.svg",
  "averett.svg",
  "babson.svg",
  "bates.svg",
  "bethel-mn.svg",
  "bowdoin.svg",
  "caltech.svg",
  "carleton.svg",
  "carthage.svg",
  "chapman.svg",
  "chicago.svg",
  "chris-newport.svg",
  "claremont-m-s.svg",
  "coe.svg",
  "colby.svg",
  "east-tex-baptist.svg",
  "emory.svg",
  "franklin-marshall.svg",
  "grinnell.svg",
  "gust-adolphus.svg",
  "hamilton.svg",
  "haverford.svg",
  "hobart.svg",
  "hope.svg",
  "iit.svg",
  "ithaca.svg",
  "johns-hopkins.svg",
  "kalamazoo.svg",
  "lake-forest.svg",
  "luther.svg",
  "mary-hardin-baylor.svg",
  "middlebury.svg",
  "mit.svg",
  "nc-wesleyan.svg",
  "new-york-u.svg",
  "north-central-il.svg",
  "occidental.svg",
  "ohio-northern.svg",
  "pomona-pitzer.svg",
  "randolph.svg",
  "redlands.svg",
  "rhodes.svg",
  "rit.svg",
  "rochester-ny.svg",
  "rose-hulman.svg",
  "sewanee.svg",
  "shenandoah.svg",
  "southwestern-tx.svg",
  "stevens.svg",
  "swarthmore.svg",
  "tcnj.svg",
  "union-ny.svg",
  "va-wesleyan.svg",
  "vassar.svg",
  "wash-lee.svg",
  "washington-col.svg",
  "wesleyan-ct.svg",
  "whitman.svg",
  "williams.svg",
  "wis-whitewater.svg",
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

const RANKED_SCHOOL_IDENTITY_DATA: Array<
  readonly [slug: string, label: string, logoFile: string, aliases: readonly string[]]
> = [
  ["chicago", "University of Chicago", "chicago.svg", ["university of chicago", "chicago"]],
  ["claremont-mudd-scripps", "Claremont-Mudd-Scripps", "claremont-m-s.svg", ["claremont mudd scripps", "cms"]],
  ["bowdoin", "Bowdoin", "bowdoin.svg", ["bowdoin", "bowdoin college"]],
  ["swarthmore", "Swarthmore", "swarthmore.svg", ["swarthmore", "swarthmore college"]],
  ["johns-hopkins", "Johns Hopkins", "johns-hopkins.svg", ["johns hopkins", "johns hopkins university"]],
  ["emory", "Emory", "emory.svg", ["emory", "emory ga", "emory university"]],
  ["babson", "Babson", "babson.svg", ["babson", "babson college"]],
  ["sewanee-ranked", "Sewanee", "sewanee.svg", ["sewanee", "university of the south"]],
  ["amherst", "Amherst", "amherst.svg", ["amherst", "amherst college"]],
  ["middlebury", "Middlebury", "middlebury.svg", ["middlebury", "middlebury college"]],
  ["pomona-pitzer", "Pomona-Pitzer", "pomona-pitzer.svg", ["pomona pitzer"]],
  ["grinnell", "Grinnell", "grinnell.svg", ["grinnell", "grinnell college"]],
  [
    "gustavus-adolphus",
    "Gustavus Adolphus",
    "gust-adolphus.svg",
    ["gustavus", "gustavus adolphus", "gustavus adolphus college"],
  ],
  ["williams", "Williams", "williams.svg", ["williams", "williams college"]],
  ["nyu", "NYU", "new-york-u.svg", ["nyu", "new york university"]],
  ["christopher-newport", "Christopher Newport", "chris-newport.svg", ["christopher newport", "christopher newport university"]],
  ["carthage", "Carthage", "carthage.svg", ["carthage", "carthage college"]],
  ["vassar", "Vassar", "vassar.svg", ["vassar", "vassar college"]],
  ["kalamazoo-ranked", "Kalamazoo", "kalamazoo.svg", ["kalamazoo", "kalamazoo college"]],
  ["wisconsin-whitewater", "Wisconsin-Whitewater", "wis-whitewater.svg", ["wisconsin whitewater", "uw whitewater"]],
  ["washington-and-lee", "Washington and Lee", "wash-lee.svg", ["washington and lee", "washington lee"]],
  ["southwestern-texas", "Southwestern (Texas)", "southwestern-tx.svg", ["southwestern texas", "southwestern university texas"]],
  ["north-central-illinois", "North Central (IL)", "north-central-il.svg", ["north central il", "north central illinois", "north central college"]],
  ["luther", "Luther", "luther.svg", ["luther", "luther college"]],
  ["north-carolina-wesleyan", "North Carolina Wesleyan", "nc-wesleyan.svg", ["north carolina wesleyan", "north carolina wesleyan university"]],
  ["tcnj", "The College of New Jersey", "tcnj.svg", ["the college of new jersey", "tcnj"]],
  ["mit", "MIT", "mit.svg", ["mit", "massachusetts inst of tech", "massachusetts institute of technology"]],
  ["lake-forest", "Lake Forest", "lake-forest.svg", ["lake forest", "lake forest college"]],
  ["redlands", "Redlands", "redlands.svg", ["redlands", "university of redlands"]],
  ["shenandoah", "Shenandoah", "shenandoah.svg", ["shenandoah", "shenandoah university"]],
  ["haverford", "Haverford", "haverford.svg", ["haverford", "haverford college"]],
  ["stevens", "Stevens", "stevens.svg", ["stevens", "stevens institute of technology"]],
  ["franklin-marshall", "Franklin & Marshall", "franklin-marshall.svg", ["franklin marshall", "franklin and marshall", "franklin marshall college"]],
  ["carleton", "Carleton", "carleton.svg", ["carleton", "carleton college"]],
  ["bates", "Bates", "bates.svg", ["bates", "bates college"]],
  ["wesleyan-connecticut", "Wesleyan", "wesleyan-ct.svg", ["wesleyan", "wesleyan university"]],
  ["randolph", "Randolph", "randolph.svg", ["randolph", "randolph college"]],
  ["ithaca", "Ithaca", "ithaca.svg", ["ithaca", "ithaca college"]],
  ["caltech", "Caltech", "caltech.svg", ["caltech", "california institute of technology"]],
  ["hamilton", "Hamilton", "hamilton.svg", ["hamilton", "hamilton college"]],
  ["ohio-northern", "Ohio Northern", "ohio-northern.svg", ["ohio northern", "ohio northern university"]],
  ["union-new-york", "Union (New York)", "union-ny.svg", ["union new york", "union college new york"]],
  ["hope", "Hope", "hope.svg", ["hope", "hope college"]],
  ["coe", "Coe", "coe.svg", ["coe", "coe college"]],
  ["averett", "Averett", "averett.svg", ["averett", "averett university"]],
  ["rochester-new-york", "Rochester (New York)", "rochester-ny.svg", ["rochester new york", "university of rochester"]],
  ["rhodes", "Rhodes", "rhodes.svg", ["rhodes", "rhodes college"]],
  ["chapman", "Chapman", "chapman.svg", ["chapman", "chapman university"]],
  ["asbury", "Asbury", "asbury.svg", ["asbury", "asbury university"]],
  ["virginia-wesleyan", "Virginia Wesleyan", "va-wesleyan.svg", ["virginia wesleyan", "virginia wesleyan university"]],
  ["east-texas-baptist", "East Texas Baptist", "east-tex-baptist.svg", ["east texas baptist", "east texas baptist university", "etbu"]],
  ["rit", "RIT", "rit.svg", ["rit", "rochester inst of tech", "rochester institute of technology"]],
  ["occidental", "Occidental", "occidental.svg", ["occidental", "occidental college"]],
  ["illinois-tech", "Illinois Tech", "iit.svg", ["illinois institute of technology", "illinois tech", "iit"]],
  ["washington-college", "Washington College", "washington-col.svg", ["washington college"]],
  ["hobart-william-smith", "Hobart/William Smith", "hobart.svg", ["hobart william smith", "hobart and william smith"]],
  ["colby", "Colby", "colby.svg", ["colby", "colby college"]],
  ["bethel-minnesota", "Bethel (MN)", "bethel-mn.svg", ["bethel mn", "bethel minnesota", "bethel university minnesota"]],
  ["mary-hardin-baylor", "Mary Hardin-Baylor", "mary-hardin-baylor.svg", ["mary hardin baylor", "university of mary hardin baylor"]],
  ["whitman", "Whitman", "whitman.svg", ["whitman", "whitman college"]],
  ["allegheny", "Allegheny", "allegheny.svg", ["allegheny", "allegheny college"]],
  ["rose-hulman", "Rose-Hulman", "rose-hulman.svg", ["rose hulman", "rose hulman institute of technology"]],
];

const RANKED_SCHOOL_IDENTITIES: IdentityEntry[] = RANKED_SCHOOL_IDENTITY_DATA.map(
  ([slug, label, logoFile, aliases]) => ({
  slug,
  label,
  initials: label
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase(),
  aliases: [...aliases],
  kind: "school" as const,
  accentColor: "#475569",
  logoFile,
  }),
);

const SCHOOL_IDENTITIES: IdentityEntry[] = [
  {
    slug: "wash-u",
    label: "Wash U St Louis",
    initials: "WU",
    aliases: [
      "wash u",
      "washu",
      "wustl",
      "wash u st louis",
      "wash u st. louis",
      "washington university in st louis",
      "washington university",
    ],
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
    label: "Case Western",
    initials: "CWRU",
    aliases: [
      "cwru",
      "case western",
      "case western reserve",
      "case western reserve university",
    ],
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
  ...RANKED_SCHOOL_IDENTITIES,
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

/** Exact shared school alias lookup for tables where fuzzy matching is unsafe. */
export function resolveSchoolIdentityFromLabelExact(label: string): ScheduleIdentity | null {
  const normalized = normalizeLabel(label);
  if (!normalized) return null;
  const school = SCHOOL_ALIAS_MAP.get(normalized);
  return school ? entryToIdentity(school) : null;
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
