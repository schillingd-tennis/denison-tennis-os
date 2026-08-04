# Denison Tennis OS — Data Model

This document describes the `Person` object: the foundational record for
everyone tracked in the OS. It currently backs the Team module (current
players and alumni) and is intentionally shaped to be reused by future
modules (Recruiting, Operations, etc.) rather than re-modeled per feature.

Source of truth in code: `src/features/people/types.ts` (shape) and
`src/features/people/data.ts` (records).

## The Person object

A `Person` is organized into six groups of fields:

### System
| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable identifier. Used for routing (`/team/[id]`) — never derive a route or lookup from a name. |
| `createdAt` | `string` (ISO date) | When the record was created. |
| `updatedAt` | `string` (ISO date) | When the record was last modified. |

### Identity
| Field | Type | Notes |
|---|---|---|
| `status` | `"current" \| "alumni"` | Whether this person is on the current roster or an alum. See "status vs. playerStatus" below. |
| `firstName` | `string` | Legal/given first name. |
| `lastName` | `string` | Legal last name. |
| `preferredName` | `string?` | What the person goes by day-to-day, if different from `firstName`. |
| `dateOfBirth` | `string?` | ISO date. |
| `photoUrl` | `string?` | Optional headshot. Falls back to initials when absent. |

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

## Why `firstName` and `lastName` are separate fields

Storing a single `fullName` string makes sorting, searching, initials
generation, and formatted display (e.g. "Jack Bennett" vs. "Bennett, Jack")
all require re-parsing an ambiguous string. Keeping `firstName` and
`lastName` as distinct fields — with an optional `preferredName` layered on
top — keeps every one of those operations trivial and unambiguous, and
avoids a second source of truth for the same data.

## `status` vs. `playerStatus`

These answer two different questions and are intentionally independent
fields:

- **`status`** (`"current" | "alumni"`) — Is this person part of the program
  today, or a graduate? This drives which section of the Team Directory a
  person appears in by default and is the coarse, program-wide lifecycle
  state for the person record itself.
- **`playerStatus`** (`"active" | "injured" | "inactive" | "graduated"`) —
  The person's tennis-specific standing at the moment (e.g. a *current*
  player can be `injured`, and an *alumni* record is typically
  `graduated`). This is finer-grained and specific to tennis operations,
  not the person record as a whole.

A person's `status` and `playerStatus` can diverge (e.g. `status: "current"`
with `playerStatus: "injured"`), which is expected.

## One record, referenced everywhere

A person exists as exactly **one** record, identified by `id`. The Team
Directory and the Player Workspace both read from the same
`src/features/people/data.ts` source — the Directory renders a limited
subset of fields for scannability, while the Workspace renders the fuller
picture. Future modules (Recruiting, Operations, etc.) should reference this
same `Person` record and `id` rather than creating parallel "player" records
of their own.

## Family Contacts

A parent or guardian is modeled as a `FamilyContact` (`src/features/people/family.ts`)
— a related person, linked to a player via `personId`. It intentionally uses a
lighter shape than `Person` (name, relationship, contact details, and
`isPrimaryContact` / `isEmergencyContact` flags) rather than the full `Person`
schema, since a guardian doesn't have Denison or tennis information. It is
conceptually the same idea as `Person` — a real individual related to the
player — and is displayed exclusively in that player's Workspace, never in
the Team Directory.

## Temporary data source

`src/features/people/data.ts` is a local, in-memory array used for this
sprint only. It exists so the Team module has real, working data to build
against. It is designed to be swapped for a real database (e.g. a `people`
table) without changing the `Person` shape or how consuming components read
it — call sites depend on the exported `people` array and the helper
functions in `src/features/people/utils.ts`, not on the fact that the data
happens to live in a TypeScript file today.
