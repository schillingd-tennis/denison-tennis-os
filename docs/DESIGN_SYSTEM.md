# Denison Tennis OS — Design System

This document is the single source of truth for the application's core visual
values: colors, corner radii, and shell sizing. All tokens are defined in one
place — `src/app/globals.css` — using Tailwind CSS v4's `@theme` directive.
Every shell component consumes these tokens via generated Tailwind utility
classes (e.g. `bg-denison-red`) or, for non-color tokens, via `var(...)`
(e.g. `w-[var(--sidebar-width)]`).

## Official brand color

**Denison Red is exactly `#C8102E`.** No other red should appear anywhere in
the application. Use the `denison-red` token (`bg-denison-red`,
`text-denison-red`, `border-denison-red`) — never an approximate or
hand-picked red.

## Color palette

| Token | Value | Tailwind utility (examples) | Usage |
|---|---|---|---|
| `--color-denison-red` | `#C8102E` | `bg-denison-red`, `text-denison-red` | Brand accent, active nav item, avatar, "TENNIS" wordmark |
| `--color-sidebar` | `#16161A` | `bg-sidebar` | Sidebar background (softened off-black, BP-008) |
| `--color-sidebar-hover` | `#232328` | `bg-sidebar-hover` | Sidebar item hover state |
| `--color-app-background` | `#F7F8FA` | `bg-app-background` | Outer app canvas background |
| `--color-surface` | `#FFFFFF` | `bg-surface`, `text-surface` | Header bar, and any white foreground text/fill (e.g. on the sidebar or accent color) |
| `--color-border` | `#E5E7EB` | `border-border` | Dividers, outlines |
| `--color-text-primary` | `#111827` | `text-text-primary` | Primary body/heading text |
| `--color-text-secondary` | `#6B7280` | `text-text-secondary` | Muted/secondary text (descriptions, subtext, inactive nav labels) |
| `--color-success` | `#16A34A` | `bg-success`, `text-success` | Positive/success states (e.g. the "Call" quick action on team cards) |
| `--color-warning` | `#F59E0B` | `bg-warning`, `text-warning` | Reserved for future warning states |
| `--color-danger` | `#DC2626` | `bg-danger`, `text-danger` | Reserved for future destructive/error states |
| `--color-info` | `#2563EB` | `bg-info`, `text-info` | Informational accent, restrained (e.g. the "Text" quick action on team cards) |

## Shell sizing

| Token | Value | Applied via |
|---|---|---|
| `--sidebar-width` | `260px` | `w-[var(--sidebar-width)]` / `md:pl-[var(--sidebar-width)]` |
| `--header-height` | `88px` | `min-h-[var(--header-height)]` |

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

## Rule for future work

**Future features must use these shared design tokens rather than arbitrary
hard-coded colors, radii, or shell dimensions.** If a new value is genuinely
needed, add it to the `@theme` block in `src/app/globals.css` and to this
document — do not introduce a second, competing source of truth for an
existing concept (e.g. a second "red," a second border color, etc.).

Typography roles should be extended in `src/components/typography/roles.ts`
rather than inventing one-off text stacks in feature code.
