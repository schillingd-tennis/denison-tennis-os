import type { ReactNode } from "react";

import { typeRole } from "@/components/typography";

/**
 * BP-035C — Consistent header for every Adaptive Workspace module.
 *
 * Right-side action slot is always reserved so titles stay put when a
 * workspace has no toolbar (Family / Communications vs Export).
 */
export default function AdaptiveWorkspaceHeader({
  title,
  subtitle,
  toolbar,
}: {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
}) {
  return (
    <header className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-[var(--module-border)] px-4 py-2 sm:px-5">
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold tracking-tight text-text-primary">
          {title}
        </h3>
        {subtitle ? (
          <p className={`mt-0.5 truncate ${typeRole.metadataSm}`}>{subtitle}</p>
        ) : null}
      </div>
      {/* Reserved action slot so workspace titles do not shift when Export is absent. */}
      <div className="flex min-h-[26px] min-w-[5.5rem] shrink-0 items-center justify-end">
        {toolbar}
      </div>
    </header>
  );
}
