"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { useBeforeUnloadWarning } from "./DirtyTracker";
import type { FieldErrors, FormMode } from "./types";

type FormContextValue<T> = {
  mode: FormMode;
  /** The last saved value — what Cancel restores and Save compares against. */
  original: T;
  /** The value currently being displayed/edited. Equal to `original` in view mode. */
  draft: T;
  isDirty: boolean;
  errors: FieldErrors;
  hasErrors: boolean;
  /** Merge a partial patch into the draft (does not require edit mode). */
  updateDraft: (patch: Partial<T>) => void;
  /** Set or clear a single field's live validation message. */
  setFieldError: (field: string, message: string | undefined) => void;
  enterEdit: () => void;
  cancelEdit: () => void;
  /** Runs full validation; commits and returns to view mode only if valid. Returns whether it saved. */
  save: () => boolean;
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
  /** Called with the new value once a save succeeds (e.g. to persist later). */
  onSave?: (next: T) => void;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<FormMode>("view");
  const [original, setOriginal] = useState<T>(value);
  const [draft, setDraft] = useState<T>(value);
  const [errors, setErrors] = useState<FieldErrors>({});

  const isDirty = useMemo(() => JSON.stringify(original) !== JSON.stringify(draft), [original, draft]);
  const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors]);

  useBeforeUnloadWarning(isDirty);

  const updateDraft = useCallback((patch: Partial<T>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
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
    setMode("edit");
  }, [original]);

  const cancelEdit = useCallback(() => {
    setDraft(original);
    setErrors({});
    setMode("view");
  }, [original]);

  const save = useCallback((): boolean => {
    const validationErrors = validate ? validate(draft) : {};
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return false;

    setOriginal(draft);
    onSave?.(draft);
    setMode("view");
    return true;
  }, [draft, validate, onSave]);

  const contextValue: FormContextValue<T> = {
    mode,
    original,
    draft,
    isDirty,
    errors,
    hasErrors,
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
