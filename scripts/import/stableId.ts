import { lookupKnownPerson } from "./knownPeople";

/** Slugifies a name fragment: lowercase, ASCII-only, hyphen-separated. */
function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Generates a stable, human-readable id derived from name only — never from
 * row position or an Airtable record id.
 *
 * Known people (e.g. David Schilling, Andy Mackler) use reserved `person-*`
 * ids so Airtable re-imports update the same rows rather than duplicating.
 *
 * Other collisions are resolved with a numeric suffix.
 */
export function generateStableId(
  firstName: string,
  lastName: string,
  usedIds: Set<string>,
): { id: string; collided: boolean; knownTitle?: string } {
  const known = lookupKnownPerson(firstName, lastName);
  if (known) {
    usedIds.add(known.id);
    return { id: known.id, collided: false, knownTitle: known.title };
  }

  const base = `player-${slugify(firstName)}-${slugify(lastName)}`;
  let id = base;
  let suffix = 2;
  let collided = false;

  while (usedIds.has(id)) {
    collided = true;
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(id);
  return { id, collided };
}
