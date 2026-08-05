/**
 * BP-024A — Typography roles (People / design system).
 *
 * Small, reusable text styles. Prefer these over ad-hoc `text-*` / `font-*`
 * stacks in the People module. Colors come from existing design tokens only.
 *
 * Hierarchy:
 *   personName / personNameHero  → strongest
 *   fieldValue                   → readable content under labels
 *   metadata / metadataSm        → quieter supporting facts
 *   sectionTitle / sectionLabel / tableHeader → structure, not content
 */

export const typeRole = {
  /** List + card person names — strongest element in a row/card. */
  personName: "truncate text-sm font-semibold tracking-tight text-text-primary",

  /** Workspace hero name. */
  personNameHero: "text-2xl font-semibold tracking-tight text-text-primary",

  /** Quiet identity under a name (RoleBadge). */
  identityMeta: "max-w-full truncate text-[11px] font-normal text-text-secondary",

  /** Phone, email, hometown, and other supporting facts. */
  metadata: "text-sm text-text-secondary",

  /** Denser supporting text (detail lines, counts, status labels). */
  metadataSm: "text-xs text-text-secondary",

  /** Empty / placeholder dashes. */
  metadataEmpty: "text-text-secondary/45",

  /** Directory table column headers. */
  tableHeader: "text-xs font-medium tracking-wide text-text-secondary uppercase",

  /** Workspace section titles (Personal, Contact, …). */
  sectionTitle: "text-sm font-semibold tracking-wide text-text-primary uppercase",

  /** Field labels inside workspace sections. */
  sectionLabel: "text-xs font-medium tracking-wide text-text-secondary uppercase",

  /** Primary field values under a section label. */
  fieldValue: "text-sm text-text-primary",
} as const;

export type TypeRole = keyof typeof typeRole;

/** Join role classes with optional extras (layout-only preferred). */
export function typeClass(role: TypeRole, extra?: string): string {
  return extra ? `${typeRole[role]} ${extra}` : typeRole[role];
}
