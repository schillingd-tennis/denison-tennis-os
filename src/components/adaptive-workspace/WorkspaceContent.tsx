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
 */

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
    <div className="[&>*+*]:border-t [&>*+*]:border-border/50 [&>*+*]:pt-5">
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
      className="grid w-full min-w-0 gap-x-8 gap-y-3"
      style={{ gridTemplateColumns: columns }}
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
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 3
        ? "sm:grid-cols-3"
        : columns === 2
          ? "sm:grid-cols-2"
          : "";

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
      <dl
        className={`${title ? "mt-2" : ""} grid grid-cols-1 gap-x-6 gap-y-2.5 ${grid}`}
        style={
          columns === 4
            ? { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }
            : undefined
        }
      >
        {children}
      </dl>
    </section>
  );
}

export function WorkspaceFieldGrid({
  columns = 3,
  children,
}: {
  columns?: 2 | 3;
  children: ReactNode;
}) {
  return (
    <dl
      className={`grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2 ${
        columns === 3 ? "lg:grid-cols-3" : ""
      }`}
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
  span?: boolean;
}) {
  return (
    <div className={`min-w-0 ${span ? "sm:col-span-2" : ""}`}>
      <dt className={typeRole.workspaceFieldLabel}>{label}</dt>
      <dd className="mt-1 min-w-0">{children}</dd>
    </div>
  );
}

export function WorkspaceReadOnlyValue({ value }: { value: string }) {
  const empty = !value.trim() || value === EMPTY_VALUE;
  return (
    <span
      className={`${typeRole.workspaceFieldValue} ${empty ? typeRole.metadataEmpty : ""}`}
    >
      {empty ? EMPTY_VALUE : value}
    </span>
  );
}

export function WorkspaceMutedNote({ children }: { children: ReactNode }) {
  return <p className={typeRole.metadataSm}>{children}</p>;
}
