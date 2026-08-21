import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { typeRole } from "@/components/typography";
import { EMPTY_VALUE } from "@/lib/formatting";

/**
 * Adaptive Workspace content primitives.
 *
 * Shared presentation for the right-hand workspace pane: quiet sentence-case
 * labels, value-forward type, compact grids, and whitespace — not cards —
 * between groups. Recruiting is the first consumer; Players/Coaches should
 * reuse these rather than inventing a second content language.
 *
 * Mobile (< sm): stacked field grids where needed.
 * Compact tablet / desktop (sm+): multi-column field density.
 * Full desktop (md+): preserve established dense layouts (incl. 4-col).
 *
 * Section headings use one OS-wide shaded bar on mobile and desktop
 * (`WorkspaceSectionHeader` / `WorkspaceAccentHeading`).
 */

/** Responsive column templates for `WorkspaceFieldGrid` / `WorkspaceFieldGroup`. */
const fieldGridColumns: Record<2 | 3 | 4, string> = {
  2: "sm:[grid-template-columns:repeat(2,minmax(0,1fr))]",
  3: "sm:[grid-template-columns:repeat(3,minmax(0,1fr))]",
  4: "sm:[grid-template-columns:repeat(2,minmax(0,1fr))] md:[grid-template-columns:repeat(4,minmax(0,1fr))]",
};

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
  const grid =
    columns === 1
      ? ""
      : columns === 4
        ? fieldGridColumns[4]
        : columns === 3
          ? fieldGridColumns[3]
          : fieldGridColumns[2];

  return (
    <section aria-label={title} className="min-w-0">
      {title ? <WorkspaceSectionHeader label={title} icon={icon} tone={tone} /> : null}
      <dl className={`${title ? "mt-2" : ""} grid grid-cols-1 gap-x-6 gap-y-2.5 ${grid}`}>
        {children}
      </dl>
    </section>
  );
}

/**
 * Field definition list.
 * Base: 1 column. `sm+`: requested columns (4-col uses 2 at `sm`, 4 at `md+`).
 */
export function WorkspaceFieldGrid({
  columns = 3,
  className,
  children,
}: {
  columns?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <dl
      className={`grid grid-cols-1 gap-x-6 gap-y-[7px] ${fieldGridColumns[columns]} ${className ?? ""}`}
    >
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
    <div className={`min-w-0 ${span ? "sm:col-span-full" : ""}`}>
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
