# Denison Tennis OS — Locked Decisions

A running log of product/architecture decisions that should not be
re-litigated casually. If a future sprint needs to change one of these,
update this file explicitly rather than silently drifting from it.

## BP-005 — People Data Model and Team Directory

- Team is the first completed module.
- People records are the source of truth. A person exists once, identified
  by `id`, and every module that needs to reference a person (Team,
  Recruiting, Operations, etc.) should reference that same record rather
  than creating a parallel one.
- The Team Directory shows a limited subset of player data, chosen for
  scannability (photo/initials, name, status, class year, hometown, major,
  UTR, contact icons).
- Full information belongs in the Player Workspace, not the Directory.
- Current and Alumni are the initial `status` values for a person.

## BP-007 — Player Workspace Refinement

- The Player Workspace is the operational view of a Person with a player
  role — it is where the full record lives and is worked from day to day.
- The Team Directory remains a lightweight browsing view; it does not grow
  additional fields as the Workspace grows.
- Sensitive and detailed information (Denison ID, dorm/room, full permanent
  address, date of birth, family contacts, etc.) belongs in the Player
  Workspace, not the Directory.
- Family contacts are related Person records — a parent/guardian is a real
  person tied to a player via a relationship, not a set of free-text fields
  on the player. (Modeled today as the lighter `FamilyContact` type; see
  `docs/DATA_MODEL.md`.)
- Empty future modules (Performance, Academics, Travel, Documents) must not
  be presented as active tabs or clickable features until they have real
  functionality behind them — an understated, clearly-disabled "Coming
  Later" section is used instead.
- Performance, Academics, Travel, and Documents will be added in future
  sprints; they are intentionally out of scope until then.

## BP-011 — Architecture Blueprint

- The UI never talks directly to Airtable, Coda, Supabase, or any other
  external data source. All data access flows through repositories.
- Repositories isolate data-source details behind stable interfaces —
  they are the only layer permitted to change when the underlying data
  source changes.
- External records are mapped into internal domain objects (e.g.
  `Person`) at the infrastructure/repository boundary. External field
  names must never leak into UI components.
- Internal domain IDs and external source IDs (e.g. `airtableRecordId`,
  `codaRowId`) remain distinct. External IDs may be stored alongside a
  domain object but must not replace its internal identity.
- Airtable (and any future data source) read integration precedes write
  integration — reads are proven stable before the app is allowed to
  create or update records in that source.
- See `docs/ARCHITECTURE.md` for the full technical architecture this is
  drawn from.

## BP-012 — Production People Import

- `src/features/people/data.ts` is no longer hand-written sample data — it
  is a generated file, produced by `npm run import:players`
  (`scripts/import-players.ts`) from `private-imports/Players.csv`. Do not
  hand-edit it; re-run the import instead.
- This blueprint imports **players only**. Rows with `Class = Coach` are
  excluded from the People data entirely (they are out of scope, not
  errors) and are listed in the import report's `skipped` section. Parents
  and coaches get their own import in a later blueprint.
- Stable `id`s are derived from name (e.g. `player-kael-shah`), never from
  CSV row position or the Airtable record id in the `Player ID` column —
  consistent with the BP-011 rule that external IDs never become domain
  identity. The Airtable record id is not persisted on `Person` at all
  today; it is treated as an unmapped column.
- `Person` gained two additions to support this import: `middleName`
  (Identity) and `relationships: PersonRelationship[]` (a new
  "Relationships" group). Every imported player gets `relationships: []`
  today — a forward-looking placeholder that a later blueprint (parent
  import) will populate. This does not replace `FamilyContact`; see
  `docs/DATA_MODEL.md`.
- The source export has no columns for `utr`, `wtn`, `dominantHand`,
  `heightInches`, `weightLbs`, `dorm`, or `roomNumber` — those fields are
  simply left blank on every imported player until a data source for them
  exists. The Team module already renders their absence gracefully.
- Class standing (Freshman/Sophomore/Junior/Senior) is converted to a
  graduation-year `classYear` using a single "current senior class year"
  constant in `scripts/import/normalize.ts` — bump it by one at the start
  of each academic year. Alumni rows (`Class = Archive`) have no reliable
  way to derive `classYear` from this export and are left blank.
- Every import run regenerates a JSON report at
  `private-imports/import-report.json` (gitignored, since it echoes real
  player data) covering counts, skipped rows, duplicate Denison IDs/emails,
  unknown columns, and missing-value counts per field.
