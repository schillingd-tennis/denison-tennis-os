# Denison Tennis OS — System of Record Architecture (BP-023A)

This document establishes the long-term data architecture for Denison Tennis
OS. Every future module (Recruiting, Operations, Tasks, Messages, Analytics)
should assume this direction.

Related:

- [`DATA_OWNERSHIP.md`](./DATA_OWNERSHIP.md) — field-level ownership
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — layers and repository boundaries
- [`DATA_MODEL.md`](./DATA_MODEL.md) — Person shape
- [`LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md) — local DB workflow

---

## 1. Vision

**Denison Tennis OS is the primary system of record for the tennis program.**

External systems (Airtable, TRN, UTR, Google, NCAA, Coda, etc.) are
**data providers** or **synchronization sources**. They are not permanent
owners of program data.

Architectural rule:

> Airtable (or any other provider) may eventually disappear without
> requiring changes to the application domain model, UI, or repositories
> beyond removing or replacing the sync adapter.

The application's PostgreSQL database (local and hosted Supabase) holds the
canonical Person and operational history. UI and services read and write that
store through repositories — never through provider APIs directly.

---

## 2. Phase Model

### Current — System of Record (BP-029A Ownership Lock)

- Supabase `production_people` is the permanent system of record for People.
- Airtable CSV is **bootstrap / fill-null import only**.
- After a Person exists (or a field is non-NULL), **OS owns** that field.
- Runtime edits in Tennis OS are authoritative for all Person fields.
- Normal import/seed **fills missing values only** — never overwrites existing
  Supabase data (including with blank/NULL).
- **Airtable Force Refresh hard-replace is disabled** — not normal workflow.
- Future automated providers (UTR/WTN/TRN) may own only their scoped columns
  later; Airtable is never that class.
- Evaluations, tags, notes, relationships, and ratings live in (or will live
  in) Supabase; they are never owned by Airtable.

### Target — Airtable removed

- Import adapter deleted; Person / Team / repositories unchanged.
- Optional future providers (UTR, TRN, NCAA) update only their documented
  columns and preserve history.

```
Bootstrap import  →  Supabase SoR (OS owns after fill)  →  Airtable removable
                     Fill-nulls on seed only
                     Airtable Force Refresh = disabled
```
---

## 3. Person-First Architecture

Everything revolves around a **Person**.

One Person record can accumulate program identities over time, for example:

| Lifecycle / role examples |
|---|
| Recruit → Official Visitor → Applicant → Committed Recruit |
| Student → Player → Captain |
| Coach → Assistant Coach → Head Coach |
| Athletic Trainer, Staff, Volunteer |
| Parent / guardian (relationship to another Person) |
| Alumni |

**Rules:**

1. **One Person, one `id`.** Do not create a second Person for a new stage
   (e.g. do not invent a separate “Recruit record” that duplicates identity).
2. **Roles and titles change; the Person persists.** Prefer `roles`,
   `title`, status fields, and future lifecycle markers on the same row
   (or related tables keyed by `person_id`).
3. **Modules reference `person_id`.** Recruiting, Operations, Tasks, and
   Messages attach to Person — they never fork a parallel directory.
4. **Parents and related people** should converge toward Person +
   relationship edges over time (`FamilyContact` is a transitional lighter
   shape; see `DATA_MODEL.md`).

This is the same rule already stated in the North Star and Data Model:
duplicate people for different stages are an architectural failure.

---

## 4. Data Ownership (summary)

Full tables: [`DATA_OWNERSHIP.md`](./DATA_OWNERSHIP.md).

| Category | Meaning |
|---|---|
| **Imported Once** | Bootstrap may fill empty columns only |
| **OS Managed** | Supabase / Tennis OS authoritative after population |
| **Provider Managed (future)** | Real automated integration, scoped columns only — not Airtable |
| **Computed** | Derived at read time |

**Import sources (examples):** Airtable CSV (bootstrap), future UTR/TRN adapters.

**Always SoR after bootstrap:** identity, contact, hometown, role, class, status,
D#, UTR, WTN, notes, evaluations, tags, relationships, communications, tasks.

Code: [`scripts/fieldOwnership.ts`](../scripts/fieldOwnership.ts).

---

## 5. Import Philosophy

Imports **populate gaps**. They do **not** own live data.

### Always preserve on normal seed

- Every existing non-NULL value in Supabase
- Notes, evaluations, tags, relationships
- UTR / WTN / hometown / role / status / class / contact / D# / names / …
- Any manual OS edit

### Normal seed (`npm run db:seed`)

```
INSERT new Person from import snapshot
ON CONFLICT (id) DO UPDATE
  SET col = coalesce(production_people.col, excluded.col)
-- existing values always win
```

### Airtable Force Refresh (`npm run db:seed:force-refresh`)

**Disabled (BP-029A).** CLI and developer action refuse to run. The generated
`seed-force-refresh.sql` is a stub that raises if applied. Hard-replacing
populated SoR fields from Airtable is not part of normal operations.

### Import must never

- Silently overwrite existing Supabase values on routine seed
- Replace populated fields with blank or NULL
- Delete or archive a Person because they disappeared from Airtable
- Fall back to `db:reset` when import/seed fails
- Treat “re-run seed” as “reset the world”

A full `db:reset` remains an **intentional destructive** developer action,
not an import mechanism.

---

## 6. Migration Path Away from Airtable

Recommended sequence (no schema change required for this BP):

| Step | Action |
|---|---|
| 1 | Keep Person + repository as the only UI-facing model (already true). |
| 2 | Treat CSV/Airtable import as an **adapter** (`scripts/import/*`), not domain. |
| 3 | Expand in-app create/edit so coaches stop needing Airtable for day-to-day. |
| 4 | Optionally store external ids (`airtableRecordId`, etc.) on Person for
      sync correlation — never use them as the internal primary key. |
| 5 | Add write-back or dual-run only if still needed in Phase 2; prefer app as
      write master. |
| 6 | When Airtable usage drops to zero: remove import adapter, seed snapshot
      generation from CSV, and provider docs — domain and UI unchanged. |
| 7 | Same pattern for TRN/UTR/NCAA: adapters update only their owned fields. |

**Success criterion for Phase 3:** Deleting Airtable credentials and the
import scripts does not require redesigning Person, Team, or future modules.

---

## 7. Implications for Future Modules

| Module | Must |
|---|---|
| Recruiting | Key every recruit workflow to `person_id`; sync Coda/Airtable as providers |
| Operations | Tasks, trips, documents attach to Person / program entities in-app |
| Messages | Communication history is application-owned |
| Analytics | Read from app SoR; external ratings sync into owned rating fields |
| AI | Read/write only through application services; never owns SoR data |

Filled notification pills and operational alerts remain application UX —
identity metadata stays quiet (BP-022D). Data architecture and visual
language are separate concerns; both assume the app is durable.

---

## 8. Non-goals (this BP)

- No user-facing UI changes
- No new features
- No database schema migrations required for documentation
- No removal of the current Airtable CSV bootstrap pipeline

This BP sets direction. Later BPs implement Phase 2/3 capabilities.
