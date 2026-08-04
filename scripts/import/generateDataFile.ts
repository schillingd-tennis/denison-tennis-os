import type { Person } from "../../src/features/people/types";

/**
 * Renders the production `src/features/people/data.ts` module. Fields with
 * an `undefined` value are dropped automatically by `JSON.stringify`, so
 * the emitted objects only contain the keys that actually have data — the
 * same convention the hand-written sample file followed.
 */
export function generateDataFileContents(people: Person[], generatedAt: string): string {
  const body = JSON.stringify(people, null, 2)
    // Drop the quotes JSON.stringify puts around object keys so the file
    // reads like an ordinary TypeScript object literal.
    .replace(/^(\s*)"([A-Za-z0-9_]+)":/gm, "$1$2:");

  return `import type { Person } from "./types";

/**
 * Production Denison Tennis roster.
 *
 * GENERATED FILE — do not hand-edit. Produced by \`npm run import:players\`
 * (see \`scripts/import-players.ts\`) from \`private-imports/Players.csv\`.
 * Re-run the import to regenerate; manual edits here will be overwritten.
 *
 * Generated: ${generatedAt}
 * Records: ${people.length}
 */
export const people: Person[] = ${body};
`;
}
