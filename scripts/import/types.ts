import type { Person } from "../../src/features/people/types";

/** A single row of `Players.csv`, keyed by the exact source column headers. */
export type RawPlayerRow = Record<string, string>;

export type SkippedRow = {
  name: string;
  reason: string;
};

export type DuplicateGroup = {
  value: string;
  names: string[];
};

export type MappedPlayer = {
  person: Person;
  warnings: string[];
};

export type ImportReport = {
  timestamp: string;
  source: string;
  totalRowsInFile: number;
  totalPlayersImported: number;
  totalSkipped: number;
  skipped: SkippedRow[];
  warnings: string[];
  duplicates: {
    denisonIds: DuplicateGroup[];
    emails: DuplicateGroup[];
  };
  unknownColumns: string[];
  fieldsWithNoSourceColumn: string[];
  missingValueCounts: Record<string, number>;
};
