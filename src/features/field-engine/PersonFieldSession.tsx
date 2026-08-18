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
import { useRoles, useStatuses } from "@/features/lookups/useLookups";
import { updatePersonAction } from "@/features/people/actions";
import { getPersonField } from "@/features/people/fieldCatalog";
import { toPersonWritePatch } from "@/features/people/personWritePatch";
import type { Person, PersonWritePatch } from "@/features/people/types";

import { parseFieldValue } from "./parseValue";
import {
  isPersonLookupField,
  personLookupJoinPatch,
} from "./personLookupInlineEdit";

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
  commitPatch: (patch: PersonWritePatch, reason: InlineCommitReason) => Promise<void>;
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
  const roles = useRoles();
  const statuses = useStatuses();

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

      // Normalize clears through the shared write-patch helper (BP-037A).
      const persistPatch = toPersonWritePatch({
        [field]: parsed.value,
      } as PersonWritePatch);
      const unchanged = valuesEqual(person[field], parsed.value);

      if (unchanged) {
        if (reason === "tab") moveEditing(field, "next");
        else if (reason === "shift-tab") moveEditing(field, "prev");
        else setEditing(null);
        return;
      }

      const previous = person;
      const localNext: Person =
        isPersonLookupField(field) && typeof parsed.value === "string"
          ? {
              ...person,
              ...personLookupJoinPatch(field, parsed.value, roles, statuses),
            }
          : {
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
    [moveEditing, onPersonChange, person, roles, runSave, statuses],
  );

  const commitPatch = useCallback(
    async (patch: PersonWritePatch, reason: InlineCommitReason) => {
      const persistPatch = toPersonWritePatch(patch);
      const localNext: Person = { ...person };
      for (const key of Object.keys(patch) as (keyof Person)[]) {
        const value = patch[key];
        (localNext[key] as Person[typeof key]) =
          value === null || value === undefined
            ? (undefined as Person[typeof key])
            : (value as Person[typeof key]);
      }

      const unchanged = Object.keys(persistPatch).every((key) =>
        valuesEqual(person[key as keyof Person], localNext[key as keyof Person]),
      );
      if (unchanged) {
        if (reason !== "tab" && reason !== "shift-tab") setEditing(null);
        return;
      }

      const previous = person;
      onPersonChange(localNext);
      if (reason !== "tab" && reason !== "shift-tab") setEditing(null);

      const ok = await runSave(async () => {
        const result = await updatePersonAction(person.id, persistPatch);
        if (!result.success) {
          throw new Error(result.error);
        }
        onPersonChange(result.person);
      });
      if (!ok) onPersonChange(previous);
    },
    [onPersonChange, person, runSave],
  );

  const value = useMemo<PersonFieldSessionValue>(
    () => ({
      person,
      isEditing: (field) => editing === field,
      errorFor: (field) => (editing === field ? fieldError : undefined),
      startEdit,
      cancelEdit,
      commit,
      commitPatch,
    }),
    [cancelEdit, commit, commitPatch, editing, fieldError, person, startEdit],
  );

  return (
    <PersonFieldSessionContext.Provider value={value}>
      {children}
    </PersonFieldSessionContext.Provider>
  );
}
