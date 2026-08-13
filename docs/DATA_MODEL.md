# Denison Tennis OS — Data Model

This document describes the `Person` object: the foundational record for
everyone tracked in the OS. It backs the **People** domain (players,
coaches, alumni, and future staff). The left navigation still labels this
surface **Team** and routes remain `/team` — People is the internal domain
name (BP-021).

Source of truth in code: `src/features/people/types.ts` (shape),
`src/features/people/fieldCatalog.ts` (field metadata — labels, sections,
sensitivity, enums; BP-036A), and `src/features/people/data.ts`
(seed/import records). Runtime reads come from Supabase `production_people`
via `src/features/people/repository.ts`.

Modules must consume the field catalog rather than defining their own copies
of Person fields (Adaptive Workspaces, spreadsheet views, column pickers,
exports, filters, search, AI, forms). Spreadsheet / CSV / saved-view
architecture: [`SPREADSHEET_ENGINE.md`](./SPREADSHEET_ENGINE.md) (BP-038A) —
columns resolve only from this catalog.

## The Person object

A `Person` is organized into these groups of fields:

### System
| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable identifier, derived from name (e.g. `player-kael-shah`). Used for routing (`/team/[id]`) — never derive a route or lookup from a row number or an external source id. |
| `createdAt` | `string` (ISO date) | When the record was created. |
| `updatedAt` | `string` (ISO date) | When the record was last modified. |

### Identity
| Field | Type | Notes |
|---|---|---|
| `roleId` / `role` | lookup FK + joined ref | What the person *is* (player, coach, …). See lookups (BP-025A). |
| `statusId` / `status` | lookup FK + joined ref | Coarse program lifecycle. |
| `title` | `string?` | Job / coaching title when applicable (e.g. `Head Coach`). |
| `fullLegalName` | `string?` | Legal name as on travel documents (BP-036A). |
| `firstName` | `string` | Legal/given first name. |
| `middleName` | `string?` | Legal middle name, if on file. |
| `middleInitial` | `string?` | Middle initial; at most one character preferred (BP-036A). |
| `lastName` | `string` | Legal last name. |
| `preferredName` | `string?` | What the person goes by day-to-day, if different from `firstName`. |
| `photoUrl` | `string?` | Optional headshot. Falls back to initials when absent. |

### Personal Information
| Field | Type | Notes |
|---|---|---|
| `dateOfBirth` | `string?` | ISO date. Canonical biographical DOB on the Person record — do not duplicate elsewhere (BP-036A). |

### Contact
| Field | Type |
|---|---|
| `cellPhone` | `string?` |
| `personalEmail` | `string?` |
| `denisonEmail` | `string?` |
| `preferredContactMethod` | `"phone" \| "text" \| "email"` (optional) |

### Permanent Address
| Field | Type |
|---|---|
| `addressLine1` | `string?` |
| `addressLine2` | `string?` |
| `city` | `string?` |
| `state` | `string?` |
| `zipCode` | `string?` |
| `country` | `string?` |

### Denison Information
| Field | Type |
|---|---|
| `classYear` | `number?` |
| `major` | `string?` |
| `minor` | `string?` |
| `denisonId` | `string?` |
| `dorm` | `string?` |
| `roomNumber` | `string?` |

### Tennis Information
| Field | Type |
|---|---|
| `utr` | `number?` | Universal Tennis Rating. |
| `wtn` | `number?` | World Tennis Number. |
| `dominantHand` | `"right" \| "left"` (optional) | |
| `heightInches` | `number?` | Total height in inches; formatted as feet/inches for display (e.g. `73` → `6'1"`). |
| `weightLbs` | `number?` | Weight in pounds. |
| `playerStatus` | `"active" \| "injured" \| "inactive" \| "graduated"` (optional) | See below. |

### Travel
Travel-identity fields live once on the Person record (BP-036A / BP-036E). The
Travel Workspace, spreadsheet views, forms, and exports consume these later —
they must not invent parallel copies.

