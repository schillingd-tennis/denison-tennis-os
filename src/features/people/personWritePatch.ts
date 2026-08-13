/**
 * Person write-patch normalization (BP-037A).
 *
 * Next.js Server Action serialization drops `undefined` keys. A clear of
 * `{ middleName: undefined }` therefore arrives as `{}`, the repository
 * no-ops, and hydration restores the previous value.
 *
 * Convert every present key's `undefined` to `null` on the client before
 * crossing the action boundary so SQL NULL is written.
 */

import type { Person, PersonWritePatch } from "./types";

/** Normalize a client patch so clears survive Server Action serialization. */
export function toPersonWritePatch(
  patch: Partial<Person> | PersonWritePatch,
): PersonWritePatch {
  const out: PersonWritePatch = {};

  for (const key of Object.keys(patch) as (keyof Person)[]) {
    const value = patch[key];
    // Key is present (including explicit undefined). undefined → null for the wire.
    if (value === undefined) {
      out[key] = null;
    } else {
      Object.assign(out, { [key]: value });
    }
  }

  return out;
}
