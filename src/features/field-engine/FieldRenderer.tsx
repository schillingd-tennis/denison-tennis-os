"use client";

/**
 * Universal Field Renderer (BP-037).
 *
 * `<FieldRenderer field="passportExpirationDate" />` resolves display,
 * editor widget, validation, and save behavior from the Person field
 * catalog + PersonFieldSession. Workspaces must not branch on field type.
 */

import type { ReactNode } from "react";

import {
  InlineEditCell,
  type InlineDensity,
  type InlineEmphasis,
} from "@/components/inline-edit";
import { typeRole } from "@/components/typography";
import { useRoles, useStatuses } from "@/features/lookups/useLookups";
import { getPersonField } from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";
import { EMPTY_VALUE } from "@/lib/formatting";

import { formatFieldDisplay, toEditString } from "./formatDisplay";
import {
  isPersonLookupField,
  personLookupDisplayLabel,
  personLookupOptions,
} from "./personLookupInlineEdit";
import { usePersonFieldSession } from "./PersonFieldSession";
import { isFieldEditable, toInlineFieldType, toInlineOptions } from "./toInlineEdit";

export default function FieldRenderer({
  field,
  align = "right",
  editOn,
  emphasis,
  density,
  rows,
  renderDisplay,
  className,
}: {
  /** Catalog key on the canonical Person record. */
  field: keyof Person;
  align?: "left" | "right";
  /** Recruit + Player/Coach workspaces use click; Team List keeps double-click. */
  editOn?: "click" | "double-click";
  emphasis?: InlineEmphasis;
  density?: InlineDensity;
  rows?: number;
  /** Optional custom display (e.g. status badge). Overrides default text display. */
  renderDisplay?: ReactNode;
  className?: string;
}) {
  const session = usePersonFieldSession();
  const roles = useRoles();
  const statuses = useStatuses();
  const def = getPersonField(field);

  if (!def) {
    throw new Error(`FieldRenderer: "${String(field)}" is not registered in the Person field catalog.`);
  }

  const editable = isFieldEditable(def);
  const value = session.person[field];
  const resolvedEditOn = editOn ?? (emphasis === "workspace" ? "click" : undefined);
  const resolvedRows =
    rows ?? (def.type === "longText" && emphasis === "workspace" ? 5 : undefined);

  const lookupField = isPersonLookupField(field);
  const options = lookupField
    ? personLookupOptions(field, roles, statuses)
    : toInlineOptions(def);

  const displayValue = lookupField
    ? personLookupDisplayLabel(session.person, field, roles, statuses)
    : formatFieldDisplay(def, value);

  const longTextDisplay =
    def.type === "longText" && !renderDisplay ? (
      <span
        className={`text-[15px] leading-relaxed whitespace-pre-wrap ${
          !toEditString(value).trim()
            ? typeRole.metadataEmpty
            : "font-normal text-text-primary"
        }`}
      >
        {!toEditString(value).trim()
          ? def.placeholder ?? EMPTY_VALUE
          : toEditString(value)}
      </span>
    ) : undefined;

  return (
    <InlineEditCell
      label={def.label}
      type={toInlineFieldType(def)}
      options={options}
      value={toEditString(value)}
      displayValue={displayValue}
      renderDisplay={renderDisplay ?? longTextDisplay}
      align={align}
      editOn={resolvedEditOn}
      emphasis={emphasis}
      density={density}
      rows={resolvedRows}
      className={className}
      editing={session.isEditing(field)}
      disabled={!editable}
      error={session.errorFor(field)}
      onRequestEdit={() => session.startEdit(field)}
      onCancel={session.cancelEdit}
      onCommit={(raw, reason) => session.commit(field, raw, reason)}
    />
  );
}
