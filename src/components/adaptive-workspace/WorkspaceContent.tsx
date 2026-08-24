import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { typeRole } from "@/components/typography";
import { EMPTY_VALUE } from "@/lib/formatting";

/**
 * LOCKED OS UI CONTRACT — do not modify for feature-specific work.
 *
 * Field-grid geometry is a locked OS contract (`docs/UI-GUARDRAILS.md`).
 * Column counts live on `data-aw-field-grid` and are applied in unlayered
 * CSS (`src/app/layout-lock.css`). Do not restore density with Tailwind `sm:` /
 * `md:` `grid-template-columns` utilities — they often fail to generate here
 * and collapse every AW back to one field per row.
 *
 * Feature modules supply field content. They must not redefine grid geometry.
 */

type FieldGridColumns = 2 | 3 | 4;

/** Soft tint families for workspace section header bars (never loud / saturated). */
export type WorkspaceSectionTone =
  | "module"
  | "neutral"
  | "success"
  | "warning"
  | "info"
  | "knowledge"
  | "research"
  | "operations";

const sectionToneStyles: Record<
  WorkspaceSectionTone,
  { bar: string; icon: string }
> = {
  module: {
    bar: "bg-[var(--module-tint)] text-[var(--module-accent)]",
    icon: "text-[var(--module-accent)]",
  },
  neutral: {
    bar: "bg-black/[0.035] text-text-primary",
    icon: "text-text-secondary",
  },
  success: {
    bar: "bg-success/[0.08] text-success",
    icon: "text-success",
  },
  warning: {
    bar: "bg-warning/[0.10] text-warning",
    icon: "text-warning",
  },
  info: {
    bar: "bg-info/[0.08] text-info",
    icon: "text-info",
  },
  knowledge: {
    bar: "bg-knowledge/[0.08] text-knowledge",
    icon: "text-knowledge",
  },
  research: {
    bar: "bg-research/[0.08] text-research",
    icon: "text-research",
  },
  operations: {
    bar: "bg-operations/[0.08] text-operations",
    icon: "text-operations",
  },
};

