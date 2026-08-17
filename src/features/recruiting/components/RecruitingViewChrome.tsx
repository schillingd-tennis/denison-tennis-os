import type { ReactNode } from "react";

import { SaveIndicator, type InlineSaveStatus } from "@/components/inline-edit";

/**
 * Shared List/Rank vertical shell below filters:
 * context header → view-level actions → table content.
 * Rank View is the structural reference for spacing and alignment.
 */
export default function RecruitingViewChrome({
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
  contextMeta: ReactNode;
  foundSetFeedback?: string;
  saveStatus: InlineSaveStatus;
  saveError?: string;
  actionButtons: ReactNode;
  mobileActionBar?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        {contextHeader}
        {contextMeta}
      </div>

      {error}

      <div className="flex flex-wrap items-center justify-end gap-1.5 max-md:hidden">
        {foundSetFeedback ? (
          <span className="text-xs font-medium text-success" role="status">
            {foundSetFeedback}
          </span>
        ) : null}
        <SaveIndicator status={saveStatus} error={saveError} />
        {actionButtons}
      </div>

      {mobileActionBar}

      {children}
    </div>
  );
}

/** Right-side metadata line shared by List and Rank context rows. */
export function RecruitingViewContextMeta({ children }: { children: ReactNode }) {
  return <p className="text-sm tabular-nums text-text-secondary">{children}</p>;
}
