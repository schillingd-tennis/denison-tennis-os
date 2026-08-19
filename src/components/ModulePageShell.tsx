import type { ReactNode } from "react";

/**
 * Top-level OS module page shell.
 *
 * Geometry is copied from the approved Recruiting List page: title block,
 * accent line, subtitle spacing, header-row alignment, and gap down to
 * summary cards / content. Do not fork these values per module.
 *
 * Page inset (distance from the global header) is AppShell `py-10`, the
 * same `main` padding Recruiting List shipped with. Do not add
 * module-specific top margin or padding.
 */
export default function ModulePageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative pl-4">
          <span
            aria-hidden="true"
            className="absolute top-1 bottom-1 left-0 w-[3px] rounded-full bg-[var(--module-accent)]"
          />
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
