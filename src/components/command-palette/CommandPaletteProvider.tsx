"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CommandPaletteContextValue = {
  open: boolean;
  /** Increments each time the palette opens so the dialog remounts clean. */
  sessionId: number;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [sessionId, setSessionId] = useState(0);

  const setOpen = useCallback(
    (next: boolean) => {
      if (next) {
        if (!open) setSessionId((id) => id + 1);
        setOpenState(true);
        return;
      }
      setOpenState(false);
    },
    [open],
  );

  const toggle = useCallback(() => {
    if (open) {
      setOpenState(false);
      return;
    }
    setSessionId((id) => id + 1);
    setOpenState(true);
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isModK =
        (event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey);
      if (!isModK) return;
      event.preventDefault();
      toggle();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const value = useMemo(
    () => ({
      open,
      sessionId,
      setOpen,
      toggle,
    }),
    [open, sessionId, setOpen, toggle],
  );

  return (
    <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return ctx;
}
