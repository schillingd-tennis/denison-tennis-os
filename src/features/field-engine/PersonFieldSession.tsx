"use client";

/**
 * Person-scoped Field Engine session (BP-037).
 *
 * Owns single-field edit focus, tab order, optimistic patch + rollback, and
 * persistence through `updatePersonAction` (canonical Person repository).
 * Workspaces supply field order and layout only.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { InlineCommitReason } from "@/components/inline-edit";
import { updatePersonAction } from "@/features/people/actions";
import { getPersonField } from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";

import { parseFieldValue } from "./parseValue";

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (isEmptyValue(a) && isEmptyValue(b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

type PersonFieldKey = keyof Person;

type PersonFieldSessionValue = {
  person: Person;
  isEditing: (field: PersonFieldKey) => boolean;
  errorFor: (field: PersonFieldKey) => string | undefined;
  startEdit: (field: PersonFieldKey) => void;
  cancelEdit: () => void;
  commit: (
    field: PersonFieldKey,
    raw: string,
    reason: InlineCommitReason,
  ) => Promise<void>;
};

const PersonFieldSessionContext = createContext<PersonFieldSessionValue | null>(null);

export function usePersonFieldSession(): PersonFieldSessionValue {
  const ctx = useContext(PersonFieldSessionContext);
  if (!ctx) {
    throw new Error("usePersonFieldSession must be used within PersonFieldSession.");
  }
  return ctx;
}

export function PersonFieldSession({
  person,
  onPersonChange,
  runSave,
  fields,
  children,
}: {
  person: Person;
  onPersonChange: (person: Person) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
  /** Tab order for contiguous FieldRenderer cells in this workspace. */
  fields: readonly PersonFieldKey[];
  children: ReactNode;
}) {
  const [editing, setEditing] = useState<PersonFieldKey | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);

  const moveEditing = useCallback(
    (from: PersonFieldKey, direction: "next" | "prev") => {
      const index = fields.indexOf(from);
      if (index < 0) {
        setEditing(null);
        return;
      }
      const nextIndex = direction === "next" ? index + 1 : index - 1;
      if (nextIndex < 0 || nextIndex >= fields.length) {
        setEditing(null);
        return;
      }
      setFieldError(undefined);
      setEditing(fields[nextIndex]);
    },
    [fields],
  );

  const startEdit = useCallback((field: PersonFieldKey) => {
    setFieldError(undefined);
    setEditing(field);
  }, []);

  const cancelEdit = useCallback(() => {
    setFieldError(undefined);
    setEditing(null);
  }, []);

  const commit = useCallback(
    async (field: PersonFieldKey, raw: string, reason: InlineCommitReason) => {
      const def = getPersonField(field);
      if (!def) {
        setFieldError("Unknown field.");
        return;
      }

      const parsed = parseFieldValue(def, raw);
      if (!parsed.ok) {
        setFieldError(parsed.error);
        return;
      }

      setFieldError(undefined);

      // parseValue emits null for clears (wire-safe). Commit 2 may wrap this
      // with toPersonWritePatch for shared clear normalization across call sites.
      const persistPatch = { [field]: parsed.value } as Partial<Person>;
      const unchanged = valuesEqual(person[field], parsed.value);

      if (unchanged) {
        if (reason === "tab") moveEditing(field, "next");
        else if (reason === "shift-tab") moveEditing(field, "prev");
        else setEditing(null);
        return;
      }

      const previous = person;
      // Local Person model uses undefined for empty (matches rowToPerson).
      const localNext: Person = {
        ...person,
        [field]: parsed.value === null ? undefined : parsed.value,
      };
      onPersonChange(localNext);

      if (reason === "tab") moveEditing(field, "next");
      else if (reason === "shift-tab") moveEditing(field, "prev");
      else setEditing(null);

      const ok = await runSave(async () => {
        const result = await updatePersonAction(person.id, persistPatch);
        if (!result.success) {
          throw new Error(result.error);
        }
        onPersonChange(result.person);
      });

      if (!ok) {
        onPersonChange(previous);
      }
    },
    [moveEditing, onPersonChange, person, runSave],
  );

  const value = useMemo<PersonFieldSessionValue>(
    () => ({
      person,
      isEditing: (field) => editing === field,
      errorFor: (field) => (editing === field ? fieldError : undefined),
      startEdit,
      cancelEdit,
      commit,
    }),
    [cancelEdit, commit, editing, fieldError, person, startEdit],
  );

  return (
    <PersonFieldSessionContext.Provider value={value}>
      {children}
    </PersonFieldSessionContext.Provider>
  );
}
