# Denison Tennis OS — Interaction Model

**BP-033 · Core architecture document**

This document defines how users interact with the Denison Tennis OS.

It is permanent architecture and UX guidance. Future modules, workspaces, and
features should follow these patterns unless this document is deliberately
revised.

Where [`NORTH_STAR.md`](./NORTH_STAR.md) describes *why* the product exists,
and [`ARCHITECTURE.md`](./ARCHITECTURE.md) describes *how* the system is
layered, this document describes **how people work inside the product**.

---

## Principle

The Denison Tennis OS is an **operating system**.

Users should remain in context.

Information should come to the user.

The user should rarely leave the current workspace.

Coaching work is fast, interrupt-driven, and relational. The interaction model
exists to preserve focus: see what matters, act without losing place, return
to the same workspace with context intact.

---

## 1. Executive Dashboard

**Purpose**

Display only the information required for rapid decision making.

**Examples**

- Executive Overview
- Tennis Performance
- Alerts
- Current Status
- Next Follow-up

**Rules**

- Always visible in the relevant workspace (or immediately available without
  navigation).
- Never excessively long.
- Prefer signals over histories: status, risk, next action, key metrics.
- If a metric does not change a decision in the next few minutes, it does not
  belong on the executive surface.

**Anti-patterns**

- Full timelines inside the executive band
- Dense form layouts presented as “overview”
- Scrolling through secondary detail to reach the decision layer

---

## 2. Summary Cards

**Purpose**

Provide a concise overview of a feature area without opening its full history.

**Examples**

- Communication
- Notes
- Documents
- Travel
- Academics

**Rules**

- Display a short summary: latest item, count, status, or next action.
- Do not display full histories on the summary surface.
- Summaries invite expansion or a drawer — they are not the workspace for
  deep work.
- Empty states should be brief and actionable (“No notes yet”).

**Anti-patterns**

- Embedding multi-page lists inside a card
- Forcing the user to open a new route to learn whether anything exists

**Implementation**

- Module navigation: `src/components/workspace-navigation/` (`WorkspaceNavigation`).
- Module surface: `src/components/adaptive-workspace/` (`AdaptiveWorkspace` — BP-035C).
- Selecting a row swaps the Adaptive Workspace; it does **not** open a drawer.
- Legacy summary card primitive (optional): `src/components/workspace-summary/`.

Person Workspace is the reference layout: Header, Executive Overview, and Tennis
Performance stay fixed. Only the Adaptive Workspace changes focus.

---

## 3. Expandable Sections

**Purpose**

Reveal additional information without leaving the page.

**Use when**

The user occasionally needs more detail, but not always.

**Examples**

- Notes
- Documents
- Travel
- Academics

**Rules**

- Default to collapsed or summary-first when content is secondary.
- Expansion stays in place; scroll position and surrounding context remain.
- Expansion is for reading and light scanning — not for long create/edit
  workflows (prefer drawers for those).

**Anti-patterns**

- Expanding into unbounded vertical stacks that recreate a second page
- Using expand/collapse as a substitute for every interaction pattern

---

## 3A. Adaptive Workspace (BP-035C)

**Purpose**

Host primary modules on the current object page without leaving context.

**Examples**

- Communication
- Contact Information
- Academics
- Family
- Travel
- Documents
- Denison Information

**Rules**

- The object page (Person Header, Executive Overview, Tennis Performance) stays
  fixed.
- **Desktop split (BP-036D):** Workspace Navigation (left) and Active Workspace
  (right) are permanent side-by-side panes. Both stay visible.
- Workspace navigation selects focus; only the right pane content changes.
- Prefer a short crossfade (≈150–200ms) over page navigation or drawers for
  whole modules.
- Each workspace uses one shell: title, optional subtitle, optional toolbar,
  content.

**Anti-patterns**

- Stacking the active workspace below the navigation list
- Opening an entire module in a drawer
- Accordions or card stacks for module selection
- Navigating to a separate route for every secondary module
- Reloading the page when switching focus

**Implementation**

`src/components/adaptive-workspace/` + `WorkspaceNavigation` for selection.
Person Workspace composes them in a permanent two-column split shell.

---

## 4. Right-side Drawers

**Purpose**

Perform **focused** work while preserving page context — not host entire modules.

**Examples**

- Add Communication
- Write Email
- Log Call
- Create Note
- Schedule Follow-up
- Upload Document
- Travel Details

**Rules**

- Preferred for short create/edit tasks inside an Adaptive Workspace.
- Communication, Travel, Academics, and similar modules are **Adaptive Workspaces**,
  not drawers (BP-035C).
- The underlying page remains visible (dimmed or partially visible) so
  the user never loses who or what they are working on.
- Save / cancel returns the user to the same workspace, same person, same
  scroll context whenever possible.
- Drawers may show richer detail than a summary card, but still favor a
  focused task over a full alternate application.

**Anti-patterns**

- Opening a new full page for “Add Note” or “Log Call”
- Putting an entire module (Communication, Travel, …) inside a drawer
- Nested navigation inside a drawer that traps the user away from the
  workspace

**Implementation (BP-034A)**

Reusable shell: `src/components/workspace-drawer/`.

