# Data Ownership (BP-029A)

Denison Tennis OS (Supabase) is the **permanent system of record**.

Airtable (CSV) is an **import / bootstrap source only**. After a Person exists
in Supabase — or a field is non-NULL — Tennis OS owns that data. Airtable has
no continuing authority to overwrite Person fields.

Canonical architecture: [`SYSTEM_OF_RECORD.md`](./SYSTEM_OF_RECORD.md).  
Code lists: [`scripts/fieldOwnership.ts`](../scripts/fieldOwnership.ts).

---

## Ownership model (BP-029A)

| Class | Meaning |
|---|---|
| **Imported Once** | Bootstrap may populate empty columns on create / fill-null seed |
| **OS Managed** | Supabase + Tennis OS are authoritative after first population |
| **Provider Managed (future)** | Only a true automated integration (UTR/WTN/TRN) for **scoped** fields — **not Airtable** |
| **Computed** | Derived at read time |

Airtable columns are **Imported Once → OS Managed**. They are never
“provider-managed” for ongoing overwrite.

---

## Persistence rules (non-negotiable)

1. **No user-entered value may disappear** unless the user clears it or an
   operator runs intentional `db:reset`.
2. **Normal import / `npm run db:seed`** → `coalesce(existing, excluded)` —
   create missing rows; fill NULL only.
3. **Never overwrite** a populated Supabase value with import data (including
   blank / NULL).
4. **Airtable Force Refresh hard-replace is disabled** (`db:seed:force-refresh`
   and the developer action refuse to run).
5. Runtime edits write **only** to Supabase.
6. Airtable can be removed without changing Person, Team, or repositories
   beyond deleting the import adapter.

---

## Person fields — OS Managed after bootstrap

All profile fields in `IMPORTED_ONCE_COLUMNS` / `OS_MANAGED_COLUMNS`, including:

| Domain | DB / future store |
|---|---|
| Identity | `first_name`, `middle_name`, `last_name`, `preferred_name`, `date_of_birth`, `photo_url` |
| Role / lifecycle | `role_id`, `title`, `status_id`, `player_status` |
| Contact | `cell_phone`, `personal_email`, `denison_email`, `preferred_contact_method` |
| Hometown / address | `city`, `state`, `country`, `address_line1/2`, `zip_code` |
| Denison | `class_year`, `major`, `minor`, `denison_id`, `dorm`, `room_number` |
| Tennis | `utr`, `wtn`, `dominant_hand`, `height_inches`, `weight_lbs` |
| Notes / relationships | `notes`, `relationships` |
| Evaluations / tags / tasks / communications | Future tables keyed by `person_id` — always OS Managed |

---

## Pipeline behavior

| Pipeline | Touches DB? | Overwrites existing values? |
|---|---|---|
| `npm run import:players` | No — rewrites `data.ts` only | N/A |
| `npm run db:generate-seed` | No — writes `seed.sql` + disabled force stub | N/A |
| `npm run db:seed` | Yes — upsert | **No** — fill NULLs only |
| `npm run db:seed:force-refresh` | **Blocked (BP-029A)** | N/A |
| `npm run db:reset` | Yes — **drops DB** | **Yes — everything destroyed** |
| `npm run db:start` / refresh / git | No People rewrite | No |

Verify invariants: `npx tsx scripts/assert-ownership-lock.ts`

---

## Import adapters (Airtable → removable)

```
CSV  →  scripts/import/*  →  data.ts  →  seed.sql  →  Supabase (fill-null only)
```

- Adapter code must not be imported by UI or repositories.
- Stable Person `id` values are application ids, not Airtable record ids.
- When Airtable is retired: delete the adapter + CSV path; domain unchanged.

---

## Rules for new fields

1. Default new fields to **Imported Once / OS Managed** (fill-null on seed).
2. Add to `FUTURE_PROVIDER_MANAGED_COLUMNS` only for a real automated integration
   that owns **that column only** and preserves history.
3. Prefer related tables keyed by `person_id` for evaluations, tags, tasks, messages.
4. Never add a full-row `ON CONFLICT DO UPDATE` that blank-wipes SoR data.
5. Do not re-enable Airtable hard-replace as normal workflow.
