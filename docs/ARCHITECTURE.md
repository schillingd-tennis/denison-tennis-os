# Denison Tennis OS — Architecture Blueprint

This document translates [`docs/NORTH_STAR.md`](./NORTH_STAR.md) into a
practical technical architecture. Where the North Star describes *why* and
*what*, this document describes *how*: the layers, boundaries, and object
model that future development should build within.

**System of record:** Denison Tennis OS (PostgreSQL via Supabase) is the
long-term system of record. External tools are providers/sync sources — see
[`SYSTEM_OF_RECORD.md`](./SYSTEM_OF_RECORD.md) (BP-023A).

This blueprint describes target architecture. See
[Section 20](#20-current-and-next-state) for what is implemented today.

---

## 1. System Overview

Denison Tennis OS is a modular **Progressive Web App** built around:

- reusable framework components
- domain objects
- workspaces
- repositories
- external data sources
- an AI assistance layer, added later

Every request for data flows in one direction, through a fixed set of
layers:

```
UI
  ↓
Application / Domain Services
  ↓
Repository Interfaces
  ↓
Repository Implementations
  ↓
External Data Sources
```

The **UI must never communicate directly with Airtable, Coda, or any other
external provider.** Runtime reads/writes go through repositories to the
application database (Supabase). Sync adapters may talk to external
providers; pages and components must not. This boundary lets providers
change or disappear without rewriting UI or the Person domain model.

## 2. Current Technology Foundation

The current stack:

- **Next.js App Router** — routing, layouts, server/client components
- **TypeScript** — strict typing throughout
- **Tailwind CSS** — styling, driven by shared design tokens
- **Progressive Web App** direction — one responsive codebase for desktop
  and mobile, with offline/installable capability as a future goal
- **GitHub** — version control
- **Vercel** — planned deployment platform
- **Supabase (PostgreSQL)** — application database / system of record store
- **Airtable** — current external synchronization source for People bootstrap
  (CSV import); not a permanent owner of program data
- **Coda** — historical/optional recruiting provider if reconnected

Technology choices may evolve. The domain and repository boundaries
described in this document should remain stable regardless of which
provider, hosting platform, or framework version sits underneath them.

## 3. Core Architectural Layers

### A. Presentation Layer

Responsibilities:

- pages
- layouts
- reusable UI components
- responsive desktop and mobile behavior
- interaction state
- accessibility

The Presentation Layer may call application services or repositories
through approved interfaces. **It must not contain data-source-specific
code** — no Airtable field names, no Coda row shapes, no Supabase queries
in a page or component.

### B. Application Layer

Responsibilities:

- use cases
- orchestration
- validation
- transformation between domain objects and view models
- actions such as adding a person or updating a relationship

Example use cases (not implemented yet):

- `getTeamDirectory`
- `getPlayerWorkspace`
- `createPerson`
- `updatePerson`
- `connectParentToPlayer`

### C. Domain Layer

Responsibilities:

- central business objects
- strongly typed values
- relationships
- business rules
- object identity

Examples:

- `Person`
- `PersonRole`
- `PersonRelationship`
- `Match`
- `Practice`
- `Trip`
- `Task`
- `Document`
- `ResearchProject`

### D. Repository Layer

Responsibilities:

- stable interfaces for retrieving and modifying domain objects
- hiding the source of data
- mapping external records into domain objects
- supporting replacement of data sources without rewriting the UI

### E. Infrastructure Layer

Responsibilities:

- Supabase / PostgreSQL clients (system of record store)
- Sync adapters and import scripts for external providers
- Airtable / Coda / UTR / TRN clients (as adopted)
- API integrations
- authentication providers
- storage providers
- model providers

The Infrastructure Layer **implements** repository interfaces and sync
adapters — it is the only layer permitted to know that a given external
provider exists. Presentation and domain code must not.

## 4. Object Model

The initial set of core objects the domain layer is expected to grow
toward:

**People**
- `Person`
- `PersonRole`
- `PersonRelationship`

**Tennis**
- `Practice`
- `Match`
- `Opponent`
- `Lineup`
- `PerformanceRecord`

**Operations**
- `Trip`
- `Event`
- `Task`
- `Expense`
- `EquipmentItem`
- `Facility`

**Knowledge**
- `Document`
- `Note`
- `TimelineEntry`

**Research**
- `ResearchProject`
- `Dataset`
- `Finding`
- `Insight`

Rules:

- Not all objects will be implemented immediately.
- Objects should be added only when a real workflow requires them.
- Each object exists once.
- Different screens are views of the same underlying object.

## 5. People Architecture

People are the central current domain.

**Person**
- one unique individual
- may have multiple roles
- may have multiple relationships
- may move from recruit to player to alumnus without creating duplicate
  records

**Roles** (what a Person *is* within the system):
- player
- alumni
- parent
- guardian
- coach
- recruit
- staff
- other-contact

**Relationships** (how one Person *connects* to another Person):
- mother
- father
- parent
- guardian
- sibling
- spouse
- coach
- emergency-contact

Roles describe what a Person is. Relationships describe how one Person
connects to another Person. These are deliberately separate concepts —
a role is a property of one person; a relationship links two people.

> **Note on today's implementation (BP-021):** `Person.roles` is a
> Postgres `text[]` / TypeScript `PersonRole[]` on the same Person row
> (`player` | `coach` | `alumni` | `staff`). That is the smallest clean
> multi-role model without a join table or duplicate Person records.
> Parent/guardian contacts remain the lighter `FamilyContact` shape
> linked by `personId` until a workflow needs them as full `Person`
> records. See `docs/DATA_MODEL.md`.

## 6. Module Architecture

The locked primary modules:

- Home
- Team
- Recruiting
- Operations
- Research Lab
- Knowledge
- Settings

**Home** — cross-module orientation and executive brief. Built later
because it depends on other modules having real data to summarize.

**Team** — user-facing navigation label for the People directory and
Person Workspace. Routes stay `/team`. Internally this is the People
domain: players, coaches, alumni, and future staff share one `Person`
foundation with multi-valued `roles`.

Local Supabase is the primary development database; see
`docs/LOCAL_DEVELOPMENT.md` for migrations, seed, and promote-to-hosted
workflow (BP-021B).

**Recruiting** — recruit discovery, communication, evaluation, visits,
admissions. Recruit Directory and Recruit Workspace.

**Operations** — calendar, tasks, travel, scheduling, budgets,
administration.

**Research Lab** — research projects, data, findings, competitive
intelligence.

**Knowledge** — documents, notes, historical records, institutional
memory.

**Settings** — account, permissions, integrations, appearance,
application preferences.

Modules are **not** isolated databases. They are domain-specific views and
workflows over shared objects — Recruiting and Team both ultimately read
and write `Person` records, for example, rather than each owning a private
copy of "player" data.

## 7. Directory and Workspace Pattern

The standard pattern every object-bearing module follows:

**Directory** — lightweight browsing:
- search
- filters
- sorting
- saved views
- card view
- list view
- future: bulk actions

**Workspace** — operational home for one object:
- detailed information
- relationships
- actions
- timeline
- notes
- documents
- future: AI assistance

Examples:

- Team Directory → Player Workspace
- Recruit Directory → Recruit Workspace
- Trip Directory → Trip Workspace
- Research Directory → Research Project Workspace

## 8. Reusable Framework

**Existing:**

- Application Shell
- Sidebar
- Header
- Design Tokens
- Page Header
- Search
- Status Badge
- Avatar
- Card View
- DataTable (typed sorting foundation — see BP-009)
- Empty State
- Player Workspace sections

**Planned:**

- Universal List Workspace
- Filter Bar
- Saved View Selector
- Add Person flow
- Edit Person flow
- Timeline
- Notes
- Document attachments
- AI Action Bar
- Command Bar

Future modules should **compose these components rather than inventing new
patterns.** A module-specific version of a shared component should only be
created when there is a strong, documented reason it cannot use the shared
one.

## 9. Repository Interfaces

The intended repository pattern, described conceptually (no production
TypeScript interfaces are written in this sprint):

**`PeopleRepository`**
- `listPeople`
- `getPersonById`
- `createPerson`
- `updatePerson`
- `archivePerson`

**`RelationshipsRepository`**
- `listRelationshipsForPerson`
- `createRelationship`
- `updateRelationship`
- `deleteRelationship`

**Future repositories:**
- `RecruitingRepository`
- `MatchRepository`
- `PracticeRepository`
- `TripRepository`
- `TaskRepository`
- `DocumentRepository`
- `ResearchRepository`

## 10. Data Source Strategy

**Canonical direction:** [`SYSTEM_OF_RECORD.md`](./SYSTEM_OF_RECORD.md).

Current situation (Phase 1 — bootstrap):

- People runtime data lives in Supabase `production_people`.
- Airtable CSV export is the current synchronization source that bootstraps
  / refreshes provider-synced Person fields.
- Parents may still originate from separate Airtable tables; they should
  converge on Person + relationships.
- Recruiting may use Coda historically; treat it as a provider if connected.
- Existing provider data may not be completely clean.

Strategy:

1. Keep the Person domain and repositories as the only UI-facing model.
2. Sync providers through adapters (import scripts / future jobs).
3. Map provider records → internal `Person` at the boundary only.
4. Preserve application-owned history on every sync (notes, evaluations, …).
5. Grow in-app create/update until external tools are optional (Phase 3).

**The application's database + domain model are the system of record.**
Airtable and Coda are current or historical providers — not permanent
architectural owners. Removing them must not require reshaping Person or UI.

## 11. Data Mapping

Every external data source needs an explicit mapper at the boundary. This
is where translation happens — never in the UI.

```
Airtable Player Record        → Airtable mapper → Person domain object
Airtable Parent Record        → Airtable mapper → Person domain object
Airtable linked parent field  → Relationship mapper → PersonRelationship domain object
Coda Recruit Record           → Coda mapper → Person (recruit role) + recruiting-specific data
```

Rules:

- External field names must not leak into UI components.
- Mapping logic must live in the infrastructure or repository
  implementation.
- Data normalization should happen at the boundary.
- Missing values should be handled safely.
- IDs from external systems may be stored as source identifiers but must
  not replace internal domain IDs without an explicit decision.

## 12. Identifiers

Each domain object should have a stable internal ID.

External source IDs should be stored separately, for example:

- `airtableRecordId`
- `codaRowId`
- `supabaseId`

This supports migration and synchronization — an object's internal
identity never depends on which external system currently holds its data.
The exact implementation (column shape, storage strategy) is not
finalized in this sprint.

## 13. Read and Write Strategy

Aligned with the system-of-record phases in
[`SYSTEM_OF_RECORD.md`](./SYSTEM_OF_RECORD.md):

| SoR phase | Scope |
|---|---|
| Phase 1 (current) | Supabase SoR store; Airtable CSV sync bootstraps People; in-app edits for app-owned fields |
| Phase 2 (hybrid) | Provider sync + rich in-app operational data; app owns history |
| Phase 3 (target) | App is complete SoR; providers optional or removed |

Provider read sync and any future write-back are introduced **separately**.
Routine sync must never wipe application history (see
[`DATA_OWNERSHIP.md`](./DATA_OWNERSHIP.md)).

## 14. AI Harness Architecture

AI is a future cross-cutting layer, not a module.

The AI layer **may**:

- read permitted domain context
- summarize
- search
- compare
- identify patterns
- recommend
- prepare actions
- execute approved actions through application services

The AI **must not**:

- own source-of-truth data
- bypass permissions
- write directly to external systems
- silently modify records
- hide the evidence behind recommendations

Future conceptual flow:

```
User request
  ↓
AI orchestration
  ↓
Approved application service
  ↓
Repository
  ↓
Data source
```

The AI layer sits *above* the application layer and calls into it through
the same approved services a human-driven UI action would use — it does
not get a private shortcut to repositories or data sources.

## 15. Security and Privacy

Principles to design toward (not implemented in this sprint):

- Player, recruit, parent, academic, medical, and travel data may be
  sensitive.
- Authentication and role-based permissions are required before
  deployment with real data.
- An assistant coach may initially receive restricted or read-only
  access.
- Sensitive fields should be separated from casual directory views.
- Secrets and API keys must never be committed to GitHub.
- Environment variables must be used for credentials.
- Real data should not be placed in public sample files.

## 16. Mobile and PWA

- One responsive codebase.
- Desktop is for deep work and analysis.
- Mobile is for quick lookup, communication, capture, travel, and
  courtside use.
- Mobile is not simply a shrunken desktop — its workflows should be
  designed for their own context.
- All new workflows must define mobile behavior, not just desktop.
- Offline and push capabilities may be added later.

## 17. Error Handling

Future expectations for every repository-backed workflow:

- Repository calls return predictable results.
- Loading, empty, and error states are explicit.
- External-source failures must not crash the entire app.
- The UI should distinguish "no data" from "failed to load data."
- Synchronization issues should be visible, not silent.
- Errors should provide a useful recovery action.

## 18. Testing Strategy

Intended testing levels (not added in this sprint):

- Unit tests for domain utilities and data mapping.
- Component tests for reusable components.
- Integration tests for repositories.
- End-to-end tests for critical workflows.
- Manual desktop and mobile review for visual quality.

## 19. Development Rules

- Reference `NORTH_STAR.md` before major architecture changes.
- Reference [`INTERACTION_MODEL.md`](./INTERACTION_MODEL.md) before adding
  navigation, drawers, modals, or new workspace surfaces (BP-033).
- Do not allow pages to call Airtable or Coda directly.
- Do not duplicate domain records.
- Do not embed parents inside player records.
- Do not create module-specific versions of shared framework components
  without a strong reason.
- Do not add fields simply because they might be useful someday.
- Add objects and fields when a real workflow requires them.
- Build the smallest useful version.
- Commit each completed BP to GitHub.
- Update documentation when architecture changes.

## 20. Current and Next State

**Completed capabilities (selected):**

- Application shell, navigation, design system
- People model, Team Directory, Person Workspace
- Supabase-backed People repository (local-first development)
- Airtable CSV → import → seed sync (provider-synced columns only)
- Local data integrity workflow (BP-022E)
- System of record architecture (BP-023A)
- **Ownership Lock (BP-029A) — COMPLETED / BASELINE:** Supabase SoR;
  Airtable bootstrap/fill-null only; Force Refresh disabled; validated
  2026-08-06. Not an active work item.

**Direction (not a feature checklist):**

- Expand Person lifecycle roles without duplicate records
- Grow application-owned modules (tasks, messages, evaluations, recruiting)
- Reduce dependence on Airtable until it is optional (Phase 3)
- Same adapter pattern for UTR / TRN / NCAA / Google as needed

See [`SYSTEM_OF_RECORD.md`](./SYSTEM_OF_RECORD.md) for the migration path
away from Airtable.
