import type { FoundSetColumn } from "@/components/found-set";
import type { Person } from "@/features/people/types";
import {
  getDisplayName,
  getHometown,
  getPersonRoleDisplay,
} from "@/features/people/utils";
import { EMPTY_VALUE, formatDisplay, formatUtr, formatWtn } from "@/lib/formatting";

/** Session key for the Team nav surface's published found set. */
export const TEAM_FOUND_SET_MODULE_KEY = "team";

/** Filename stem for Team CSV downloads (`Team-2026-08-05.csv`). */
export const TEAM_FOUND_SET_FILENAME_BASE = "Team";

/**
 * Visible Team List columns for Copy / Export Found Set (BP-025F / BP-027).
 * Matches the desktop directory (excludes Actions).
 */
export const TEAM_FOUND_SET_COLUMNS: FoundSetColumn<Person>[] = [
  {
    id: "name",
    title: "Name",
    accessor: (person) => getDisplayName(person),
  },
  {
    id: "role",
    title: "Role",
    accessor: (person) => getPersonRoleDisplay(person),
  },
  {
    id: "hometown",
    title: "Hometown",
    accessor: (person) => formatDisplay(getHometown(person)),
  },
  {
    id: "classYear",
    title: "Class",
    accessor: (person) => formatDisplay(person.classYear),
  },
  {
    id: "utr",
    title: "UTR",
    accessor: (person) => formatUtr(person.utr),
  },
  {
    id: "wtn",
    title: "WTN",
    accessor: (person) => formatWtn(person.wtn),
  },
];

/** Re-export for callers that need the shared empty glyph. */
export { EMPTY_VALUE };
