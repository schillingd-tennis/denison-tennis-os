"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useBeforeUnloadWarning } from "./DirtyTracker";
import type { FieldErrors, FormMode, SaveStatus } from "./types";

type FormContextValue<T> = {
  mode: FormMode;
  /** The last saved value — what Cancel restores and Save compares against. */
  original: T;
  /** The value currently being displayed/edited. Equal to `original` in view mode. */
  draft: T;
  isDirty: boolean;
  errors: FieldErrors;
  hasErrors: boolean;
  /** Lifecycle of the most recent `save()` call (BP-017 Phase 1). */
  saveStatus: SaveStatus;
  /** User-friendly message set when `saveStatus` is `"error"`. */
  saveError?: string;
  /** Merge a partial patch into the draft (does not require edit mode). */
  updateDraft: (patch: Partial<T>) => void;
  /** Set or clear a single field's live validation message. */
  setFieldError: (field: string, message: string | undefined) => void;
  enterEdit: () => void;
  cancelEdit: () => void;
  /**
   * Runs full validation, then (if valid and there's an `onSave`) persists
   * only the changed fields. Resolves to whether the save succeeded —
   * `false` means either validation failed or the persist call rejected
   * (see `saveError` for why). Stays in edit mode with the draft intact on
   * failure so nothing the user typed is lost.
   */
  save: () => Promise<boolean>;
};

// The provider is generic per-instance; the context itself is untyped since
// a single React Context can't carry a type parameter. `useFormContext<T>`
// re-applies the caller's type at the boundary.
const FormContext = createContext<FormContextValue<unknown> | null>(null);

export function useFormContext<T>(): FormContextValue<T> {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within a <FormProvider>.");
  }
  return context as FormContextValue<T>;
}

/** How long the toolbar shows "Saved" before settling back to idle. */
const SAVED_STATUS_DISPLAY_MS = 2000;

/** Shallow, key-by-key diff — used to send only the fields that changed. */
function diff<T extends object>(base: T, next: T): Partial<T> {
  const patch: Partial<T> = {};
  const keys = new Set<keyof T>([
    ...(Object.keys(base) as (keyof T)[]),
    ...(Object.keys(next) as (keyof T)[]),
  ]);

  for (const key of keys) {
    if (JSON.stringify(base[key]) !== JSON.stringify(next[key])) {
      patch[key] = next[key];
    }
  }

  return patch;
}

export function FormProvider<T extends object>({
  value,
  validate,
  onSave,
  children,
}: {
  /** The saved value to edit. */
  value: T;
  /** Full-record validation run when Save is clicked; blocks save if it returns any errors. */
  validate?: (draft: T) => FieldErrors;
  /**
   * Persists a save. Receives only the fields that changed since the last
   * save (plus the full draft for context) and should resolve with the
   * authoritative saved record (e.g. with a server-updated `updatedAt`), or
   * reject with an `Error` whose `message` is safe to show the user.
   */
  onSave?: (patch: Partial<T>, draft: T) => Promise<T>;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<FormMode>("view");
  const [original, setOriginal] = useState<T>(value);
  const [draft, setDraft] = useState<T>(value);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | undefined>(undefined);

  const isDirty = useMemo(() => JSON.stringify(original) !== JSON.stringify(draft), [original, draft]);
  const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors]);

  useBeforeUnloadWarning(isDirty);

  // "Saved" is a transient confirmation, not a resting state — settle back
  // to idle so re-entering edit mode later doesn't show a stale confirmation.
  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timer = setTimeout(() => setSaveStatus("idle"), SAVED_STATUS_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  const updateDraft = useCallback((patch: Partial<T>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setSaveStatus("idle");
    setSaveError(undefined);
  }, []);

  const setFieldError = useCallback((field: string, message: string | undefined) => {
    setErrors((prev) => {
      if (!message) {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: message };
    });
  }, []);

  const enterEdit = useCallback(() => {
    setDraft(original);
    setErrors({});
    setSaveStatus("idle");
    setSaveError(undefined);
    setMode("edit");
  }, [original]);

  const cancelEdit = useCallback(() => {
    setDraft(original);
    setErrors({});
    setSaveStatus("idle");
    setSaveError(undefined);
    setMode("view");
  }, [original]);

  const save = useCallback(async (): Promise<boolean> => {
    const validationErrors = validate ? validate(draft) : {};
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return false;

    if (!isDirty) {
      setMode("view");
      return true;
    }

    if (!onSave) {
      setOriginal(draft);
      setMode("view");
      return true;
    }

    const patch = diff(original, draft);
    setSaveStatus("saving");
    setSaveError(undefined);

    try {
      const saved = await onSave(patch, draft);
      setOriginal(saved);
      setDraft(saved);
      setMode("view");
      setSaveStatus("saved");
      return true;
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Something went wrong while saving. Please try again.");
      return false;
    }
  }, [draft, original, isDirty, validate, onSave]);

  const contextValue: FormContextValue<T> = {
    mode,
    original,
    draft,
    isDirty,
    errors,
    hasErrors,
    saveStatus,
    saveError,
    updateDraft,
    setFieldError,
    enterEdit,
    cancelEdit,
    save,
  };

  return (
    <FormContext.Provider value={contextValue as FormContextValue<unknown>}>
      {children}
    </FormContext.Provider>
  );
}
