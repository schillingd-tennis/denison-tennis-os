# Data Ownership (BP-026B)

Denison Tennis OS is the **permanent system of record**.

External systems (currently Airtable CSV) are **import sources only**. They
are not long-term owners of People data. Runtime edits inside Tennis OS are
authoritative.

Canonical architecture: [`SYSTEM_OF_RECORD.md`](./SYSTEM_OF_RECORD.md).  
Code lists: [`scripts/fieldOwnership.ts`](../scripts/fieldOwnership.ts).

---

## Ownership model

| Class | Meaning |
|---|---|
| **System of record** | Stored in Supabase; UI edits win |
| **Import fill** | Provider snapshot may set a value only when the live column is NULL |
| **Force refresh** | Explicit opt-in; hard-replaces provider-import columns from the snapshot |
| **App-authoritative** | Never force-refreshed from import (ratings, notes, relationships, …) |
| **Computed** | Derived at read time |

---

## Persistence rules (non-negotiable)

1. **No user-entered value may disappear unless the user explicitly clears/deletes it** (or an operator runs Force Refresh / `db:reset` knowingly).
2. **Normal import / `npm run db:seed`** → `coalesce(existing, excluded)` — fill missing only.
3. **Force Refresh From Provider** / `npm run db:seed:force-refresh` → hard-replace **provider-import** columns only.
4. **App-authoritative columns** (UTR, WTN, notes, relationships, …) are omitted from Force Refresh updates.
5. Airtable (or any future adapter) can be removed without changing Person, Team, or repositories beyond deleting the adapter.

---

## Person fields — Supabase authoritative

These persist entirely inside Supabase after first write / import fill:

| Domain | DB / future store |
|---|---|
| Hometown | `city`, `state`, `country` |
| Role | `role_id`, `title` |
| Class | `class_year` |
| Status | `status_id` |
| D# | `denison_id` |
| Phone / email | `cell_phone`, `personal_email`, `denison_email` |
| UTR / WTN | `utr`, `wtn` |
| Notes | `notes` |
| Relationships | `relationships` (+ future edge tables) |
| Evaluations | Future related tables keyed by `person_id` |
| Tags | Future related tables keyed by `person_id` |

### Provider-import columns (fill-nulls; force-refreshable)

Listed in `PROVIDER_IMPORT_COLUMNS`:

`role_id`, `status_id`, `title`, `first_name`, `middle_name`, `last_name`,
`date_of_birth`, `cell_phone`, `personal_email`, `denison_email`,
`city`, `state`, `country`, `class_year`, `major`, `minor`, `denison_id`

### App-authoritative columns (never force-refreshed)

Listed in `APP_AUTHORITATIVE_COLUMNS`:

`utr`, `wtn`, `notes`, `dominant_hand`, `height_inches`, `weight_lbs`,
`player_status`, `preferred_name`, `photo_url`, `preferred_contact_method`,
`address_line1`, `address_line2`, `zip_code`, `dorm`, `room_number`,
`relationships`, `created_at`

---

## Pipeline behavior

| Pipeline | Touches DB? | Overwrites existing values? |
|---|---|---|
| `npm run import:players` | No — rewrites `data.ts` only | N/A |
| `npm run db:generate-seed` | No — writes `seed.sql` + `seed-force-refresh.sql` | N/A |
| `npm run db:seed` | Yes — upsert | **No** — fill NULLs only |
| `npm run db:seed:force-refresh` | Yes — upsert | **Yes** — provider-import columns only |
| `npm run db:reset` | Yes — **drops DB** | **Yes — everything destroyed** |
| `npm run db:start` / refresh / git | No People rewrite | No |

---

## Import adapters (Airtable → removable)

```
CSV / future API  →  scripts/import/*  →  data.ts  →  seed SQL  →  Supabase
```

- Adapter code must not be imported by UI or repositories.
- Stable Person `id` values are application ids, not Airtable record ids.
- When Airtable is retired: delete the adapter + CSV path; domain unchanged.

---

## Rules for new fields

1. Default new fields to **app-authoritative** (fill-nulls on seed, never force-refresh).
2. Add to `PROVIDER_IMPORT_COLUMNS` only when a provider truly supplies that column.
3. Prefer related tables keyed by `person_id` for evaluations, tags, notes threads, tasks.
4. Never add a full-row `ON CONFLICT DO UPDATE` that blank-wipes SoR data.
