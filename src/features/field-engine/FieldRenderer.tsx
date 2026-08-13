"use client";

/**
 * Universal Field Renderer (BP-037).
 *
 * `<FieldRenderer field="passportExpirationDate" />` resolves display,
 * editor widget, validation, and save behavior from the Person field
 * catalog + PersonFieldSession. Workspaces must not branch on field type.
 */

import { InlineEditCell } from "@/components/inline-edit";
import { getPersonField } from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";

import { formatFieldDisplay, toEditString } from "./formatDisplay";
import { usePersonFieldSession } from "./PersonFieldSession";
import { isFieldEditable, toInlineFieldType, toInlineOptions } from "./toInlineEdit";

export default function FieldRenderer({
  field,
  align = "right",
}: {
  /** Catalog key on the canonical Person record. */
  field: keyof Person;
  align?: "left" | "right";
}) {
  const session = usePersonFieldSession();
  const def = getPersonField(field);

  if (!def) {
    throw new Error(`FieldRenderer: "${String(field)}" is not registered in the Person field catalog.`);
  }

  const editable = isFieldEditable(def);
  const value = session.person[field];

  return (
    <InlineEditCell
      label={def.label}
      type={toInlineFieldType(def)}
      options={toInlineOptions(def)}
      value={toEditString(value)}
      displayValue={formatFieldDisplay(def, value)}
      align={align}
      editing={session.isEditing(field)}
      disabled={!editable}
      error={session.errorFor(field)}
      onRequestEdit={() => session.startEdit(field)}
      onCancel={session.cancelEdit}
      onCommit={(raw, reason) => session.commit(field, raw, reason)}
    />
  );
}
