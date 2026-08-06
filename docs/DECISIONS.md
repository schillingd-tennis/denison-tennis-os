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

- The UI never talks directly to Airtable, Coda, or other external
  providers. Runtime access goes through repositories to the application
  database (system of record).
- Repositories isolate provider/storage details behind stable interfaces —
  they are the only layer that must change when a sync source changes.
- External records are mapped into internal domain objects (e.g.
  `Person`) at the adapter/repository boundary. External field names must
  never leak into UI components.
- Internal domain IDs and external source IDs (e.g. `airtableRecordId`,
  `codaRowId`) remain distinct. External IDs may be stored alongside a
  domain object but must not replace its internal identity.
- Provider read sync precedes any write-back to that provider.
- See `docs/ARCHITECTURE.md` and `docs/SYSTEM_OF_RECORD.md`.

## BP-012 — Production People Import

- `src/features/people/data.ts` is no longer hand-written sample data — it
  is a generated file, produced by `npm run import:players`
  (`scripts/import-players.ts`) from `private-imports/Players.csv`. Do not
  hand-edit it; re-run the import instead.
- This blueprint originally imported players only. As of BP-021 the same
  pipeline imports **all people** from the current synchronization source
  (Airtable CSV export: players, coaches, staff, alumni) through
  `classifyPersonRow` + the Person role model. Duplicate name rows
  (e.g. alumni + coach) are merged into one Person with unioned roles.
  Parents remain a later blueprint.
- Stable `id`s are derived from name (e.g. `player-kael-shah`), never from
  CSV row position or an external record id in the `Player ID` column —
  consistent with the BP-011 rule that external IDs never become domain
  identity. Provider record ids are not persisted on `Person` today.
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
- Team directory filters (superseded by BP-024E): All | Current | Coaches |
  Alumni.
- Coaches (and other program roles) import through the normal People sync
  pipeline — no hard-coded coach-only overlay module. Class values like
  `Coach`, `Head Coach`, or `Assistant Coach` map to the `coach` role.
  Same-name rows merge (Andy Mackler alumni + coach → one Person).
- Reserved stable ids for development coaches (`person-david-schilling`,
  `person-andy-mackler`) live in `scripts/import/knownPeople.ts` so re-imports
  update those rows instead of creating `player-*` duplicates. Migration
  `0004_seed_coach_people.sql` upserts verified provider-synced fields for
  local testing (temporary seed).
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
- `supabase/config.toml` seeds from `supabase/seed.sql` on `db reset` only
  (not on every `db:start`).
- Migration `0005_grant_production_people_privileges.sql` grants
  SELECT/UPDATE to Data API roles (required on newer local stacks).
- Full guide: `docs/LOCAL_DEVELOPMENT.md`.

## BP-021D — Global Command Palette

- ⌘K / Ctrl+K opens a floating command palette from every authenticated
  shell page (mounted in `AppShell`; excluded from `/login`).
- Commands are **registered** via `commandRegistry` (`registerCommand` /
  `registerProvider`) — future modules contribute entries without editing
  the palette UI. Built-ins live in `registerDefaultCommands`.
- Groups: Pages / People / Actions. People rows load through
  `listPalettePeople` on open. Fuzzy match is local (no extra package).
- Found-set Copy / Export actions read `readCurrentFoundSetSnapshot`
  (last published session snapshot). Developer DB actions stay local-dev only.

## BP-021E — Universal Search & Preview

- The palette is the primary keyboard search/navigation surface. Modules
  register searchable objects by `SearchObjectType` (pages, people,
  recruits, staff, coaches, operations, practices, trips, documents,
  research_projects, saved_views, reports, actions). The UI never
  hard-codes future module rows — only display-group labels/order.
- Display groups: Pages / People / Recruits / Operations / Documents /
  Reports / Actions. Granular types fold into these (e.g. coaches →
  People, practices → Operations).
- Fuzzy search includes partial match + initials (e.g. `KP`). Provider
  results are cached (~60s); `warmCommandPalette` prefetches on idle so
  reopen stays near-instant.
- Optional right-rail preview updates on ↑↓ highlight only; Enter runs
  `perform`. Preview payloads are attached on each `CommandDefinition`.

## BP-021F — Pinned Favorites & Recent Items

- Palette empty/search lists order: **Favorites → Recent → results**.
  Favorites never duplicate into Recent. Arrow keys traverse all sections.
