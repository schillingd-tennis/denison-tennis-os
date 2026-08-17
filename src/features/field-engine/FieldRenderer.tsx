"use client";

/**
 * Universal Field Renderer (BP-037).
 *
 * `<FieldRenderer field="passportExpirationDate" />` resolves display,
 * editor widget, validation, and save behavior from the Person field
 * catalog + PersonFieldSession. Workspaces must not branch on field type.
 */

import {
  InlineEditCell,
  type InlineDensity,
  type InlineEmphasis,
} from "@/components/inline-edit";
import { getPersonField } from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";

import { formatFieldDisplay, toEditString } from "./formatDisplay";
import { usePersonFieldSession } from "./PersonFieldSession";
import { isFieldEditable, toInlineFieldType, toInlineOptions } from "./toInlineEdit";

export default function FieldRenderer({
  field,
  align = "right",
  editOn,
  emphasis,
  density,
}: {
  /** Catalog key on the canonical Person record. */
  field: keyof Person;
  align?: "left" | "right";
  /** Recruiting directory/workspace uses click; Person/Travel keep the default. */
  editOn?: "click" | "double-click";
  emphasis?: InlineEmphasis;
  density?: InlineDensity;
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
      editOn={editOn}
      emphasis={emphasis}
      density={density}
      editing={session.isEditing(field)}
      disabled={!editable}
      error={session.errorFor(field)}
      onRequestEdit={() => session.startEdit(field)}
      onCancel={session.cancelEdit}
      onCommit={(raw, reason) => session.commit(field, raw, reason)}
    />
  );
}
