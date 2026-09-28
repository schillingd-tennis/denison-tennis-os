import type { AcademicSeason } from "./types";

export type GradeImportRow = {
  termKey: string;
  termLabel: string;
  season: AcademicSeason;
  calendarYear: number;
  academicYear: string;
  sortOrder: number;
  sourceName: string;
  classLevel: string;
  creditHours: number;
  semesterGpa: number;
  midtermGpa: number | null;
};

const termPattern = /^(Fall|Spring)\s+(20\d{2})$/;
const rowPattern = /\{\s*name:'([^']+)'\s*,\s*cls:'([^']+)'\s*,\s*hrs:([\d.]+)\s*,\s*semGpa:([\d.]+)\s*,\s*midGpa:([\d.]+)\s*\},?/;

export function canonicalImportName(sourceName: string): string {
  const explicit: Record<string, string> = {
    "Grahame Turner, Archie": "Archie Turner",
    "Osmo, Tomer": "Tomer Ozmo",
    "Garcia Colin, Daniel": "Daniel Garcia",
    "Kallambella, Arya": "Arya Ganapathy Kallambella",
  };
  if (explicit[sourceName]) return explicit[sourceName];
  const [last, first] = sourceName.split(",").map((part) => part.trim());
  return first ? `${first} ${last}` : sourceName.trim();
}

export function normalizeAcademicName(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

export function parseGradeImport(source: string): GradeImportRow[] {
  const rows: GradeImportRow[] = [];
  let term: Omit<GradeImportRow, "sourceName" | "classLevel" | "creditHours" | "semesterGpa" | "midtermGpa"> | null = null;
  let sortOrder = 0;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = line.match(termPattern);
    if (heading) {
      const season = heading[1].toLowerCase() as AcademicSeason;
      const calendarYear = Number(heading[2]);
      const academicStart = season === "fall" ? calendarYear : calendarYear - 1;
      sortOrder += 1;
      term = {
        termKey: `${season === "fall" ? "f" : "s"}${calendarYear}`,
        termLabel: `${heading[1]} ${calendarYear}`,
        season,
        calendarYear,
        academicYear: `${academicStart}-${String(academicStart + 1).slice(-2)}`,
        sortOrder,
      };
      continue;
    }

    const match = line.match(rowPattern);
    if (!match) continue;
    if (!term) throw new Error(`Grade row appears before a semester heading: ${line}`);
    rows.push({
      ...term,
      sourceName: match[1],
      classLevel: match[2],
      creditHours: Number(match[3]),
      semesterGpa: Number(match[4]),
      midtermGpa: Number(match[5]),
    });
  }

  if (!rows.length) throw new Error("No grade rows were found in the import file.");
  return rows;
}
