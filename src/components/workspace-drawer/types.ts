import type { ReactNode } from "react";

/**
 * BP-034A — Descriptor for a drawer instance managed by DrawerManager.
 * Feature modules open drawers via the manager; they do not mount their own.
 */
export type DrawerAction = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

export type DrawerDescriptor = {
  /** Stable id for the open instance (e.g. "demo-add-note"). */
  id: string;
  title: string;
  subtitle?: string;
  /** Scrollable body content. */
  content: ReactNode;
  primaryAction?: DrawerAction;
  cancelAction?: DrawerAction;
  /** Called after the drawer finishes closing (optional). */
  onClose?: () => void;
};
