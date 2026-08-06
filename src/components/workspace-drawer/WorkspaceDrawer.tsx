"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import DrawerBody from "./DrawerBody";
import DrawerFooter, { DrawerFooterActions } from "./DrawerFooter";
import DrawerHeader from "./DrawerHeader";
import DrawerOverlay from "./DrawerOverlay";
import type { DrawerAction } from "./types";

/**
 * BP-034A — Reusable right-side workspace drawer shell.
 *
 * Desktop: ~480px panel from the right.
 * Mobile: full-screen slide-up.
 * Compose with DrawerHeader / DrawerBody / DrawerFooter, or pass
 * title/content/actions for the standard layout.
 */
export default function WorkspaceDrawer({
  open,
  visible,
  onClose,
  title,
  subtitle,
  children,
  primaryAction,
  cancelAction,
  footer,
}: {
  /** Whether the drawer is mounted / active. */
  open: boolean;
  /** Entered state for CSS transitions (true after open paint). */
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  primaryAction?: DrawerAction;
  cancelAction?: DrawerAction;
  /** Optional custom footer; defaults to Cancel + primary. */
  footer?: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !visible) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, visible]);

  if (!open) return null;

  const handleCancel = () => {
    cancelAction?.onClick?.();
    if (!cancelAction?.onClick) onClose();
  };

  const handlePrimary = () => {
    primaryAction?.onClick?.();
  };

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <DrawerOverlay visible={visible} onClose={onClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          "absolute flex flex-col bg-surface outline-none",
          // Mobile: full-screen slide-up
          "inset-0",
          "transition-transform duration-200 ease-out",
          visible ? "translate-y-0" : "translate-y-full",
          // Desktop / tablet: right panel
          "md:inset-y-0 md:left-auto md:right-0 md:w-[min(100%,480px)] md:translate-y-0",
          "md:border-l md:border-border/80",
          "md:shadow-[-12px_0_40px_rgba(17,24,39,0.08)]",
          visible ? "md:translate-x-0" : "md:translate-x-full",
        ].join(" ")}
      >
        <DrawerHeader
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          titleId={titleId}
        />
        <DrawerBody>{children}</DrawerBody>
        <DrawerFooter>
          {footer ?? (
            <DrawerFooterActions
              cancelLabel={cancelAction?.label ?? "Cancel"}
              onCancel={handleCancel}
              primaryLabel={primaryAction?.label}
              onPrimary={handlePrimary}
              primaryDisabled={primaryAction?.disabled}
            />
          )}
        </DrawerFooter>
      </div>
    </div>
  );
}
