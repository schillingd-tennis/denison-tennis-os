import type { ReactNode } from "react";

import { typeRole } from "@/components/typography";

/**
 * BP-035C — Consistent header for every Adaptive Workspace module.
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
    <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--module-border)] px-5 py-2">
      <div className="min-w-0">
        <h3 className="text-base font-semibold tracking-tight text-text-primary">
          {title}
        </h3>
        {subtitle ? (
          <p className={`mt-0.5 truncate ${typeRole.metadataSm}`}>{subtitle}</p>
        ) : null}
      </div>
      {toolbar ? <div className="flex shrink-0 items-center gap-2">{toolbar}</div> : null}
    </header>
  );
}
