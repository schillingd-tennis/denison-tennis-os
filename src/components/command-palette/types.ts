import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Searchable object types modules may register (BP-021E).
 * UI groups fold some types together — see `displayGroupForType`.
 */
export type SearchObjectType =
  | "pages"
  | "people"
  | "recruits"
  | "staff"
  | "coaches"
  | "operations"
  | "practices"
  | "trips"
  | "documents"
  | "research_projects"
  | "saved_views"
  | "reports"
  | "actions";

/**
 * Result section headers shown in the palette. Types not listed here still
 * register and search — they fold into one of these buckets.
 */
export type SearchDisplayGroup =
  | "pages"
  | "people"
  | "recruits"
  | "operations"
  | "documents"
  | "reports"
  | "actions";

export const SEARCH_DISPLAY_GROUP_ORDER: SearchDisplayGroup[] = [
  "pages",
  "people",
  "recruits",
  "operations",
  "documents",
  "reports",
  "actions",
];

export const SEARCH_DISPLAY_GROUP_LABEL: Record<SearchDisplayGroup, string> = {
  pages: "Pages",
  people: "People",
  recruits: "Recruits",
  operations: "Operations",
  documents: "Documents",
  reports: "Reports",
  actions: "Actions",
};

/** Map granular object types → UI section. Unknown types stay searchable via registry. */
export function displayGroupForType(type: SearchObjectType): SearchDisplayGroup {
  switch (type) {
    case "pages":
      return "pages";
    case "people":
    case "coaches":
    case "staff":
      return "people";
    case "recruits":
      return "recruits";
    case "operations":
    case "practices":
    case "trips":
      return "operations";
    case "documents":
      return "documents";
    case "reports":
    case "saved_views":
    case "research_projects":
      return "reports";
    case "actions":
      return "actions";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** @deprecated Prefer `SearchObjectType` — kept as an alias for BP-021D call sites. */
export type CommandCategory = SearchObjectType;

/** @deprecated Prefer `SEARCH_DISPLAY_GROUP_LABEL` + `displayGroupForType`. */
export const COMMAND_CATEGORY_LABEL: Record<string, string> = {
  ...SEARCH_DISPLAY_GROUP_LABEL,
  coaches: "People",
  staff: "People",
  practices: "Operations",
  trips: "Operations",
  research_projects: "Reports",
  saved_views: "Reports",
};

/** Shared runtime helpers passed into `perform`. */
export type CommandContext = {
  navigate: (href: string) => void;
  close: () => void;
  notify: (message: string) => void;
};

/** Person preview payload (never navigates by itself). */
export type PersonPreviewData = {
  kind: "person";
  photoUrl?: string;
  initials: string;
  name: string;
  roles: string[];
  roleLabel: string;
  classYear?: number;
  denisonIdDisplay: string;
  utr?: number;
  wtn?: number;
  hometown?: string;
  email?: string;
  phone?: string;
  recentActivity?: string;
};

export type RecruitPreviewData = {
  kind: "recruit";
  name: string;
  rating?: string;
  status?: string;
  notes?: string;
  upcomingTasks?: string[];
};

export type OperationsPreviewData = {
  kind: "operations";
  title: string;
  date?: string;
  owner?: string;
  status?: string;
};

export type DocumentPreviewData = {
  kind: "document";
  title: string;
  description?: string;
  lastModified?: string;
};

export type ActionPreviewData = {
  kind: "action";
  explanation: string;
};

export type GenericPreviewData = {
  kind: "generic";
  title: string;
  lines?: Array<{ label: string; value: string }>;
  body?: string;
};

export type CommandPreviewData =
  | PersonPreviewData
  | RecruitPreviewData
  | OperationsPreviewData
  | DocumentPreviewData
  | ActionPreviewData
  | GenericPreviewData;

/**
 * A single searchable entry. Modules register these (or provide them via a
 * `CommandProvider`) — the palette UI never hard-codes module contents.
 */
export type CommandDefinition = {
  id: string;
  /** Granular object type used for grouping + preview switching. */
  objectType: SearchObjectType;
  /**
   * @deprecated Use `objectType`. Still accepted; `registerCommand` copies it
   * to `objectType` when omitted.
   */
  category?: SearchObjectType;
  label: string;
  subtitle?: string;
  keywords?: string[];
  /** Compact initials token (e.g. "KP") for initials search. */
  initials?: string;
  icon?: LucideIcon;
  enabled?: () => boolean;
  /** Optional right-rail preview. Arrow keys update this; Enter runs `perform`. */
  preview?: CommandPreviewData | (() => CommandPreviewData | ReactNode | null);
  perform: (ctx: CommandContext) => void | Promise<void>;
};

export type CommandProvider = {
  id: string;
  /**
   * Optional TTL (ms) for in-memory cache of this provider's results.
   * Defaults to 60s when omitted.
   */
  cacheTtlMs?: number;
  getCommands: () => CommandDefinition[] | Promise<CommandDefinition[]>;
};

export type RankedCommand = CommandDefinition & {
  score: number;
};

/** Normalize a definition so `objectType` is always set. */
export function normalizeCommand(command: CommandDefinition): CommandDefinition {
  const objectType = command.objectType ?? command.category ?? "actions";
  return {
    ...command,
    objectType,
    category: objectType,
  };
}
