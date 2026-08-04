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
 * Generates a stable, human-readable id (e.g. `player-kael-shah`) derived
 * from name only — never from row position or an Airtable record id, both
 * of which can change independently of who the person is.
 *
 * Collisions (two players with the same first + last name) are resolved
 * with a numeric suffix and must be flagged by the caller as a warning.
 */
export function generateStableId(
  firstName: string,
  lastName: string,
  usedIds: Set<string>,
): { id: string; collided: boolean } {
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
