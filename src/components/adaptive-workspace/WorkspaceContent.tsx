import type { ReactNode } from "react";

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
 * Mobile (< md): stacked / 1–2 column layouts, no horizontal overflow.
 * Desktop (md+): preserve multi-column density from approved layouts.
 */

const fieldGridDesktop: Record<2 | 3 | 4, string> = {
  2: "md:[grid-template-columns:repeat(2,minmax(0,1fr))]",
  3: "md:[grid-template-columns:repeat(3,minmax(0,1fr))]",
  4: "md:[grid-template-columns:repeat(4,minmax(0,1fr))]",
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

export function WorkspaceSection({
  title,
  leading,
  children,
}: {
  title: string;
  leading?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="min-w-0">
      <h3 className={`flex items-center gap-1.5 ${typeRole.workspaceGroupTitle}`}>
        {leading}
        {title}
      </h3>
      <div className="mt-2 min-w-0">{children}</div>
    </section>
  );
}

/** Recruit Personal Info / Academics section title — accent label + vertical mark. */
export function WorkspaceAccentHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-1.5 text-[13px] font-semibold leading-none text-[var(--module-accent)]">
      <span
        className="inline-block h-4 w-[3px] shrink-0 rounded-[1px] bg-[var(--module-accent)]"
        aria-hidden
      />
      {children}
    </h3>
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
  leading,
  children,
}: {
  title?: string;
  columns?: 1 | 2 | 3 | 4;
  leading?: ReactNode;
  children: ReactNode;
}) {
  const grid =
    columns === 1
      ? ""
      : columns === 4
        ? fieldGridDesktop[4]
        : columns === 3
          ? fieldGridDesktop[3]
          : fieldGridDesktop[2];

  return (
    <section aria-label={title} className="min-w-0">
      {title ? (
        <h3
          className={
            leading
              ? `flex items-center gap-1.5 ${typeRole.workspaceGroupTitle}`
              : typeRole.workspaceGroupTitle
          }
        >
          {leading}
          {title}
        </h3>
      ) : null}
      <dl className={`${title ? "mt-2" : ""} grid grid-cols-1 gap-x-6 gap-y-2.5 ${grid}`}>
        {children}
      </dl>
    </section>
  );
}

/**
 * Field definition list. Always 1 column below `md`; desktop uses `columns`.
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
      className={`grid grid-cols-1 gap-x-6 gap-y-[7px] ${fieldGridDesktop[columns]} ${className ?? ""}`}
    >
      {children}
    </dl>
  );
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
    <div className={`min-w-0 ${span ? "md:col-span-full" : ""}`}>
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
