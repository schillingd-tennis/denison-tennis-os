import type { Person } from "../../src/features/people/types";
import type { DuplicateGroup } from "./types";

function findDuplicates(values: { value: string; name: string }[]): DuplicateGroup[] {
  const byValue = new Map<string, { original: string; names: string[] }>();

  for (const { value, name } of values) {
    const key = value.trim().toLowerCase();
    if (!key) continue;
    const existing = byValue.get(key);
    if (existing) {
      existing.names.push(name);
    } else {
      byValue.set(key, { original: value.trim(), names: [name] });
    }
  }

  return Array.from(byValue.values())
    .filter((entry) => entry.names.length > 1)
    .map((entry) => ({ value: entry.original, names: entry.names }));
}

export function findDuplicateDenisonIds(people: Person[]): DuplicateGroup[] {
  return findDuplicates(
    people
      .filter((person) => person.denisonId)
      .map((person) => ({ value: person.denisonId as string, name: `${person.firstName} ${person.lastName}` })),
  );
}

export function findDuplicateEmails(people: Person[]): DuplicateGroup[] {
  const entries: { value: string; name: string }[] = [];
  for (const person of people) {
    const name = `${person.firstName} ${person.lastName}`;
    if (person.denisonEmail) entries.push({ value: person.denisonEmail, name });
    if (person.personalEmail) entries.push({ value: person.personalEmail, name });
  }
  return findDuplicates(entries);
}
