# Denison Tennis OS — Architecture Blueprint

This document translates [`docs/NORTH_STAR.md`](./NORTH_STAR.md) into a
practical technical architecture. Where the North Star describes *why* and
*what*, this document describes *how*: the layers, boundaries, and object
model that future development should build within.

This is a **documentation-only** blueprint. It describes target
architecture — much of it (repositories, application services, external
data sources) does not exist in code yet. See [Section 20](#20-current-and-next-state)
for what is actually implemented today versus what is planned.

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

The **UI must never communicate directly with Airtable, Coda, Supabase, or
any other external data source.** All data access is mediated by
repositories. This is the single most important boundary in the system —
it is what allows the data source underneath the app to change (local
sample data → Airtable → Supabase) without rewriting pages or components.

## 2. Current Technology Foundation

The current stack:

- **Next.js App Router** — routing, layouts, server/client components
- **TypeScript** — strict typing throughout
- **Tailwind CSS** — styling, driven by shared design tokens
- **Progressive Web App** direction — one responsive codebase for desktop
  and mobile, with offline/installable capability as a future goal
- **GitHub** — version control
- **Vercel** — planned deployment platform
- **Airtable** and **Coda** — current external data sources (Team/Parents
  in Airtable, Recruiting in Coda)
- **Supabase** or **PostgreSQL** — possible future central storage

Technology choices may evolve. The domain and repository boundaries
described in this document should remain stable regardless of which
database, hosting provider, or framework version sits underneath them.

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

- Airtable clients
- Coda clients
- Supabase clients
- API integrations
- authentication providers
- storage providers
- model providers

The Infrastructure Layer **implements** repository interfaces — it is the
only layer permitted to know that Airtable or Coda exist.

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

> **Note on today's implementation:** the current codebase models a
> parent/guardian as a lighter `FamilyContact` record linked to a player
> by `personId` (see `docs/DATA_MODEL.md`), rather than as a full `Person`
> with a `PersonRole`/`PersonRelationship`. This is an intentional,
> smaller first step — the target shape described above (family members
> as full `Person` records connected via `PersonRelationship`) is where
> this evolves once a real workflow needs a parent to be addressable as
> a first-class person (e.g. a parent who is also a donor). This does not
> contradict `DATA_MODEL.md`; it describes where that model is headed.

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

**Team** — current players and alumni. Player Directory and Player
Workspace.

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

Current situation:

- Players are currently in Airtable.
- Parents are currently in a separate Airtable table.
- Recruits are currently in a Coda database.
- Existing data may not be completely clean.

Initial strategy:

1. Keep current systems in place.
2. Add repository abstractions.
3. Connect Airtable read-only first.
4. Map Airtable records to the internal `Person` model.
5. Surface data-quality problems without blocking development.
6. Add create and update operations only after reads are stable.
7. Reevaluate whether to consolidate into Supabase later.

**The application's internal domain model is authoritative for
structure.** Airtable and Coda are current sources, not permanent
architectural owners — the app is designed so that swapping them out later
does not require reshaping the domain model or rewriting UI.

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

Planned phased sequence:

| Phase | Scope |
|---|---|
| Phase 1 | Local demo repository; read-only UI development |
| Phase 2 | Airtable read integration; real Team data |
| Phase 3 | Create Person; update Person; create relationships |
| Phase 4 | Coda recruiting integration |
| Phase 5 | Evaluate a central database |

Read and write integrations are introduced **separately** to reduce risk —
a data source is proven safe to read from before the app is allowed to
write back to it.

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

**Completed capabilities:**

- Application shell
- Primary navigation
- Design system
- Team Directory
- Player Workspace
- People model
- Parent and guardian relationships (via `FamilyContact`)
- Reusable DataTable sorting foundation (BP-009)
- North Star document (BP-010A)

**Next planned sequence:**

- **BP-012** — Repository Layer using current local sample data
- **BP-013** — Airtable read-only Team integration
- **BP-014** — Add Person workflow
- **BP-015** — Edit Person workflow

The exact BP numbers may change as priorities shift, but this sequence —
repositories before external integration, reads before writes, Team before
Recruiting — should remain the guiding order.
