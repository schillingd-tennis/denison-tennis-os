# Denison Tennis OS — Design System

This document is the single source of truth for the application's core visual
values: colors, corner radii, and shell sizing. All tokens are defined in one
place — `src/app/globals.css` — using Tailwind CSS v4's `@theme` directive.
Every shell component consumes these tokens via generated Tailwind utility
classes (e.g. `bg-denison-red`) or, for non-color tokens, via `var(...)`
(e.g. `w-[var(--sidebar-width)]`).

## Official brand color

**Denison Red is exactly `#C8102E`.** Use the `denison-red` token for brand
chrome: sidebar wordmark, login, coach avatar, and the Recruiting module
accent. Do not invent a second brand red.

**Danger / risk uses `--color-danger` (`#DC2626`).** That is a semantic
status color, not a substitute for Denison Red.

## Module identity

AppShell sets `data-module` from the route. CSS variables
`--module-accent`, `--module-tint`, and `--module-border` follow the
active module. Shared chrome (nav, page header, toolbar, tables, primary
actions, empty states) should use these variables via
`src/components/module-theme.ts` — not a hard-coded crimson button in
every module.

| Module | Accent | Notes |
|---|---|---|
| Home / Recruiting | Denison Red `#C8102E` | Recruiting is the crimson product surface |
| Team | `--color-team` `#2563EB` | |
| Operations | `--color-operations` `#B45309` | Distinct from warning amber |
| Research Lab | `--color-research` `#7C3AED` | |
| Knowledge / People | `--color-knowledge` `#0F766E` | Same teal family |
| Settings | `--color-settings` `#475569` | |

Treatments: active nav fill + soft accent shadow; slim page-header bar;
tinted count badge; toolbar panel with matching border; white tables/cards
with a quiet module border and light elevation; empty states with a solid
module panel (not dashed placeholders).

Recruiting directory (module-local, not Team): KPI summary cards, compact
facet menus, and semantic status badges (Pipeline / Interest / Priority /
Getability / analytics Tier). Crimson establishes identity; semantic colors
carry meaning. List interaction: lists are for working; name/avatar opens
the workspace; editable cells edit in place (`docs/DECISIONS.md`).

## Color palette

| Token | Value | Tailwind utility (examples) | Usage |
|---|---|---|---|
| `--color-denison-red` | `#C8102E` | `bg-denison-red`, `text-denison-red` | Brand (wordmark, login, avatar) and Recruiting/Home module accent |
| `--color-team` | `#2563EB` | `bg-team` | Team module accent |
| `--color-operations` | `#B45309` | `bg-operations` | Operations module accent |
| `--color-research` | `#7C3AED` | `bg-research` | Research Lab module accent |
| `--color-knowledge` | `#0F766E` | `bg-knowledge` | Knowledge / People module accent |
| `--color-settings` | `#475569` | `bg-settings` | Settings module accent |
| `--color-sidebar` | `#16161A` | `bg-sidebar` | Sidebar background (softened off-black, BP-008) |
| `--color-sidebar-hover` | `#232328` | `bg-sidebar-hover` | Sidebar item hover state |
| `--color-app-background` | `#F7F8FA` | `bg-app-background` | Outer app canvas background |
| `--color-surface` | `#FFFFFF` | `bg-surface`, `text-surface` | Header bar, and any white foreground text/fill (e.g. on the sidebar or accent color) |
| `--color-border` | `#E5E7EB` | `border-border` | Dividers, outlines |
| `--color-text-primary` | `#111827` | `text-text-primary` | Primary body/heading text |
| `--color-text-secondary` | `#6B7280` | `text-text-secondary` | Muted/secondary text (descriptions, subtext, inactive nav labels) |
| `--color-success` | `#16A34A` | `bg-success`, `text-success` | Positive / strong (not a module color) |
| `--color-warning` | `#F59E0B` | `bg-warning`, `text-warning` | Watch / priority |
| `--color-danger` | `#DC2626` | `bg-danger`, `text-danger` | Risk / error / destructive |
| `--color-info` | `#2563EB` | `bg-info`, `text-info` | Active / information (status, not Team chrome) |

## Shell sizing

