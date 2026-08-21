import type { ReactNode } from "react";

import { typeRole } from "@/components/typography";

/**
 * OS-wide Person / Recruit Adaptive Workspace shell.
 *
 * Two explicit presentation branches share the same workspace state and
 * definitions from the parent — this component is presentation only.
 *
 * Mobile (< md): selector + full-width AdaptiveWorkspace (caller supplies).
 * Desktop (md+): BP-036D nav rail + content pane (exact original geometry).
 *
 * Uses `max-md:hidden` + `md:hidden` (not `hidden md:grid`) so the desktop
 * split is `display: grid` by default and cannot collapse to an empty pane
 * if a `md:grid` utility fails to generate.
 */
export function PersonWorkspaceMobilePane({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 md:hidden">{children}</div>;
}

export function PersonWorkspaceDesktopSplit({
  nav,
  content,
}: {
  nav: ReactNode;
  content: ReactNode;
}) {
  return (
    <div
      className="grid min-h-[420px] w-full grid-cols-[minmax(260px,320px)_minmax(0,1fr)] grid-rows-1 items-stretch overflow-hidden rounded-card border border-[var(--module-border)] bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)] max-md:hidden"
      style={{ gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)" }}
    >
      <aside className="flex min-h-0 min-w-0 flex-col border-r border-[var(--module-border)]">
        <div className="shrink-0 border-b border-[var(--module-border)] px-3.5 py-2">
          <h2 className={typeRole.sectionTitle}>Workspaces</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
      </aside>
      <div className="min-h-0 min-w-0">{content}</div>
    </div>
  );
}

export default function PersonWorkspaceShell({
  mobile,
  desktop,
}: {
  mobile: ReactNode;
  desktop: ReactNode;
}) {
  return (
    <section aria-label="Workspaces">
      {mobile}
      {desktop}
    </section>
  );
}