export function WorkspaceContent({
  columns = 3,
  children,
}: {
  columns?: 2 | 3;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-1 [&>*]:border-b [&>*]:border-border/50 [&>*]:pb-5 [&>*]:pt-5 [&>*:first-child]:pt-0 [&>*:last-child]:border-b-0 [&>*:last-child]:pb-0 lg:[&>*]:border-b-0 lg:[&>*]:py-0 lg:[&>*]:border-l lg:[&>*]:px-6 lg:[&>*:first-child]:border-l-0 lg:[&>*:first-child]:pl-0 lg:[&>*:last-child]:pr-0 ${
        columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
      }`}
    >
      {children}
    </div>
  );
}

export function WorkspaceStack({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 [&>*+*]:border-t [&>*+*]:border-border/50 [&>*+*]:pt-5">
      {children}
    </div>
  );
}

/**
 * OS-wide Adaptive Workspace section header.
 *
 * Compact shaded bar + optional icon + uppercase label. Same visual language
 * at all breakpoints — mobile ~44px (`h-11`), desktop ~36px (`md:h-9`).
 *
 * Section-level headings only — never use for ordinary field labels.
 */
export function WorkspaceSectionHeader({
  label,
  icon: Icon,
  tone = "module",
}: {
  label: ReactNode;
  icon?: LucideIcon;
  tone?: WorkspaceSectionTone;
}) {
  const styles = sectionToneStyles[tone];
  return (
    <h3
      className={`flex h-11 w-full min-w-0 items-center gap-2.5 rounded-control px-3 md:h-9 ${styles.bar}`}
    >
      {Icon ? (
        <Icon className={`h-4 w-4 shrink-0 ${styles.icon}`} strokeWidth={1.75} aria-hidden />
      ) : null}
      <span className="min-w-0 text-[12px] font-semibold leading-tight tracking-[0.06em] uppercase">
        {label}
      </span>
    </h3>
  );
}

/** @deprecated Prefer `WorkspaceSectionHeader`. Alias kept for existing imports. */
export const MobileWorkspaceSectionHeader = WorkspaceSectionHeader;

/**
 * Adaptive Workspace section title — shaded header on mobile and desktop.
 * Prefer this (or `WorkspaceSectionHeader`) for all workspace section labels.
 */
export function WorkspaceAccentHeading({
  children,
  icon,
  tone = "module",
}: {
  children: ReactNode;
  icon?: LucideIcon;
  tone?: WorkspaceSectionTone;
}) {
  return <WorkspaceSectionHeader label={children} icon={icon} tone={tone} />;
}

export function WorkspaceSection({
  title,
  icon,
  tone = "module",
  children,
}: {
  title: string;
  icon?: LucideIcon;
  tone?: WorkspaceSectionTone;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="min-w-0">
      <WorkspaceSectionHeader label={title} icon={icon} tone={tone} />
      <div className="mt-2 min-w-0">{children}</div>
    </section>
  );
}

/**
 * Two-pane content split. Stacks vertically below `md`; desktop keeps the
 * supplied column template (default 38/62).
 */
export function WorkspaceSplit({
  left,
  right,
  columns = "minmax(0, 0.38fr) minmax(0, 0.62fr)",
}: {
  left: ReactNode;
  right: ReactNode;
  columns?: string;
}) {
  return (
    <div
      className="grid w-full min-w-0 grid-cols-1 gap-y-3 md:gap-x-8 md:[grid-template-columns:var(--workspace-split-cols)]"
      style={{ ["--workspace-split-cols" as string]: columns }}
    >
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}

export function WorkspaceFieldGroup({
  title,
  columns = 2,
  icon,
  tone = "module",
  children,
}: {
  title?: string;
  columns?: 1 | 2 | 3 | 4;
  icon?: LucideIcon;
  tone?: WorkspaceSectionTone;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="min-w-0">
      {title ? <WorkspaceSectionHeader label={title} icon={icon} tone={tone} /> : null}
      {columns === 1 ? (
        <dl className={`${title ? "mt-2" : ""} grid grid-cols-1 gap-x-6 gap-y-2.5`}>{children}</dl>
      ) : (
        <dl
          data-aw-field-grid={columns}
          className={`${title ? "mt-2" : ""}`}
        >
          {children}
        </dl>
      )}
    </section>
  );
}

/**
 * LOCKED OS UI CONTRACT — do not modify for feature-specific work.
 *
 * Canonical desktop Adaptive Workspace field grid. Geometry is owned by
 * `[data-aw-field-grid]` in `layout-lock.css`. `columns` is the desktop
 * target (3 or 4). CSS collapses toward 1 on mobile. Pass `span` on
 * `WorkspaceField` for notes / long text.
 */
export function WorkspaceFieldGrid({
  columns = 3,
  className,
  children,
}: {
  columns?: FieldGridColumns;
  className?: string;
  children: ReactNode;
}) {
  return (
    <dl data-aw-field-grid={columns} className={className}>
      {children}
    </dl>
  );
}

export function WorkspaceField({
  label,
  children,
  span = false,
}: {
  label: string;
  children: ReactNode;
  /** Full width on multi-column desktop grids (e.g. address / notes). */
  span?: boolean;
}) {
  return (
    <div className="min-w-0" data-aw-field-span={span ? "full" : undefined}>
      <dt className={typeRole.workspaceFieldLabel}>{label}</dt>
      <dd className="mt-1 min-w-0 break-words [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

export function WorkspaceReadOnlyValue({ value }: { value: string }) {
  const empty = !value.trim() || value === EMPTY_VALUE;
  return (
    <span
      className={`break-words [overflow-wrap:anywhere] ${typeRole.workspaceFieldValue} ${empty ? typeRole.metadataEmpty : ""}`}
    >
      {empty ? EMPTY_VALUE : value}
    </span>
  );
}

export function WorkspaceMutedNote({ children }: { children: ReactNode }) {
  return <p className={typeRole.metadataSm}>{children}</p>;
}

/**
 * Horizontal status / badge strip on desktop; wraps to 2 cols on mobile.
 */
export function WorkspaceStatusStrip({ children }: { children: ReactNode }) {
  return (
    <div className="mt-[5px] grid w-full min-w-0 grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 md:flex md:flex-nowrap md:items-start md:justify-between md:gap-x-3 md:gap-y-0">
      {children}
    </div>
  );
}

export function WorkspaceStatusStripItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start md:w-max md:max-w-full md:shrink-0">
      <p className={`${typeRole.workspaceFieldLabel} text-left md:whitespace-nowrap`}>
        {label}
      </p>
      <div className="mt-0.5 min-w-0 max-w-full text-left">{children}</div>
    </div>
  );
}
