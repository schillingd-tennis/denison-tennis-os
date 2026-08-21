"use client";

import type { ReactNode } from "react";

import AdaptiveWorkspaceHeader from "./AdaptiveWorkspaceHeader";
import type { AdaptiveWorkspaceDefinition } from "./types";

/**
 * BP-035C / BP-036D — Permanent Adaptive Workspace container (right pane).
 *
 * The surrounding page (header, executive overview, performance) stays put.
 * Only this surface swaps module content with a short enter animation.
 *
 * When `framed` is false, omit standalone card chrome so a parent split shell
 * can own the border (desktop two-pane layout).
 *
 * Mobile (< md): tighter horizontal padding + overflow containment.
 * Desktop (md+): original BP-035C padding (`px-5 py-5`), no extra clipping.
 */
export default function AdaptiveWorkspace({
  activeId,
  workspaces,
  emptyLabel = "Select a workspace to begin.",
  framed = true,
  className,
}: {
  activeId: string | null;
  workspaces: AdaptiveWorkspaceDefinition[];
  emptyLabel?: string;
  framed?: boolean;
  className?: string;
}) {
  const active = workspaces.find((workspace) => workspace.id === activeId) ?? null;

  return (
    <section
      className={`flex h-full min-h-[280px] flex-col overflow-hidden max-md:min-w-0 ${
        framed ? "rounded-card border border-[var(--module-border)] bg-surface" : "bg-surface"
      } ${className ?? ""}`}
      aria-label="Adaptive workspace"
      aria-live="polite"
    >
      {!active ? (
        <div
          key="empty"
          className="flex flex-1 animate-[adaptive-workspace-enter_160ms_ease-out] items-center justify-center bg-[var(--module-tint)]/60 px-6 py-16"
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
          <div className="min-h-0 flex-1 px-5 py-5 max-md:min-w-0 max-md:overflow-x-hidden max-md:px-4">
            {active.content}
          </div>
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