| Token | Value | Applied via |
|---|---|---|
| `--sidebar-width` | `260px` | `w-[var(--sidebar-width)]` / `md:pl-[var(--sidebar-width)]` |
| `--header-height` | `88px` | `min-h-[var(--header-height)]` |

Top-level module pages (Team, Recruiting, Team Operations, Fundraising, Research Lab, Knowledge, Home) use AppShell `py-10` plus `ModulePageShell` for title / accent-line / subtitle / action-row geometry (Recruiting List). Do not add per-module max-width, extra top margin, or a second title stack. Person / Recruit workspaces are not this shell.

## Corner radii

| Token | Value | Tailwind utility | Usage |
|---|---|---|---|
| `--radius-card` | `12px` | `rounded-card` | Larger surfaces (e.g. the placeholder workspace outline) |
| `--radius-control` | `10px` | `rounded-control` | Interactive controls (nav items, icon buttons, the brand mark) |

## Typography

No new font package was introduced. The app continues to use the existing
Geist Sans / Geist Mono fonts loaded via `next/font` in `src/app/layout.tsx`,
aliased into the theme as `--font-sans` / `--font-mono`.

### Text roles (BP-024A)

Reusable class stacks live in `src/components/typography/` (`typeRole`).
Prefer these in the People module (and shared components it uses) instead of
ad-hoc `text-*` / `font-*` combinations.

| Role | Usage |
|---|---|
| `personName` | List + card person names (strongest in row/card) |
| `personNameHero` | Workspace hero name |
| `identityMeta` | Quiet role/title under a name (`RoleBadge`) |
| `metadata` / `metadataSm` | Phone, email, hometown, D#, detail lines |
| `metadataEmpty` | Placeholder dashes / empty states |
| `tableHeader` | Directory table column headers |
| `sectionTitle` | Workspace section titles (`WorkspaceSection`) |
| `sectionLabel` | Field labels inside sections |
| `fieldValue` | Primary values under section labels |

Hierarchy: **name → field values → metadata → structural labels.**

## Toolbar (BP-024D)

Reusable shell in `src/components/toolbar/`:

| Piece | Role |
|---|---|
| `Toolbar` | Layout: `primary` (search) → `secondary` (filters) → `tertiary` (view toggle) |
| `SegmentedControl` | Native-feeling segments; active = subtle raised surface, not a bright fill |
| `SearchInput` | Primary field — 44px height, soft border, quiet placeholder |

Modules (Team, Recruiting, Operations, …) compose these slots. Do not invent
Team-specific toolbar chrome.

## Contact action slot order

Compact directory / list / card **Actions** regions always use three **fixed
positional slots**, left to right:

**Call | Text | Email**

Implementation: `src/components/ContactActionSlots.tsx`.

- Each slot has identical dimensions (40px circular `QuickActionButton`).
- Missing actions leave their assigned slot **empty**. Do not render a
  disabled / ghost button in an empty slot.
- Remaining actions **never shift** left, right, or to the center of the
  column. Call is always slot 1, Text slot 2, Email slot 3.
- The three-slot region is centered in the table Actions column. When no
  contact methods exist, show the existing centered empty glyph (`—`).
- This rule is OS-wide (Recruiting, Team, People, Family compact groups, and
  future modules). Do not invent per-module spacing for Call / Text / Email.

Workspace toolbars that mix Call / Text / Email with unrelated actions
(favorites, copy, delete) are not this compact Actions pattern.

## Design Freeze (BP-036C)

Once a UI milestone has been approved and committed, that Git commit becomes
the **canonical design reference**.

- Future milestones may **not** modify approved layouts unless the milestone
  explicitly authorizes UI work.
- Any unrelated UI modification is a **regression**.
- Person Workspace / Adaptive Workspace canonical commit: **`32fd0f8`**,
  as amended by explicit UI milestones (**BP-036D** permanent desktop split).
- Agent rule: `.cursor/rules/design-freeze.mdc`.

## Rule for future work

**Future features must use these shared design tokens rather than arbitrary
hard-coded colors, radii, or shell dimensions.** If a new value is genuinely
needed, add it to the `@theme` block in `src/app/globals.css` and to this
document — do not introduce a second, competing source of truth for an
existing concept (e.g. a second "red," a second border color, etc.).

Typography roles should be extended in `src/components/typography/roles.ts`
rather than inventing one-off text stacks in feature code.
