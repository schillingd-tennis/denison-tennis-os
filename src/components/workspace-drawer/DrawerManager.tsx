"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  lockBodyScroll,
  unlockBodyScroll,
} from "@/components/command-palette/lockBodyScroll";

import WorkspaceDrawer from "./WorkspaceDrawer";
import type { DrawerDescriptor } from "./types";

const EXIT_MS = 200;

type DrawerManagerValue = {
  /** Whether a drawer is open (including exit animation). */
  isOpen: boolean;
  activeDrawer: DrawerDescriptor | null;
  openDrawer: (descriptor: DrawerDescriptor) => void;
  closeDrawer: () => void;
  replaceDrawer: (descriptor: DrawerDescriptor) => void;
};

const DrawerManagerContext = createContext<DrawerManagerValue | null>(null);

/**
 * BP-034A — Central Drawer Manager.
 *
 * Pages open drawers through this API instead of mounting local drawer state.
 * Mount once in AppShell; consume via `useDrawerManager()`.
 */
export function DrawerManagerProvider({ children }: { children: ReactNode }) {
  const [descriptor, setDescriptor] = useState<DrawerDescriptor | null>(null);
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef<(() => void) | undefined>(undefined);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current != null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const openDrawer = useCallback(
    (next: DrawerDescriptor) => {
      clearExitTimer();
      closingRef.current = false;
      onCloseRef.current = next.onClose;
      setDescriptor(next);
      setVisible(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    },
    [clearExitTimer],
  );

  const closeDrawer = useCallback(() => {
    if (!descriptor || closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    clearExitTimer();
    exitTimerRef.current = window.setTimeout(() => {
      const finished = onCloseRef.current;
      onCloseRef.current = undefined;
      setDescriptor(null);
      closingRef.current = false;
      exitTimerRef.current = null;
      finished?.();
    }, EXIT_MS);
  }, [clearExitTimer, descriptor]);

  const replaceDrawer = useCallback(
    (next: DrawerDescriptor) => {
      clearExitTimer();
      closingRef.current = false;
      onCloseRef.current = next.onClose;
      setDescriptor(next);
      setVisible(true);
    },
    [clearExitTimer],
  );

  useEffect(() => {
    return () => clearExitTimer();
  }, [clearExitTimer]);

  useEffect(() => {
    if (!descriptor) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeDrawer();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [descriptor, closeDrawer]);

  useEffect(() => {
    if (!descriptor) return;
    lockBodyScroll("[data-workspace-drawer-scroll]");
    return () => unlockBodyScroll();
  }, [descriptor]);

  const value = useMemo(
    () => ({
      isOpen: descriptor != null,
      activeDrawer: descriptor,
      openDrawer,
      closeDrawer,
      replaceDrawer,
    }),
    [descriptor, openDrawer, closeDrawer, replaceDrawer],
  );

  return (
    <DrawerManagerContext.Provider value={value}>
      {children}
      <WorkspaceDrawer
        open={descriptor != null}
        visible={visible}
        onClose={closeDrawer}
        title={descriptor?.title ?? ""}
        subtitle={descriptor?.subtitle}
        primaryAction={
          descriptor?.hideFooter
            ? undefined
            : descriptor?.primaryAction
            ? {
                ...descriptor.primaryAction,
                onClick: () => {
                  descriptor.primaryAction?.onClick?.();
                  if (!descriptor.primaryAction?.onClick) closeDrawer();
                },
              }
            : undefined
        }
        cancelAction={
          descriptor && !descriptor.hideFooter
            ? {
                label: descriptor.cancelAction?.label ?? "Cancel",
                onClick: () => {
                  descriptor.cancelAction?.onClick?.();
                  closeDrawer();
                },
              }
            : undefined
        }
        footer={descriptor?.hideFooter ? null : undefined}
      >
        {descriptor?.content}
      </WorkspaceDrawer>
    </DrawerManagerContext.Provider>
  );
}

export function useDrawerManager(): DrawerManagerValue {
  const ctx = useContext(DrawerManagerContext);
  if (!ctx) {
    throw new Error("useDrawerManager must be used within DrawerManagerProvider");
  }
  return ctx;
}