- Any searchable object can be pinned (person, page, action, and future
  types). Stored fields: objectId, objectType, displayName, optional
  iconKey / commandId / href.
- Pin/Unpin via palette pin control and `FavoriteToggleButton` on object
  pages (Person Workspace today; Recruits/Docs/Reports reuse the same
  button when those surfaces exist). Delete/Backspace does not unpin.
- Persistence is localStorage behind `KeyValueStorage` so a later Supabase
  adapter can replace it without UI changes (`setPalettePersistenceStorage`).

## BP-022A — People Module Polish

- People remains the single Person object model. Roles may include
  `recruit` (type vocabulary); Recruiting CRM itself is a later BP.
- Role badges are standardized via `RoleBadge` + `getPersonRoleBadges`
  (title-aware: Head Coach / Assistant Coach; multi-role supported).
- Polish only: directory density, coach workspace presentation, quieter
  placeholders — no Recruiting / Operations / Research features.

## BP-022B — Badge System Refinement

- **RoleBadge** — quiet outlined chip only (transparent, 1px border, no
  color fills). Identifies a Person. Not a notification.
- **Status** — Current / Alumni via `StatusDot` + plain text
  (`PersonStatusLabel`). No status pills. Alumni uses a hollow ring (○).
- **NotificationPill** — filled colorful pills reserved exclusively for
  future alerts/counts (messages, tasks due, etc.).
- Do not use filled pills for roles, program status, or contact labels.

## BP-022C — Quiet Role Badges

- RoleBadge is a lightweight identity tag: soft `bg-app-background/60`,
  `border-border/30`, `text-text-secondary/80`, 11px semibold, full pill.
  Visual weight stays below name and status. Neutral only — no role colors.

## BP-022D — Identity Metadata Refinement

- Identity is quiet metadata, not a control. No pills/chips/borders/fills
  for roles. `RoleBadge` is plain `text-[11px] font-medium text-text-secondary`.
- Never surface "Player" in the UI — default roster identity is silent.
- Show labels only when they add information: titles (Head Coach,
  Assistant Coach, Athletic Trainer, …), Coach, Recruit, Alumni, Staff,
  Volunteer. Multi-role people join with " · ".
- Filled pills remain reserved for Notifications / Alerts / Counts /
  Action Required.

## BP-022E — Local Data Integrity & Development Workflow

- Root cause of disappearing local edits: `seed.sql` used
  `ON CONFLICT DO UPDATE` for **all** columns (including UTR/WTN/notes),
  and Developer “Re-run Seed” could fall back to a full `db reset`.
- Superseded for conflict semantics by BP-026B (fill-nulls + Force Refresh).
- `npm run db:seed` applies seed without dropping the DB; never falls
  back to reset. `npm run db:reset` remains the only intentional full wipe.
- `db:start` / `db:stop` / `dev` / git / browser refresh do not rewrite People.

## BP-023A — System of Record Architecture

- Denison Tennis OS is the long-term **system of record**. External tools
  (Airtable, TRN, UTR, etc.) are import / sync adapters — not owners.
- Person-first: one Person persists across Recruit → Player → Alumni → …
  without duplicate records.
- See `docs/SYSTEM_OF_RECORD.md` / `docs/DATA_OWNERSHIP.md`.

## BP-026B — Supabase System of Record Persistence

- After initial import, People are owned by Supabase. Airtable is import-only.
- Runtime edits are authoritative for hometown, role, class, status, D#,
  contact, UTR, WTN, notes, relationships (and future evaluations/tags).
- `npm run db:seed` uses `coalesce(existing, excluded)` — fill missing only.
- Force Refresh hard-replace superseded/disabled by BP-029A.
- List `parseHometown` must not NULL `state` when the user edits city-only.

## BP-029A — Ownership Lock ✅ COMPLETED / BASELINE

**Status:** Accepted 2026-08-06. Validated end-to-end. **Not an active work item.**
Do not reopen or revise unless a bug is discovered. Later BP-029 phases (if any)
build on this baseline without relaxing these rules.

- Supabase is permanent SoR; Airtable is bootstrap / fill-null only.
- All Person profile fields: Imported Once → OS Managed (no Airtable overwrite).
- Normal seed creates missing rows and fills NULLs only; never blank-wipes.
- `db:seed:force-refresh` and Force Refresh developer action are **disabled**.
- Runtime edits continue to write only to Supabase.
- No schema / UI / Team Directory changes in this phase.
- Invariants: `npx tsx scripts/assert-ownership-lock.ts`.
- Canonical docs: `DATA_OWNERSHIP.md`, `SYSTEM_OF_RECORD.md`, `scripts/fieldOwnership.ts`.

