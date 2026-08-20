import type { ReactNode } from "react";

import { SaveIndicator, type InlineSaveStatus } from "@/components/inline-edit";

/**
 * OS-wide directory / table workspace chrome:
 * view header + workspace actions on one row, then the data section.
 *
 * Desktop (md+): header left, Copy / Export / save feedback right, items-end.
 * Below md: header only; callers may pass `mobileActionBar` for touch actions.
 * Do not insert a separate actions row between the header and the table.
 */
export default function ViewChrome({
  contextHeader,
  contextMeta,
  foundSetFeedback,
  saveStatus,
  saveError,
  actionButtons,
  mobileActionBar,
  error,
  children,
}: {
  contextHeader: ReactNode;
  contextMeta?: ReactNode;
  foundSetFeedback?: string;
  saveStatus: InlineSaveStatus;
  saveError?: string;
  actionButtons: ReactNode;
  mobileActionBar?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">{contextHeader}</div>
        <div className="hidden shrink-0 flex-wrap items-center justify-end gap-1.5 md:flex">
          {contextMeta}
          {foundSetFeedback ? (
            <span className="text-xs font-medium text-success" role="status">
              {foundSetFeedback}
            </span>
          ) : null}
          <SaveIndicator status={saveStatus} error={saveError} />
          {actionButtons}
        </div>
      </div>

      {error}

      {mobileActionBar}

      {children}
    </div>
  );
}

/** Optional right-side note in the view-header action cluster (not a record count). */
export function ViewContextMeta({ children }: { children: ReactNode }) {
  return <p className="text-sm tabular-nums text-text-secondary">{children}</p>;
}
