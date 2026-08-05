import type { FoundSetColumn } from "@/components/found-set";
import { formatPhoneDisplay } from "@/components/inline-edit";
import type { Person } from "@/features/people/types";
import {
  formatDenisonIdDisplay,
  getDisplayName,
  getHometown,
} from "@/features/people/utils";

/** Session key for the Team nav surface's published found set. */
export const TEAM_FOUND_SET_MODULE_KEY = "team";

/** Filename stem for Team CSV downloads (`Team-2026-08-05.csv`). */
export const TEAM_FOUND_SET_FILENAME_BASE = "Team";

/**
 * Visible Team List columns for Copy / Export Found Set.
 * Matches the desktop list (excludes the Actions column).
 */
export const TEAM_FOUND_SET_COLUMNS: FoundSetColumn<Person>[] = [
  {
    id: "name",
    title: "Name",
    accessor: (person) => getDisplayName(person),
  },
  {
    id: "denisonId",
    title: "D#",
    accessor: (person) => formatDenisonIdDisplay(person.denisonId),
  },
  {
    id: "phone",
    title: "Phone",
    accessor: (person) => formatPhoneDisplay(person.cellPhone) ?? "",
  },
  {
    id: "email",
    title: "Email",
    accessor: (person) => person.personalEmail ?? person.denisonEmail ?? "",
  },
  {
    id: "hometown",
    title: "Hometown",
    accessor: (person) => getHometown(person) ?? "",
  },
  {
    id: "classYear",
    title: "Class",
    accessor: (person) => person.classYear,
  },
  {
    id: "utr",
    title: "UTR",
    accessor: (person) => (person.utr !== undefined ? person.utr.toFixed(1) : ""),
  },
  {
    id: "wtn",
    title: "WTN",
    accessor: (person) => (person.wtn !== undefined ? person.wtn.toFixed(1) : ""),
  },
];