## BP-027 — Global Data Formatting Standards

- Shared presentation helpers live in `src/lib/formatting`.
- UTR/WTN/GPA → 2 decimals; percentages → 1 decimal + `%`; dates →
  `Aug 5, 2026`; times → `3:30 PM`; empty → `—` (`EMPTY_VALUE`).
- Components must not duplicate `toFixed` / ad-hoc date formatting.
- Sorting, filtering, search, and persistence keep raw values.

## BP-028A — Sticky Actions Column

- OS data tables: sticky Name (left) + sticky Actions (right); middle scrolls.
- Shared classes in `src/components/data-table/stickyColumns.ts`.
- Actions column fixed width fits Call / Text / Email without clip/wrap/shrink.

## BP-028B — Team Directory Column Optimization

- Default directory widths in `directoryColumnWidths.ts`:
  Name 240 · Role 130 · Hometown 150 · Class 75 · UTR 70 · WTN 70 · Actions 170.
- Name/Hometown single-line ellipsis; no wrap; vertically centered.
- Standard for future directory lists unless a module overrides.
- Target: no horizontal scroll on 1440px; less stretched whitespace.

## BP-028C — Restore Sticky Directory Columns

- Regression: BP-028B fixed table width + `min-w-full` wrapper + `overflow-hidden`
  on sticky cells prevented horizontal overflow and broke `position:sticky`.
- Restore: scrollport owns overflow; table `minWidth` = directory total; sticky
  Name/Actions keep opaque backgrounds + separator/shadow; no overflow-hidden
  on sticky edge cells. Column widths from BP-028B unchanged.

## BP-028D — Sticky Directory Columns & Responsive Layout

- Sticky Name (left) + sticky Actions (right); middle scrolls.
- Superseded on flex behavior by BP-028E.

## BP-028E — Directory Column Sizing & Sticky Behavior

- Layout: `[ Sticky Name (content) ] [ Flexible middle ] [ Sticky Actions (content) ]`.
- Name: fixed 320px (Arya Ganapathy Kallambella + avatar); does **not** absorb leftover width.
- Actions: fixed 152px (Phone / Text / Email + padding); no extra whitespace.
- Role / Hometown / Class / UTR / WTN share remaining width under `table-fixed`.
- Filtering, search, sort, typography, Cards, toolbar unchanged.

## BP-024A — Typography System

- People module typography uses shared `typeRole` stacks in
  `src/components/typography/`. Person names are strongest; metadata is
  quieter; table headers and workspace section titles each have one style.
- No spacing / badge / functional changes — text roles only.

## BP-024C — Command Palette Layout Regression

- Root cause: palette set `document.body.style.overflow = "hidden"`, which
  removes the scrollbar and changes viewport width (cards, toolbar, header
  shift). Residual inline body styles could also linger after close.
- Fix: do not mutate body overflow/padding. Block background `wheel` /
  `touchmove` while open (allow scroll inside palette panels), and clear any
  legacy body overflow/padding on unlock.
- Also: favorites/recents `useSyncExternalStore` getSnapshots must return a
  stable array reference; re-parsing localStorage every call caused
  “Maximum update depth exceeded” and crashed the page on open.

## BP-024D — Team Toolbar Refinement

- Permanent toolbar language: search primary, filters secondary, view toggle
  tertiary — via shared `Toolbar` + `SegmentedControl` (no Team-only chrome).
- Segmented active state is a quiet raised surface (macOS-like), not Denison
  red fill. Search is 44px with a softer border and lighter placeholder.
- Behavior (search, filters, routing, data) unchanged — visual hierarchy only.

## BP-024E — People Filter Semantics

- Directory segments: **All | Current | Coaches | Alumni** (default Current).
  Shared type `PeopleFilter` + `PEOPLE_FILTER_OPTIONS` / `matchesPeopleFilter`
  in `src/features/people/utils.ts` for Team and future modules.
- Current = `player` role + `status = current` (active roster).
- Coaches = `coach` role. Alumni = `alumni` role or `status = alumni`.
- All = every Person. Search behavior unchanged. No Staff / Recruiting filters.
- Persisted in `localStorage` (`denison-tennis-os:people-filter`). Legacy
  value `"players"` migrates to `"current"` on read so obsolete Players
  never resurfaces after refresh or re-login.
