"use client";

import type { ReactNode } from "react";

import AdaptiveWorkspaceHeader from "./AdaptiveWorkspaceHeader";
import type { AdaptiveWorkspaceDefinition } from "./types";

/**
 * BP-035C — Permanent Adaptive Workspace container.
 *
 * The surrounding page (header, executive overview, performance) stays put.
 * Only this surface swaps module content with a short enter animation.
 */
export default function AdaptiveWorkspace({
  activeId,
  workspaces,
  emptyLabel = "Select a workspace to begin.",
  className,
}: {
  activeId: string | null;
  workspaces: AdaptiveWorkspaceDefinition[];
  emptyLabel?: string;
  className?: string;
}) {
  const active = workspaces.find((workspace) => workspace.id === activeId) ?? null;

  return (
    <section
      className={`flex min-h-[280px] flex-col overflow-hidden rounded-card border border-border/70 bg-surface ${className ?? ""}`}
      aria-label="Adaptive workspace"
      aria-live="polite"
    >
      {!active ? (
        <div
          key="empty"
          className="flex flex-1 animate-[adaptive-workspace-enter_160ms_ease-out] items-center justify-center px-6 py-16"
        >
          <p className="text-sm text-text-secondary">{emptyLabel}</p>
        </div>
      ) : (
        <div
          key={active.id}
          className="flex min-h-0 flex-1 animate-[adaptive-workspace-enter_160ms_ease-out] flex-col"
        >
          <AdaptiveWorkspaceHeader
            title={active.title}
            subtitle={active.subtitle}
            toolbar={active.toolbar}
          />
          <div className="min-h-0 flex-1 px-5 py-5">{active.content}</div>
        </div>
      )}
    </section>
  );
}

/** Lightweight placeholder body used until a module is implemented. */
export function AdaptiveWorkspacePlaceholder({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">{message}</p>
      {action}
    </div>
  );
}