| Field | Type | Notes |
|---|---|---|
| `socialSecurityNumber` | `string?` | Catalog type `secureText`, `sensitive: true`. Keep out of directory / casual list surfaces. |
| `tsaKnownTravelerNumber` | `string?` | TSA Known Traveler Number. |
| `passportNumber` | `string?` | Catalog type `secureText`, `sensitive: true` (BP-036E). |
| `passportExpirationDate` | `string?` | ISO date. |
| `seatPreference` | `SeatPreference?` | `window` \| `aisle` \| `middle` \| `exit_row` \| `bulkhead` \| `no_preference`. |

### Relationships
| Field | Type | Notes |
|---|---|---|
| `relationships` | `PersonRelationship[]` | How other records relate to this person (e.g. a parent). Always present — `[]` until a later blueprint populates it. This is distinct from `FamilyContact` (see below), which remains the model for a player's parent/guardian contacts today. |

### Notes
| Field | Type | Notes |
|---|---|---|
| `notes` | `string?` | Free-text operational notes. Added in BP-013 (Universal Person Editor); edited via the large notes area in the Person Workspace. |

## Why `firstName` and `lastName` are separate fields

Storing a single `fullName` string makes sorting, searching, initials
generation, and formatted display (e.g. "Jack Bennett" vs. "Bennett, Jack")
all require re-parsing an ambiguous string. Keeping `firstName` and
`lastName` as distinct fields — with an optional `preferredName` layered on
top — keeps every one of those operations trivial and unambiguous, and
avoids a second source of truth for the same data.

## `roles` vs `status` vs `playerStatus`

These answer three different questions and must not be overloaded:

- **`roles`** (`PersonRole[]`) — What is this person in the program? Player,
  coach, alumni, staff, and/or recruit. Multi-valued (e.g. alumni + coach).
  Future `parent` / `donor` roles attach to the same Person.
- **`status`** (`"current" | "alumni"`) — Coarse program lifecycle for the
  record. The **Current** / **Alumni** directory filters combine this with
  roles; coaches are selected by the `coach` role, not by inventing a status
  value.
- **`playerStatus`** (`"active" | "injured" | "inactive" | "graduated"`) —
  Tennis-specific standing for people who play (or played). Irrelevant for
  coach-only staff.

People directory filters (BP-024E): **All | Current | Coaches | Alumni**
(default **Current**). See `PeopleFilter` / `matchesPeopleFilter` in
`src/features/people/utils.ts`.

A person's `status` and `playerStatus` can diverge (e.g. `status: "current"`
with `playerStatus: "injured"`), which is expected.

## One record, referenced everywhere

A person exists as exactly **one** record, identified by `id`. The Team
Directory and the Person Workspace both read from the same People
repository — the Directory renders a limited subset of fields for
scannability, while the Workspace renders the fuller picture. Future
modules (Recruiting, Operations, etc.) should reference this same `Person`
record and `id` rather than creating parallel "player" records of their own.

## Family Contacts

A parent or guardian is modeled as a `FamilyContact` (`src/features/people/family.ts`)
— a related person, linked to a player via `personId`. It intentionally uses a
lighter shape than `Person` (name, relationship, contact details, and
`isPrimaryContact` / `isEmergencyContact` flags) rather than the full `Person`
schema, since a guardian doesn't have Denison or tennis information. It is
conceptually the same idea as `Person` — a real individual related to the
player — and is displayed exclusively in that player's Workspace, never in
the Team Directory.

## Data source

**System of record:** Denison Tennis OS (Supabase `production_people`).
See [`SYSTEM_OF_RECORD.md`](./SYSTEM_OF_RECORD.md) and
[`DATA_OWNERSHIP.md`](./DATA_OWNERSHIP.md).

`src/features/people/data.ts` is a generated **sync snapshot** used by
`npm run db:generate-seed`. It is produced by `npm run import:players` from
`private-imports/Players.csv`. That CSV is the **current synchronization
source** (Airtable export) for provider-synced fields — not a permanent
owner of program data. Application-owned fields live only in the database
and survive re-seed (BP-022E / BP-023A).
