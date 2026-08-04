import type { ReactNode } from "react";

import WorkspaceSection from "@/components/WorkspaceSection";

import type { FormMode } from "./types";

/**
 * Groups `EditableField`s under a titled card, matching the existing
 * `WorkspaceSection` chrome exactly. In view mode, if every field in the
 * section is empty, shows a plain-language fallback instead of an empty
 * grid — the same convention `PlayerWorkspace` used before BP-013.
 */
export default function EditableSection({
  title,
  mode,
  isEmpty,
  emptyLabel = "No information on file.",
  action,
  children,
}: {
  title: string;
  mode: FormMode;
  isEmpty?: boolean;
  emptyLabel?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const showEmptyState = mode === "view" && isEmpty;

  return (
    <WorkspaceSection title={title} action={action}>
      {showEmptyState ? (
        <p className="text-sm text-text-secondary">{emptyLabel}</p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">{children}</dl>
      )}
    </WorkspaceSection>
  );
}
