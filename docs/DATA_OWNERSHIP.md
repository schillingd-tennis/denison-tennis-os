# Data Ownership (BP-022E / BP-023A)

Denison Tennis OS is the **system of record**. External systems are
**synchronization sources** (providers), not permanent owners.

Canonical architecture: [`SYSTEM_OF_RECORD.md`](./SYSTEM_OF_RECORD.md).  
Code lists for People sync columns: [`scripts/fieldOwnership.ts`](../scripts/fieldOwnership.ts).

---

## Classification legend

| Class | Meaning |
|---|---|
| **Imported** | Populated or refreshed by a provider sync when that sync runs |
| **Editable** | May be changed in the Denison Tennis OS UI |
| **Computed** | Derived at read/display time; not an authoritative stored input |
| **Application-owned** | Sync must not overwrite on conflict; history lives in the app |

A field can be both **Imported** and **Editable** during Phase 1–2: the app
may edit it, but the next intentional provider sync may replace it with the
provider snapshot. Prefer moving day-to-day edits to application-owned
fields as Phase 3 approaches.

---

## External providers (examples)

| Provider | Typical contribution | Status today |
|---|---|---|
| **Airtable** | Roster identity, contact, class year, hometown, titles | Current People bootstrap / sync source (CSV → import → seed) |
| **UTR** | Universal Tennis Rating | Planned sync; ratings may also be entered in-app |
| **TRN** | Tournament / ranking feeds (as adopted) | Future provider |
| **Google** | Calendar, Drive, contacts (as adopted) | Future provider |
| **NCAA** | Eligibility / compliance feeds (as adopted) | Future provider |
| **Coda** | Recruiting pipeline (historical) | Treat as provider if reconnected; not SoR |

Providers update **only** fields documented as owned by that sync job.

---

## Application-owned domains (always preserve)

These are never replaced by routine import/seed:

| Domain | Notes |
|---|---|
| Evaluations | Coach assessments, visit notes, recruiting scores |
| Notes | Free-text operational notes on Person |
| Communication history | Messages, call logs, email threads stored in-app |
| Tasks | Assignments, due work, action-required items |
| Timeline | Chronological program events for a Person |
| Documents / attachments | Files linked to Person or workflows |
| Relationships | App-managed links (parents, mentors, …) beyond import stubs |
| Tags | Labels / taxonomy applied in-app |
| Status transitions made in-app | Lifecycle changes owned by workflows |
| Custom fields | Future extensibility |
| Analytics | Aggregates and derived insights |
| Practice data | Session attendance, drills, plans |
| Performance data | Match charts, training metrics owned by the app |

If a future provider supplies a *rating* or *file*, document that specific
field as Imported; do not let a full-row upsert wipe the domains above.

---

## Person fields — ownership matrix (current)

Runtime store: Supabase `production_people`.

### Provider-synced today (Airtable CSV bootstrap)

Updated by `npm run db:seed` / import→seed pipeline on conflict.
**Imported** from current sync source. **Editable** in UI during hybrid
phase (next intentional sync may overwrite).

| Domain field | DB column | Imported | Editable | Computed | Application-owned |
|---|---|---|---|---|---|
| Status (current / alumni) | `status` | ✓ | ✓ | | |
| Roles | `roles` | ✓ | ✓* | | |
| Title | `title` | ✓ | ✓ | | |
| First / middle / last name | `first_name`, `middle_name`, `last_name` | ✓ | ✓ | | |
| Date of birth | `date_of_birth` | ✓ | ✓ | | |
| Phone | `cell_phone` | ✓ | ✓ | | |
| Emails | `personal_email`, `denison_email` | ✓ | ✓ | | |
| Hometown | `city`, `state`, `country` | ✓ | ✓ | | |
| Class year | `class_year` | ✓ | ✓ | | |
| Major / minor | `major`, `minor` | ✓ | ✓ | | |
| Denison ID | `denison_id` | ✓ | ✓ | | |
| Sync stamp | `updated_at` | ✓† | | | |

\* Role edits in-app should be carefully merged once write workflows mature.  
† Set by sync/update pipelines; not a user-facing field.

### Application-owned Person columns (sync must not overwrite)

| Domain field | DB column | Imported | Editable | Computed | Application-owned |
|---|---|---|---|---|---|
| UTR | `utr` | ‡ | ✓ | | ✓ |
| WTN | `wtn` | ‡ | ✓ | | ✓ |
| Notes | `notes` | | ✓ | | ✓ |
| Dominant hand | `dominant_hand` | | ✓ | | ✓ |
| Height / weight | `height_inches`, `weight_lbs` | | ✓ | | ✓ |
| Player status | `player_status` | | ✓ | | ✓ |
| Preferred name | `preferred_name` | | ✓ | | ✓ |
| Photo | `photo_url` | | ✓ | | ✓ |
| Preferred contact | `preferred_contact_method` | | ✓ | | ✓ |
| Street / ZIP | `address_line1`, `address_line2`, `zip_code` | | ✓ | | ✓ |
| Dorm / room | `dorm`, `room_number` | | ✓ | | ✓ |
| Relationships JSON | `relationships` | | ✓ | | ✓ |
| Created at | `created_at` | | | | ✓ (immutable) |

‡ May become **Imported** from UTR/TRN adapters later; until then, treat as
application-owned. A UTR provider sync would update `utr` only — never notes.

### Computed (examples)

| Value | How |
|---|---|
| Display name | From `preferredName` / `firstName` + `lastName` |
| Initials | From display name |
| Age | From `dateOfBirth` + reference date |
| Directory filters | From `roles` + `status` |
| Hometown line | From `city` / `state` / `country` |

Computed values are not written by import.

---

## Pipeline behavior (People)

| Pipeline | Touches DB? | Overwrites app-owned? | Overwrites provider-synced? |
|---|---|---|---|
| `npm run import:players` | No — rewrites `data.ts` only | N/A | N/A (file only) |
| `npm run db:generate-seed` | No — rewrites `seed.sql` only | N/A | N/A (file only) |
| `npm run db:seed` | Yes — upsert | **No** | Yes |
| `npm run db:reset` | Yes — **drops DB** | **Yes (destroyed)** | Yes (reloaded) |
| `npm run db:start` / `db:stop` | No data rewrite | No | No |
| `npm run dev` / browser refresh / git | No | No | No |

CSV fields with no provider column:
`scripts/import/mapPlayer.ts` → `FIELDS_WITH_NO_SOURCE_COLUMN`. Those stay
undefined in the file snapshot and must not clobber live DB values on re-seed.

---

## Rules for new fields and modules

1. Default new fields to **application-owned** unless a provider sync is
   explicitly designed and documented here.
2. Never add a full-row `ON CONFLICT DO UPDATE` that includes app-owned
   columns.
3. Prefer related tables keyed by `person_id` for history (notes threads,
   evaluations, tasks) rather than stuffing JSON that sync might replace.
4. When adding a provider, document: provider name, fields owned, sync
   command, and preserve list.
5. Assume Airtable may be removed; do not name domain types after Airtable.
