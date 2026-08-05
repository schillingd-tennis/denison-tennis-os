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
- This blueprint originally imported players only. As of BP-021 the same
  pipeline imports **all people** from the Airtable export (players,
  coaches, staff, alumni) through `classifyPersonRow` + the Person role
  model. Duplicate name rows (e.g. alumni + coach) are merged into one
  Person with unioned roles. Parents remain a later blueprint.- Stable `id`s are derived from name (e.g. `player-kael-shah`), never from
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

## BP-013 — Universal Person Editor

- There is exactly **one** editor for `Person`, in `src/components/editor/`
  — not a separate one per role. It knows nothing about "Player" vs
  "Recruit" vs "Coach"; any future workspace edits a `Person` (or another
  record shape) by wiring the same primitives (`FormProvider`,
  `EditableField`, `EditableSection`, `EditorToolbar`,
  `ValidationMessage`, `DirtyTracker`) to its own fields and its own
  validator, the way `PlayerWorkspace` does today.
- The primitives are deliberately generic — `EditableField` takes an
  explicit `value`/`onChange`/`mode`, not a `Person` field key — so they
  carry no assumption about which record type they're editing.
  Record-specific rules (required fields, format checks) live one layer up
  (e.g. `src/features/people/validation.ts`), composed from the generic
  validators in `src/components/editor/validators.ts`.
- Editing is **local-state only** — `FormProvider` holds `original`/`draft`
  in React state; `save()` commits `draft` into `original` and calls an
  optional `onSave` callback. There is no persistence layer yet (no
  writes to `data.ts`, no API, no database) — that is explicitly out of
  scope until a later blueprint. A page refresh always reverts to the
  last-generated `data.ts`.
- View mode must look like the read-only workspace did before this
  blueprint. Two sections were added rather than restructuring existing
  ones, since no existing surface showed these fields at all: **Personal**
  (first/middle/last/preferred name, date of birth) and **Notes** (a new
  optional `Person.notes` field). "Permanent Address" was renamed
  **Address** and gained itemized inputs in edit mode, while view mode
  keeps the single combined address line it already had.
- `status` and `playerStatus` are edited inline in the header (the badge
  becomes a `<select>` in edit mode) rather than as additional rows in the
  Denison/Tennis sections — avoids showing the same value twice on the
  page while still satisfying the "Status" field requirement.
- `denisonId` (Denison Information) is intentionally **not** editable —
  it's a system identifier, not a field a coach edits by hand — and is
  rendered with the existing read-only `InformationField`, unchanged.
- Parents (`FamilyContact`) remain read-only cards; editing family
  relationships is out of scope for this blueprint.
- The "leave with unsaved changes" guard covers two cases: the native
  `beforeunload` event (refresh/close/typed URL — wired automatically by
  `FormProvider` via `DirtyTracker`), and the in-page "Back to Team" link
  (intercepted and confirmed via `confirmDiscardIfDirty`). It does not
  intercept arbitrary in-app `<Link>` navigation app-wide (e.g. sidebar
  nav) — a general App Router navigation guard is a separate concern from
  "build the editing framework" and can be added later if needed.

## BP-021 — People Foundation

- **People** is the internal domain model (`src/features/people/`). **Team**
  remains the user-facing left-nav label and `/team` URL prefix — no routing
  rename in this blueprint.
- Players, coaches, alumni, and future staff share one `Person` foundation.
  A person may hold multiple `roles` (`player` | `coach` | `alumni` |
  `staff`) without duplicate Person records. Roles are stored as
  `production_people.roles text[]` — not overloaded onto `status` or
  `player_status`.
- Optional `title` holds coaching/job titles (e.g. Head Coach).
- Team directory filters: All | Players | Coaches | Alumni (default
  Players). Players = current + `player` role; Coaches = `coach` role;
  Alumni = `alumni` role or `status = alumni`.
- Coaches (and other program roles) import through the normal Airtable
  pipeline — no hard-coded coach-only overlay module. Class values like
  `Coach`, `Head Coach`, or `Assistant Coach` map to the `coach` role.
  Same-name rows merge (Andy Mackler alumni + coach → one Person).
- Reserved stable ids for development coaches (`person-david-schilling`,
  `person-andy-mackler`) live in `scripts/import/knownPeople.ts` so re-imports
  update those rows instead of creating `player-*` duplicates. Migration
  `0004_seed_coach_people.sql` upserts verified Airtable fields for local
  testing (temporary seed).
- Migration `0003_people_roles_and_coaches.sql` adds `roles`/`title` and
  backfills roles from status only.
- `PersonRoleBadge` shows `title` or a role-derived label under every name
  in List and Card views.
- UI lives under `src/features/people/components/` (PeopleDirectory,
  PersonList, PersonCard, PersonWorkspace). Status dots remain; Status
  column stays removed (BP-020E).

## BP-021B — Local Development Environment

- Local Supabase (Docker + CLI) is the primary development database.
  Workflow: Local → Test → Commit → Push → Hosted (`npm run db:push`).
- CLI is a project devDependency; use `npm run db:*` scripts.
- `supabase/config.toml` seeds from `supabase/seed.sql` on `db reset`.
- Migration `0005_grant_production_people_privileges.sql` grants
  SELECT/UPDATE to Data API roles (required on newer local stacks).
- Full guide: `docs/LOCAL_DEVELOPMENT.md`.
