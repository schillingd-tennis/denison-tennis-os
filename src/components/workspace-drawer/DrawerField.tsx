import type { ReactNode } from "react";

import { typeRole } from "@/components/typography";

/**
 * Shared form field wrapper for WorkspaceDrawer / slide-over bodies.
 *
 * Individual field labels use regular/medium weight only — never semibold or bold.
 * Section headings, record titles, and actions are exempt (do not use this for those).
 */
export default function DrawerField({
  label,
  children,
  tone = "primary",
}: {
  label: string;
  children: ReactNode;
  /** `primary` matches Hotels/Officials/Drill drawers; `muted` matches Interactions/Schedule. */
  tone?: "primary" | "muted";
}) {
  const labelClass =
    tone === "muted" ? typeRole.drawerFieldLabelMuted : typeRole.drawerFieldLabel;

  return (
    <label className={`grid gap-1.5 ${labelClass}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