Open focused work through the central Drawer Manager (`openDrawer` /
`closeDrawer` / `replaceDrawer`) mounted in `AppShell` — do not invent
per-page drawer state for common edits.

---

## 5. Modals

**Purpose**

Short, focused interactions that interrupt briefly and resolve quickly.

**Examples**

- Confirm Delete
- Quick Edit
- Rename

**Rules**

- Use for confirmations and tiny edits — not for multi-step workflows.
- Prefer drawers when the task benefits from seeing surrounding context or
  involves more than a few fields.
- One clear question or action per modal.

**Anti-patterns**

- Long forms in modals
- Multi-step wizards in modals when a drawer or workspace would fit better

---

## 6. Full Workspaces

**Purpose**

Large, independent workflows that deserve a dedicated surface.

**Examples**

- Recruiting
- Research Lab
- Operations
- Knowledge
- Person Workspace (object-centric home for a person)
- Team Directory (program-level roster surface)

**Rules**

- Only major workflows receive dedicated pages/routes.
- A full workspace is a home base, not a stack of nested pages.
- Within a workspace, prefer summary → expand → drawer before adding child
  routes.

**Anti-patterns**

- Creating a new top-level page for every secondary task
- Turning every object detail into a separate navigable hierarchy

---

## 7. Navigation Philosophy

**Rule**

Do not force users through deep page hierarchies.

**Prefer**

```
Workspace → Drawer → Save → Return
```

**Rather than**

```
Workspace → New Page → Another Page → Back
```

**Implications**

- Primary nav opens major workspaces, not every leaf task.
- Object work (person, trip, match) happens inside the object’s workspace.
- Breadcrumb depth is a smell: if the user needs three “Back” presses to
  finish a common task, the interaction model has failed.

---

## 8. Context Preservation

The user should never lose context while performing common coaching tasks.

**Examples that must stay in-workspace**

- Viewing communication
- Adding notes
- Scheduling follow-ups
- Uploading documents

These should occur without leaving the Person Workspace (or the relevant
object workspace).

**Rules**

- Identity of the current object (person, trip, match, etc.) remains visible
  or immediately recoverable during the task.
- Completing an action returns the user to the same workspace state.
- Avoid full-page redirects for tasks that take seconds, not sessions.

---

## 9. Page Length

Executive workspaces should prioritize concise summaries.

Avoid creating extremely long pages.

**Prefer**

```
Summary + Expand + Drawer
```

**Rather than**

endlessly stacking sections vertically.

**Rules**

- Above-the-fold (or first screenful) should answer: who/what, status, next
  action, and critical alerts.
- Secondary modules earn summary cards first; full histories live behind
  expand or drawer.
- Vertical length is not a measure of completeness. Clarity is.

**Anti-patterns**

- Infinite scroll of every related history on the main workspace
- Replicating a CRM “record page” with ten always-open panels

---

## 9b. Directory lists

**Purpose**

Work the found set in place. Open a workspace only when you need depth.

**Rule**

Lists are for working. Workspaces are for depth.

**Behavior**

- Click an **editable field** → inline edit (`InlineEditCell`).
- Click **name / avatar** → open that Person/Recruit workspace.
- Click a **computed or read-only** field → no edit mode.
- **Action buttons** keep their own actions.
- The **row is not a navigation target**.

**First surface:** Recruiting List. Future directories should follow this unless a milestone explicitly keeps an older pattern (Team List today: whole-row open + double-click edit).

---

## 10. Design Philosophy

The Denison Tennis OS should feel closer to:

- **Linear** — focused work, calm surfaces, clear next actions
- **Notion** — object-centric, expandable structure without losing place
- **Stripe** — dense but intentional, executive clarity, precision
- **Apple Health** — summary first, detail on demand, glanceable status

than a traditional CRM or database.

**Implications**

- Favor composition and restraint over form grids and field dumps.
- Prefer progressive disclosure over showing everything at once.
- Interaction patterns above are the product language; visual tokens live in
  [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).

---

## Decision Guide (quick reference)

| Need | Pattern |
|---|---|
| Instant coaching decision | Executive Dashboard |
| “What’s going on in this module?” | Summary Card |
| Occasional extra detail in place | Expandable Section |
| Create / edit / focused work without leaving | Right-side Drawer |
| Edit a directory cell without leaving the list | Inline edit on that field |
| Open the record from a directory | Name / avatar, not the whole row |
| Major independent workflow | Full Workspace |

When unsure: **stay in the workspace, use a drawer, keep the page short.**

---

## Relationship to other docs

| Document | Role |
|---|---|
| [`NORTH_STAR.md`](./NORTH_STAR.md) | Product philosophy and mission |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Technical layers and boundaries |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Visual tokens and shell |
| [`DATA_MODEL.md`](./DATA_MODEL.md) | Domain objects and relationships |
| [`DECISIONS.md`](./DECISIONS.md) | Locked product/engineering decisions |

This interaction model does not replace those documents. It constrains how UI
and navigation express them.

---

## Change control

- Treat this file as a locked architecture baseline for interaction UX.
- Revising patterns requires an explicit documentation update (and usually a
  decision entry), not an ad-hoc UI experiment.
- Implementation of drawers, expands, and summaries should cite this document
  when introducing new module surfaces.
