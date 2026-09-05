/**
 * Drill Library directory model — table rows, search, filters, views, and
 * usage metrics derived from Daily Practice plans.
 */
import {
  applyFilters,
  resolveFilterSelection,
  type FilterDefinition,
} from "@/lib/filtering";
import type { ColumnDef } from "@/components/data-table/types";

import type { DailyPracticePlan, PracticeDrill } from "./types";

/** Count of drills seeded from Drills.csv via migration 0045. */
export const SEEDED_DRILL_COUNT = 26;

export const DRILL_FILTER_CLEAR_ID = "all";

export type DrillLibraryView =
  | "all"
  | "competitive"
  | "serve-return"
  | "doubles"
  | "never-used"
  | "recently-used";

export const DRILL_LIBRARY_VIEW_OPTIONS: readonly {
  value: DrillLibraryView;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "competitive", label: "Competitive" },
  { value: "serve-return", label: "Serve+Return" },
  { value: "doubles", label: "Doubles" },
  { value: "never-used", label: "Never Used" },
  { value: "recently-used", label: "Recent" },
] as const;

export type DrillUsageMetrics = {
  timesUsed: number;
  lastUsed: string | null;
};

export type DrillLibraryRow = PracticeDrill & {
  focus: string;
  focusTags: string[];
  players: string;
  competitive: boolean;
  timesUsed: number;
  lastUsed: string | null;
};

export type DrillSortKey =
  | "name"
  | "category"
  | "players"
  | "competitive"
  | "lastUsed"
  | "timesUsed";

const RECENT_USED_DAYS = 45;

export function isCompetitiveDrill(drill: PracticeDrill): boolean {
  return (drill.category || "").trim().toLowerCase() === "games" || (drill.category || "").trim().toLowerCase() === "games";
}

export function deriveDrillUsage(
  plans: readonly DailyPracticePlan[],
): Map<string, DrillUsageMetrics> {
  const usage = new Map<string, DrillUsageMetrics>();
  for (const plan of plans) {
    const seen = new Set<string>();
    for (const drill of plan.drills) {
      if (seen.has(drill.id)) continue;
      seen.add(drill.id);
      const current = usage.get(drill.id) ?? { timesUsed: 0, lastUsed: null };
      current.timesUsed += 1;
      if (!current.lastUsed || plan.planDate > current.lastUsed) {
        current.lastUsed = plan.planDate;
      }
      usage.set(drill.id, current);
    }
  }
  return usage;
}

export function buildDrillLibraryRows(
  drills: readonly PracticeDrill[],
  plans: readonly DailyPracticePlan[],
): DrillLibraryRow[] {
  const usage = deriveDrillUsage(plans);
  return drills.map((drill) => {
    const metrics = usage.get(drill.id);
    const focusTags = drill.tags.filter(Boolean);
    return {
      ...drill,
      focus: focusTags.join(", "),
      focusTags,
      players: "",
      competitive: isCompetitiveDrill(drill),
      timesUsed: metrics?.timesUsed ?? 0,
      lastUsed: metrics?.lastUsed ?? null,
    };
  });
}

