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

### Phase 1 — Current (Bootstrap)

- Airtable CSV export bootstraps People into Denison Tennis OS.
- The app stores additional application-specific data (notes, UTR/WTN when
  entered in-app, workspace edits, etc.).
- Supabase `production_people` is the runtime store.
- Import → seed sync updates **provider-synced** columns only
  (see BP-022E / `DATA_OWNERSHIP.md`).

### Phase 2 — Hybrid

- Both Denison Tennis OS and external tools may contain overlapping facts.
- Imports **synchronize** provider-owned fields into the app.
- The application **owns** operational data: evaluations, communication
  history, tasks, timeline, documents, relationships beyond import links,
  tags, analytics, practice/performance data.
- Coaches may still use Airtable/Coda for some workflows; the app must not
  treat those tools as authoritative for history or app-owned fields.

### Phase 3 — Target (System of Record)

- Denison Tennis OS is the complete system of record for People and program
  operations.
- External tools become optional adapters (or are removed).
- New People and lifecycle transitions are created primarily in the app
  (or via controlled sync from remaining providers).
- Historical notes, evaluations, messages, and tasks never depended on
  Airtable remaining online.

```
Phase 1                Phase 2                 Phase 3
────────               ────────                ────────
Airtable bootstrap  →  Hybrid sync          →  App is SoR
App adds ops data      App owns ops data       Providers optional
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
| **Imported / provider-synced** | Updated by an external sync adapter when that sync runs |
| **Application-owned** | Created/edited in Denison Tennis OS; sync must not overwrite |
| **Editable** | Users may change in the app (may still be provider-synced until Phase 3) |
| **Computed** | Derived at read time; not stored as authoritative input |

**External providers (examples):** Airtable, TRN, UTR, Google, NCAA, Coda.

**Application owns (examples):** evaluations, notes, communication history,
tasks, timeline events, documents/attachments, relationships (app-managed),
tags, program status transitions made in-app, custom fields, analytics,
practice data, performance data.

Code mirror for current People sync columns:
[`scripts/fieldOwnership.ts`](../scripts/fieldOwnership.ts).

---

## 5. Synchronization Philosophy

Imports **synchronize**. They do **not** replace application history.

### Always preserve

- Notes
- Evaluations
- Communication logs
- Tasks
- Attachments / documents
- Relationships managed in-app
- Manual edits to application-owned fields
- Historical timeline information

### Sync may update

Only fields explicitly owned by that provider for that sync job
(documented in `DATA_OWNERSHIP.md`).

### Sync must never

- Delete or null out application-owned columns on conflict
- Recreate People tables as a side effect of routine import
- Fall back to a full database wipe when a sync fails
- Treat “re-run seed” as equivalent to “reset the world”

### Conflict rule (People today)

```
INSERT new Person from provider snapshot
ON CONFLICT (id) DO UPDATE
  SET <provider-synced columns only>
-- application-owned columns omitted from UPDATE
```

A full `db:reset` remains an **intentional destructive** developer action,
not a sync mechanism.

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
