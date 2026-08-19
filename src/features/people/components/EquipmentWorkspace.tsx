"use client";

import type { ReactNode } from "react";

import {
  WorkspaceAccentHeading,
  WorkspaceField,
} from "@/components/adaptive-workspace";
import {
  FieldRenderer,
  PersonFieldSession,
} from "@/features/field-engine";
import {
  getPersonField,
  getPersonFieldKeysForWorkspace,
} from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";

/**
 * Player Equipment adaptive workspace — apparel sizes and tennis gear.
 * Field membership from the Person catalog; layout stays here.
 */

const EQUIPMENT_FIELDS = getPersonFieldKeysForWorkspace("equipment");

const APPAREL_ROW_1 = [
  "tShirtSize",
  "driFitSize",
  "collaredShirtSize",
  "longSleeveSize",
] as const satisfies readonly (keyof Person)[];

const APPAREL_ROW_2 = [
  "jacketSize",
  "hoodieSize",
  "shortsSize",
  "pantsSize",
] as const satisfies readonly (keyof Person)[];

function EquipmentFieldGrid({
  columns,
  className,
  children,
}: {
  columns: 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <dl
      className={`grid gap-x-6 gap-y-[7px] ${className ?? ""}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {children}
    </dl>
  );
}

function EquipmentField({
  field,
  step,
}: {
  field: keyof Person;
  step?: number;
}) {
  const def = getPersonField(field);
  if (!def) return null;
  return (
    <WorkspaceField label={def.label}>
      <FieldRenderer
        field={field}
        align="left"
        editOn="click"
        emphasis="workspace"
        density="compact"
        step={step}
      />
    </WorkspaceField>
  );
}

export default function EquipmentWorkspace({
  person,
  onPersonChange,
  runSave,
}: {
  person: Person;
  onPersonChange: (person: Person) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  return (
    <PersonFieldSession
      person={person}
      onPersonChange={onPersonChange}
      runSave={runSave}
      fields={EQUIPMENT_FIELDS}
    >
      <div className="min-w-0 space-y-[14px]">
        <section aria-label="Apparel" className="min-w-0">
          <WorkspaceAccentHeading>Apparel</WorkspaceAccentHeading>
          <div className="flex flex-col gap-y-[7px]">
            <EquipmentFieldGrid columns={4} className="mt-[5px]">
              {APPAREL_ROW_1.map((field) => (
                <EquipmentField key={field} field={field} />
              ))}
            </EquipmentFieldGrid>
            <EquipmentFieldGrid columns={4}>
              {APPAREL_ROW_2.map((field) => (
                <EquipmentField key={field} field={field} />
              ))}
            </EquipmentFieldGrid>
            <EquipmentFieldGrid columns={4}>
              <EquipmentField field="shoeSize" step={0.5} />
            </EquipmentFieldGrid>
          </div>
        </section>

        <div className="border-t border-border/50 pt-[14px]">
          <section aria-label="Tennis Equipment">
            <WorkspaceAccentHeading>Tennis Equipment</WorkspaceAccentHeading>
            <EquipmentFieldGrid columns={3} className="mt-[5px]">
              <EquipmentField field="racket" />
              <EquipmentField field="gripSize" />
              <EquipmentField field="string" />
            </EquipmentFieldGrid>
          </section>
        </div>
      </div>
    </PersonFieldSession>
  );
}