export function drillSearchHaystack(row: DrillLibraryRow): string {
  return [
    row.name,
    row.description,
    row.category,
    row.focus,
    row.sourceTags,
    row.notes,
    row.players,
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesDrillSearch(row: DrillLibraryRow, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  return drillSearchHaystack(row).includes(trimmed);
}

function tagMatches(row: DrillLibraryRow, needles: string[]): boolean {
  const haystack = [row.focus, row.sourceTags, row.name, row.description]
    .join(" ")
    .toLowerCase();
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

export function matchesDrillView(row: DrillLibraryRow, view: DrillLibraryView, today = new Date()): boolean {
  switch (view) {
    case "all":
      return true;
    case "competitive":
      return row.competitive;
    case "serve-return":
      return tagMatches(row, ["serve", "return"]);
    case "doubles":
      return tagMatches(row, ["doubles", "dubs"]);
    case "never-used":
      return row.timesUsed === 0;
    case "recently-used": {
      if (!row.lastUsed) return false;
      const cutoff = new Date(today);
      cutoff.setUTCDate(cutoff.getUTCDate() - RECENT_USED_DAYS);
      const cutoffIso = cutoff.toISOString().slice(0, 10);
      return row.lastUsed >= cutoffIso;
    }
    default:
      return true;
  }
}

export function buildDrillFilterDefinitions(
  rows: readonly DrillLibraryRow[],
): FilterDefinition<DrillLibraryRow>[] {
  const categories = [
    ...new Set(rows.map((row) => row.category.trim() || "Uncategorized")),
  ].sort((a, b) => a.localeCompare(b));

  const focusTags = [
    ...new Set(rows.flatMap((row) => row.focusTags.map((tag) => tag.trim()).filter(Boolean))),
  ].sort((a, b) => a.localeCompare(b));

  const categoryDefs: FilterDefinition<DrillLibraryRow>[] = categories.map((category) => ({
    id: `category:${category}`,
    label: category,
    category: "category",
    predicate: (row) => (row.category.trim() || "Uncategorized") === category,
  }));

  const focusDefs: FilterDefinition<DrillLibraryRow>[] = focusTags.map((tag) => ({
    id: `focus:${tag}`,
    label: tag,
    category: "focus",
    predicate: (row) => row.focusTags.some((value) => value === tag),
  }));

  return [
    ...categoryDefs,
    ...focusDefs,
    {
      id: "players:set",
      label: "Set",
      category: "players",
      predicate: (row) => Boolean(row.players.trim()),
    },
    {
      id: "players:none",
      label: "Not set",
      category: "players",
      predicate: (row) => !row.players.trim(),
    },
    {
      id: "competitive:yes",
      label: "Yes",
      category: "competitive",
      predicate: (row) => row.competitive,
    },
    {
      id: "competitive:no",
      label: "No",
      category: "competitive",
      predicate: (row) => !row.competitive,
    },
    {
      id: "usage:recent",
      label: "Recently Used",
      category: "usage",
      predicate: (row) => matchesDrillView(row, "recently-used"),
    },
    {
      id: "usage:never",
      label: "Never Used",
      category: "usage",
      predicate: (row) => row.timesUsed === 0,
    },
  ];
}

export const DRILL_FILTER_GROUPS: readonly { category: string; label: string }[] = [
  { category: "category", label: "Category" },
  { category: "focus", label: "Focus" },
  { category: "players", label: "Players" },
  { category: "competitive", label: "Competitive" },
  { category: "usage", label: "Usage" },
];

export function filterDrillLibraryRows(
  rows: readonly DrillLibraryRow[],
  options: {
    query: string;
    view: DrillLibraryView;
    activeFilterIds: readonly string[];
    definitions: readonly FilterDefinition<DrillLibraryRow>[];
  },
): DrillLibraryRow[] {
  const searched = rows.filter((row) => matchesDrillSearch(row, options.query));
  const viewed = searched.filter((row) => matchesDrillView(row, options.view));
  return applyFilters(viewed, options.definitions, options.activeFilterIds);
}

export function resolveDrillFilterSelection(
  activeIds: readonly string[],
  clickedId: string,
): string[] {
  return resolveFilterSelection(activeIds, clickedId, DRILL_FILTER_CLEAR_ID);
}

export const DRILL_LIBRARY_COLUMNS: ColumnDef<DrillLibraryRow, DrillSortKey>[] = [
  {
    id: "name",
    title: "Drill",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.name,
    defaultSort: "asc",
  },
  {
    id: "category",
    title: "Category",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.category || "Uncategorized",
  },
  {
    id: "players",
    title: "Players",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.players,
  },
  {
    id: "competitive",
    title: "Competitive",
    sortable: true,
    sortType: "enum",
    enumOrder: ["yes", "no"],
    accessor: (row) => (row.competitive ? "yes" : "no"),
  },
  {
    id: "lastUsed",
    title: "Last Used",
    sortable: true,
    sortType: "date",
    accessor: (row) => row.lastUsed,
    defaultSort: "desc",
  },
  {
    id: "timesUsed",
    title: "Times Used",
    sortable: true,
    sortType: "number",
    accessor: (row) => row.timesUsed,
    defaultSort: "desc",
    align: "right",
  },
];

export function formatDrillLastUsed(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}
