# UI Guardrails — locked layout contracts

This document is a **structural contract**, not a mood board. Feature work
(Interactions, Tournaments, Dashboard, imports, data-model) must consume
these shells. It must not restyle or relocate them.

Canonical visual tokens remain in [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).
Approved Adaptive Workspace geometry remains frozen per `.cursor/rules/design-freeze.mdc`.

## Principle

**Shared shell owns geometry. Feature modules own content.**

An Interactions or Tournaments feature must not decide:

- Recruit header / summary layout
- Schools of Interest placement
- Academic Interests placement
- Adaptive Workspace navigation width
- Adaptive Workspace content width
- Adaptive Workspace field-grid behavior

## RECRUIT CARD UI — LOCKED

- Recruit summary placement is protected.
- Academic Interests placement is protected.
- Schools of Interest remains on the right.
- Desktop AWs use the canonical compact multi-column grid.
- Do not modify these layouts during unrelated feature work.
- Layout changes require an explicit user request.

Enforced by `src/features/recruiting/RecruitingWorkspaceLayout.guardrail.test.ts`.

## Recruit workspace

1. **Schools of Interest** stays in the **upper-right** of the desktop Recruit
   card (`data-recruit-summary-academic` / `data-recruit-summary-schools`).
   It is not an Adaptive Workspace section.
2. **Academic Interests** stays compact in that same Recruit-card right
   column (`data-recruit-summary-academic-interests`). It is not a large
   standalone AW block.
3. Left / primary column (`data-recruit-summary-identity`) holds identity,
   Class, and Hometown.
4. Metric tiles sit **beneath** the two-column header row.
5. Desktop split is unlayered CSS on `[data-recruit-summary-split]` in
   `src/app/globals.css`. Do not replace it with `flex-col` + `md:` column
   utilities.

## Adaptive Workspaces

4. Desktop AW information sections use a **dense 3–4 column field grid**.
5. One-field-per-row desktop AW layouts are prohibited except for fields that
   explicitly opt into full width (`WorkspaceField span` /
   `data-aw-field-span="full"`): notes, next steps, long text, narrative
   evaluation.
6. Mobile may collapse to one column (`max-width: 767px` in `globals.css`).
7. New AW features must use `WorkspaceFieldGrid` / `WorkspaceField` from
   `@/components/adaptive-workspace`. Do not invent a local `grid-cols-1`
   stack.
8. Feature work must not alter AW shell width, workspace navigation width,
   header geometry, or field-grid rules.

Implementation lock:

- Geometry: `[data-aw-field-grid]` in `src/app/globals.css` (unlayered).
- Primitive: `WorkspaceFieldGrid` in `src/components/adaptive-workspace/WorkspaceContent.tsx`.
- Do **not** restore columns with Tailwind `sm:[grid-template-columns:…]`
  or `md:[grid-template-columns:…]`. Those utilities often fail to generate
  in this app and are the recurring cause of vertical field layouts.

## Directory pages

9. Search / Views alignment is locked (`[data-directory-toolbar-primary-row]`).
10. Filters remain in their established location.

## Navigation

11. Nested Recruiting navigation geometry and indentation are locked.

## What to do instead of “fixing” layout in a feature

- Put recruit summary fields in `RecruitWorkspaceProfile`.
- Put AW fields inside `WorkspaceFieldGrid`.
- Put long text in `WorkspaceField span`.
- If a layout looks wrong, restore the shell/CSS — do not duplicate the
  field into a new stacked section.
