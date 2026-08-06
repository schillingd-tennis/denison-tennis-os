import type { ReactNode } from "react";

/**
 * BP-035C — Definition for one Adaptive Workspace module.
 * Module-agnostic: Person, Recruiting, Operations, etc. supply definitions.
 */
export type AdaptiveWorkspaceDefinition = {
  id: string;
  title: string;
  subtitle?: string;
  /** Optional future toolbar actions (Save, Add, Filter, …). */
  toolbar?: ReactNode;
  content: ReactNode;
};
